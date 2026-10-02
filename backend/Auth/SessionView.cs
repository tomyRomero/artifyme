namespace ArtifyMe.Auth;

public class SessionView
{
    public Guid Id { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string? DeviceModel { get; set; }
    public string? AppVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastSeenAt { get; set; }

    public bool Current { get; set; }

    public static SessionView From(Session session, Guid? currentSessionId) => new()
    {
        Id = session.Id,
        Platform = session.Platform,
        DeviceModel = session.DeviceModel,
        AppVersion = session.AppVersion,
        CreatedAt = session.CreatedAt,
        LastSeenAt = session.LastSeenAt,
        Current = session.Id == currentSessionId,
    };
}
