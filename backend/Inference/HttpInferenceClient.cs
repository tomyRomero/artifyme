using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ArtifyMe.Inference;

public class HttpInferenceClient : IInferenceClient
{
    // The inference service uses snake_case JSON; base64 images map straight to byte[]
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) },
    };

    private readonly HttpClient _http;

    public HttpInferenceClient(HttpClient http) => _http = http;

    public async Task<InferenceJob> SubmitAsync(byte[] sketch, string prompt, long? seed, CancellationToken cancellationToken = default)
    {
        var body = new { Sketch = Convert.ToBase64String(sketch), Prompt = prompt, Seed = seed };
        using var response = await SendAsync(() => _http.PostAsJsonAsync("jobs", body, Json, cancellationToken), cancellationToken);

        switch (response.StatusCode)
        {
            case HttpStatusCode.Accepted:
                return await ReadJobAsync(response, cancellationToken);
            case HttpStatusCode.TooManyRequests:
                throw new InferenceBusyException(response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(30));
            case HttpStatusCode.BadRequest:
                throw new InferenceRejectedException(await ReadDetailAsync(response, cancellationToken) ?? "The sketch couldn't be read.");
            default:
                throw Unexpected(response);
        }
    }

    public async Task<InferenceJob?> GetAsync(string jobId, CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(() => _http.GetAsync(JobPath(jobId), cancellationToken), cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;
        if (!response.IsSuccessStatusCode)
            throw Unexpected(response);
        return await ReadJobAsync(response, cancellationToken);
    }

    public async Task CancelAsync(string jobId, CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(() => _http.DeleteAsync(JobPath(jobId), cancellationToken), cancellationToken);

        if (response.StatusCode != HttpStatusCode.NotFound && !response.IsSuccessStatusCode)
            throw Unexpected(response);
    }

    private static string JobPath(string jobId) => $"jobs/{Uri.EscapeDataString(jobId)}";

    private static async Task<HttpResponseMessage> SendAsync(Func<Task<HttpResponseMessage>> send, CancellationToken cancellationToken)
    {
        try
        {
            return await send();
        }
        catch (HttpRequestException e)
        {
            throw new InferenceUnavailableException("The image generation service couldn't be reached.", e);
        }
        catch (TaskCanceledException e) when (!cancellationToken.IsCancellationRequested)
        {
            throw new InferenceUnavailableException("The image generation service didn't answer in time.", e);
        }
    }

    private static async Task<InferenceJob> ReadJobAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            return await response.Content.ReadFromJsonAsync<InferenceJob>(Json, cancellationToken)
                ?? throw new InferenceUnavailableException("The image generation service sent an empty job.");
        }
        catch (JsonException e)
        {
            throw new InferenceUnavailableException("The image generation service sent a job this API can't read.", e);
        }
    }

    // FastAPI puts its error message in "detail"
    private static async Task<string?> ReadDetailAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return body.TryGetProperty("detail", out var detail) && detail.ValueKind == JsonValueKind.String ? detail.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static InferenceUnavailableException Unexpected(HttpResponseMessage response) =>
        response.StatusCode == HttpStatusCode.Unauthorized
            ? new InferenceUnavailableException("The image generation service refused the API key; check Inference:ApiKey.")
            : new InferenceUnavailableException($"The image generation service answered {(int)response.StatusCode}.");
}
