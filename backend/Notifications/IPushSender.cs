namespace ArtifyMe.Notifications;

public interface IPushSender
{
    // Returns the tokens that no longer reach a phone, such as after the app was deleted
    Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken cancellationToken = default);
}
