namespace ArtifyMe.Auth;

public interface ISessionService
{
    Task<SessionTokens?> SignInAsync(SignInRequest request);

    Task<SessionTokens?> RefreshAsync(RefreshRequest request);

    Task SignOutAsync(string refreshToken);

    Task<List<SessionView>> ListAsync(int ownerId, Guid? currentSessionId);

    Task<bool> RevokeAsync(Guid sessionId, int ownerId);

    Task RevokeOthersAsync(int ownerId, Guid? keepSessionId);

    // False when the session has ended
    Task<bool> SetPushTokenAsync(Guid? sessionId, int ownerId, string? pushToken);
}
