using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ArtifyMe.Auth;

[ApiController]
[Route("api/v1/auth/sessions")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessions;

    public SessionsController(ISessionService sessions)
    {
        _sessions = sessions;
    }

    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        var tokens = await _sessions.SignInAsync(request);
        // Same response for an unknown email and a wrong password
        return tokens is null
            ? Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid email or password.")
            : Ok(tokens);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var tokens = await _sessions.RefreshAsync(request);
        return tokens is null
            ? Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Your session has ended. Sign in again.")
            : Ok(tokens);
    }

    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await _sessions.ListAsync(User.GetUserId(), User.GetSessionId()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id) =>
        await _sessions.RevokeAsync(id, User.GetUserId()) ? NoContent() : SessionNotFound();

    // This phone's Expo push token, for telling it when an artwork is ready
    [HttpPut("current/push-token")]
    public async Task<IActionResult> SetPushToken([FromBody] PushTokenRequest request) =>
        await _sessions.SetPushTokenAsync(User.GetSessionId(), User.GetUserId(), request.Token)
            ? NoContent()
            : SessionNotFound();

    [HttpDelete("current/push-token")]
    public async Task<IActionResult> RemovePushToken() =>
        await _sessions.SetPushTokenAsync(User.GetSessionId(), User.GetUserId(), null) ? NoContent() : SessionNotFound();

    // No access token needed, so signing out works after it has expired
    [AllowAnonymous]
    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOutSession([FromBody] RefreshRequest request)
    {
        await _sessions.SignOutAsync(request.RefreshToken);
        return NoContent();
    }

    private ObjectResult SessionNotFound() =>
        Problem(statusCode: StatusCodes.Status404NotFound, title: "Session not found.");
}
