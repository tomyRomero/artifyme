using ArtifyMe.Users;
using Microsoft.Extensions.Options;

namespace ArtifyMe.Auth;

// Refresh tokens are single-use. If an exchanged token comes back, someone has a copy,
// so the session is ended.
public class SessionService : ISessionService
{
    private const int MaxRevokeAttempts = 3;

    private readonly IAuthService _auth;
    private readonly ISessionRepository _sessions;
    private readonly IUserRepository _users;
    private readonly ITokenService _tokens;
    private readonly JwtSettings _settings;
    private readonly TimeProvider _time;
    private readonly ILogger<SessionService> _logger;

    public SessionService(IAuthService auth, ISessionRepository sessions, IUserRepository users, ITokenService tokens,
        IOptions<JwtSettings> settings, TimeProvider time, ILogger<SessionService> logger)
    {
        _auth = auth;
        _sessions = sessions;
        _users = users;
        _tokens = tokens;
        _settings = settings.Value;
        _time = time;
        _logger = logger;
    }

    public async Task<SessionTokens?> SignInAsync(SignInRequest request)
    {
        var user = await _auth.ValidateCredentialsAsync(request.Email, request.Password);
        if (user is null)
            return null;

        var now = Now();
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = user.UserId,
            InstallId = request.InstallId,
            Platform = request.Platform,
            DeviceModel = request.DeviceModel?.Trim(),
            AppVersion = request.AppVersion?.Trim(),
            CreatedAt = now,
            LastSeenAt = now,
        };
        var (refreshToken, firstToken) = NewRefreshToken(session.Id, now);

        // Signing in again on the same install replaces its session
        var previous = await _sessions.FindActiveByInstallAsync(user.UserId, request.InstallId);
        await _sessions.CreateAsync(session, firstToken, previous, now);

        return Tokens(user, session, refreshToken, firstToken, now);
    }

    public async Task<SessionTokens?> RefreshAsync(RefreshRequest request)
    {
        var now = Now();
        var token = await _sessions.FindTokenAsync(_tokens.HashRefreshToken(request.RefreshToken));
        if (token is null || !token.Session.IsActive || token.ExpiresAt <= now)
            return null;

        if (token.RevokedAt is not null)
        {
            if (token.ReplacedById is not null)
                await EndCopiedSessionAsync(token.Session, now);
            return null;
        }

        var user = await _users.GetUserByIdAsync(token.Session.UserId);
        if (user is null)
            return null;

        var (refreshToken, successor) = NewRefreshToken(token.SessionId, now);
        token.RevokedAt = now;
        token.ReplacedBy = successor;
        token.Session.LastSeenAt = now;
        if (!string.IsNullOrWhiteSpace(request.AppVersion))
            token.Session.AppVersion = request.AppVersion.Trim();

        if (!await _sessions.TrySaveAsync())
        {
            // Lost a race with another refresh using the same token
            var session = await _sessions.FindActiveAsync(token.SessionId, user.UserId);
            if (session is not null)
                await EndCopiedSessionAsync(session, now);
            return null;
        }

        return Tokens(user, token.Session, refreshToken, successor, now);
    }

    public async Task SignOutAsync(string refreshToken)
    {
        var token = await _sessions.FindTokenAsync(_tokens.HashRefreshToken(refreshToken));
        if (token is not null && token.Session.IsActive)
            await RevokeAsync(token.SessionId, token.Session.UserId);
    }

    public async Task<List<SessionView>> ListAsync(int ownerId, Guid? currentSessionId) =>
        (await _sessions.ListActiveAsync(ownerId)).Select(s => SessionView.From(s, currentSessionId)).ToList();

    public async Task<bool> RevokeAsync(Guid sessionId, int ownerId) =>
        await RevokeWithRetriesAsync(async () =>
            await _sessions.FindActiveAsync(sessionId, ownerId) is { } session ? [session] : []) > 0;

    public Task RevokeOthersAsync(int ownerId, Guid? keepSessionId) =>
        RevokeWithRetriesAsync(async () =>
            (await _sessions.ListActiveAsync(ownerId)).Where(s => s.Id != keepSessionId).ToList());

    public async Task<bool> SetPushTokenAsync(Guid? sessionId, int ownerId, string? pushToken)
    {
        if (sessionId is not { } id || await _sessions.FindActiveAsync(id, ownerId) is not { } session)
            return false;

        await _sessions.SetPushTokenAsync(session, pushToken);
        return true;
    }

    // Retries if a concurrent refresh changes a token in between
    private async Task<int> RevokeWithRetriesAsync(Func<Task<List<Session>>> findSessions)
    {
        for (var attempt = 1; ; attempt++)
        {
            var sessions = await findSessions();
            var now = Now();
            foreach (var session in sessions)
                await _sessions.RevokeAsync(session, now);

            if (await _sessions.TrySaveAsync())
                return sessions.Count;

            if (attempt == MaxRevokeAttempts)
                throw new InvalidOperationException("Sessions kept changing while they were being revoked.");
        }
    }

    private async Task EndCopiedSessionAsync(Session session, DateTime now)
    {
        _logger.LogWarning("A refresh token for session {SessionId} was presented after it had been exchanged; ending the session",
            session.Id);
        await _sessions.RevokeAsync(session, now);
        await _sessions.TrySaveAsync();
    }

    private (string Token, RefreshToken Entity) NewRefreshToken(Guid sessionId, DateTime now)
    {
        var (token, hash) = _tokens.CreateRefreshToken();
        return (token, new RefreshToken
        {
            SessionId = sessionId,
            TokenHash = hash,
            CreatedAt = now,
            ExpiresAt = now.AddDays(_settings.RefreshTokenDays),
        });
    }

    private SessionTokens Tokens(User user, Session session, string refreshToken, RefreshToken refreshEntity, DateTime now)
    {
        var (accessToken, accessExpiresAt) = _tokens.CreateAccessToken(user, session.Id, now);
        return new SessionTokens
        {
            SessionId = session.Id,
            AccessToken = accessToken,
            AccessTokenExpiresAt = accessExpiresAt,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = refreshEntity.ExpiresAt,
        };
    }

    private DateTime Now() => _time.GetUtcNow().UtcDateTime;
}
