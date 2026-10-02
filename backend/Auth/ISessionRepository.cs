namespace ArtifyMe.Auth;

public interface ISessionRepository
{
    Task<Session?> FindActiveAsync(Guid id, int ownerId);

    Task<Session?> FindActiveByInstallAsync(int ownerId, string installId);

    Task<List<Session>> ListActiveAsync(int ownerId);

    Task<RefreshToken?> FindTokenAsync(string tokenHash);

    Task CreateAsync(Session session, RefreshToken firstToken, Session? replaces, DateTime now);

    Task RevokeAsync(Session session, DateTime now);

    // A phone has one token, so it moves to whichever session signed in there last
    Task SetPushTokenAsync(Session session, string? pushToken);

    Task<List<string>> ListPushTokensAsync(int ownerId);

    Task ForgetPushTokensAsync(IReadOnlyCollection<string> pushTokens);

    // False on a concurrency conflict; nothing is saved
    Task<bool> TrySaveAsync();
}
