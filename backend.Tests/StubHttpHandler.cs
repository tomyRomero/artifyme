using System.Net;
using System.Text;

namespace ArtifyMe.Tests;

// Answers a client's HTTP requests in tests, keeping the last one to check
public sealed class StubHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    public HttpRequestMessage? LastRequest { get; private set; }
    public string? LastBody { get; private set; }

    public HttpClient CreateHttpClient(string baseAddress) => new(this) { BaseAddress = new Uri(baseAddress) };

    public static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        return respond(request);
    }
}
