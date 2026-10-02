using System.Collections.Concurrent;
using ArtifyMe.Notifications;

namespace ArtifyMe.Tests;

public class FakePushSender : IPushSender
{
    public ConcurrentQueue<PushMessage> Sent { get; } = new();

    // Tokens to report as no longer reaching a phone
    public ConcurrentDictionary<string, bool> Unregistered { get; } = new();

    // Every send fails as if Expo couldn't be reached
    public bool Unreachable { get; set; }

    public Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken cancellationToken = default)
    {
        if (Unreachable)
            throw new HttpRequestException("Expo's push service couldn't be reached.");

        foreach (var message in messages)
            Sent.Enqueue(message);
        return Task.FromResult<IReadOnlyList<string>>(messages.Select(m => m.To).Where(Unregistered.ContainsKey).ToList());
    }

    public List<PushMessage> SentTo(string token) => Sent.Where(m => m.To == token).ToList();
}
