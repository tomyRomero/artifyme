using ArtifyMe.Auth;
using ArtifyMe.Generations;

namespace ArtifyMe.Notifications;

// Tells the owner's phones that a generation has ended. Cancelling is their own doing, so it isn't announced.
public class GenerationNotifier
{
    private readonly ISessionRepository _sessions;
    private readonly IPushSender _push;
    private readonly ILogger<GenerationNotifier> _logger;

    public GenerationNotifier(ISessionRepository sessions, IPushSender push, ILogger<GenerationNotifier> logger)
    {
        _sessions = sessions;
        _push = push;
        _logger = logger;
    }

    public Task ArtworkReadyAsync(Generation generation) =>
        SendAsync(generation, "Your artwork is ready", $"{generation.Title} is in your gallery.",
            $"/artwork/{generation.ArtworkId}");

    // A new drawing is still in the studio as a draft, so a tap goes back to it
    public Task ArtworkFailedAsync(Generation generation) =>
        SendAsync(generation, "Your artwork wasn't made", FailureMessage(generation.Error),
            generation.ArtworkId is null ? "/studio" : $"/artwork/{generation.ArtworkId}");

    private static string FailureMessage(GenerationError? error) => error switch
    {
        GenerationError.Filtered => "The safety filter stopped this one. Try again, or change the words.",
        GenerationError.Interrupted => "It stopped partway. Try again.",
        _ => "Something went wrong. Try again.",
    };

    // The generation has already ended, so a notification that can't be sent is only logged
    private async Task SendAsync(Generation generation, string title, string body, string url)
    {
        try
        {
            var tokens = await _sessions.ListPushTokensAsync(generation.UserId);
            if (tokens.Count == 0)
                return;

            var gone = await _push.SendAsync(tokens.Select(token => new PushMessage(token, title, body, url)).ToList());
            if (gone.Count > 0)
                await _sessions.ForgetPushTokensAsync(gone);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Couldn't send a notification about generation {GenerationId}", generation.Id);
        }
    }
}
