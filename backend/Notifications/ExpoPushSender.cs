using System.Text.Json;

namespace ArtifyMe.Notifications;

// Expo's push service passes each message on to Apple or Google
public class ExpoPushSender : IPushSender
{
    // The app creates this channel on Android; a message for a missing channel isn't shown
    public const string AndroidChannel = "artworks";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;

    public ExpoPushSender(HttpClient http) => _http = http;

    public async Task<IReadOnlyList<string>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken cancellationToken = default)
    {
        if (messages.Count == 0)
            return [];

        var body = messages.Select(m => new ExpoMessage(m.To, m.Title, m.Body, new Dictionary<string, string> { ["url"] = m.Url }));
        using var response = await _http.PostAsJsonAsync("--/api/v2/push/send", body, Json, cancellationToken);
        response.EnsureSuccessStatusCode();

        // One ticket per message, in the same order
        var tickets = (await response.Content.ReadFromJsonAsync<SendResponse>(Json, cancellationToken))?.Data ?? [];
        return tickets
            .Zip(messages)
            .Where(pair => pair.First.Details?.Error == "DeviceNotRegistered")
            .Select(pair => pair.Second.To)
            .ToList();
    }

    private record ExpoMessage(string To, string Title, string Body, Dictionary<string, string> Data)
    {
        public string Sound => "default";
        public string ChannelId => AndroidChannel;
    }

    private record SendResponse(List<Ticket>? Data);

    private record Ticket(string Status, string? Message, TicketDetails? Details);

    private record TicketDetails(string? Error);
}
