using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ArtifyMe.Auth;

[ApiController]
[Route("api/v1/users/me/password")]
public class PasswordController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly ISessionService _sessions;

    public PasswordController(IAuthService auth, ISessionService sessions)
    {
        _auth = auth;
        _sessions = sessions;
    }

    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPut]
    public async Task<IActionResult> Change(ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        switch (await _auth.ChangePasswordAsync(userId, request))
        {
            case PasswordChange.NoAccount:
                return Unauthorized();
            case PasswordChange.WrongPassword:
                // 400 rather than 401: the app treats a 401 as an expired session
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "The current password is incorrect.");
        }

        // Sign out every other device, but keep this one
        await _sessions.RevokeOthersAsync(userId, User.GetSessionId());
        return NoContent();
    }
}
