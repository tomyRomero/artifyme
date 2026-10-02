using ArtifyMe.Data;
using Microsoft.EntityFrameworkCore;

namespace ArtifyMe.Auth;

public class SessionRepository : ISessionRepository
{
    private readonly ApplicationDbContext _context;

    public SessionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<Session?> FindActiveAsync(Guid id, int ownerId) =>
        _context.Sessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == ownerId && s.RevokedAt == null);

    public Task<Session?> FindActiveByInstallAsync(int ownerId, string installId) =>
        _context.Sessions.FirstOrDefaultAsync(s => s.UserId == ownerId && s.InstallId == installId && s.RevokedAt == null);

    public Task<List<Session>> ListActiveAsync(int ownerId) =>
        _context.Sessions
            .Where(s => s.UserId == ownerId && s.RevokedAt == null)
            .OrderByDescending(s => s.LastSeenAt)
            .ToListAsync();

    public Task<RefreshToken?> FindTokenAsync(string tokenHash) =>
        _context.RefreshTokens.Include(t => t.Session).FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

    public async Task CreateAsync(Session session, RefreshToken firstToken, Session? replaces, DateTime now)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Save the revocation first so the filtered unique index allows the new session
        if (replaces is not null)
        {
            await RevokeAsync(replaces, now);
            await _context.SaveChangesAsync();
        }

        _context.Sessions.Add(session);
        _context.RefreshTokens.Add(firstToken);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task RevokeAsync(Session session, DateTime now)
    {
        session.RevokedAt ??= now;
        session.PushToken = null;
        var liveTokens = await _context.RefreshTokens
            .Where(t => t.SessionId == session.Id && t.RevokedAt == null)
            .ToListAsync();
        foreach (var token in liveTokens)
            token.RevokedAt = now;
    }

    public async Task SetPushTokenAsync(Session session, string? pushToken)
    {
        if (pushToken is not null)
        {
            await _context.Sessions
                .Where(s => s.PushToken == pushToken && s.Id != session.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.PushToken, (string?)null));
        }
        session.PushToken = pushToken;
        await _context.SaveChangesAsync();
    }

    public Task<List<string>> ListPushTokensAsync(int ownerId) =>
        _context.Sessions
            .Where(s => s.UserId == ownerId && s.RevokedAt == null && s.PushToken != null)
            .Select(s => s.PushToken!)
            .ToListAsync();

    public Task ForgetPushTokensAsync(IReadOnlyCollection<string> pushTokens) =>
        _context.Sessions
            .Where(s => s.PushToken != null && pushTokens.Contains(s.PushToken))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.PushToken, (string?)null));

    public async Task<bool> TrySaveAsync()
    {
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            _context.ChangeTracker.Clear();
            return false;
        }
    }
}
