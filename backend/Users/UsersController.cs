using ArtifyMe.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ArtifyMe.Users;

[ApiController]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users)
    {
        _users = users;
    }

    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try
        {
            var profile = await _users.RegisterAsync(request);
            return CreatedAtAction(nameof(GetMe), profile);
        }
        catch (EmailAlreadyRegisteredException e)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: e.Message);
        }
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfile>> GetMe()
    {
        var profile = await _users.GetProfileAsync(User.GetUserId());
        if (profile is null)
            return Unauthorized();
        return profile;
    }

    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMe([FromBody] DeleteAccountRequest request) =>
        await _users.DeleteAccountAsync(User.GetUserId(), request.Password!) switch
        {
            AccountDeletion.Deleted => NoContent(),
            // 400, not 401: the app treats a 401 as an expired session
            AccountDeletion.WrongPassword => Problem(statusCode: StatusCodes.Status400BadRequest, title: "The password is incorrect."),
            _ => Unauthorized(),
        };
}
