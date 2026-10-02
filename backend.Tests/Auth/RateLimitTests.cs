using System.Net;

namespace ArtifyMe.Tests.Auth;

public class RateLimitTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public RateLimitTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Too_many_login_attempts_get_429_with_a_retry_after_header()
    {
        using var limitedApi = _factory.WithWebHostBuilder(builder => builder.UseSetting("RateLimiting:AuthPermitLimit", "3"));
        var client = limitedApi.CreateClient();

        for (var attempt = 1; attempt <= 3; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SignInAsync("guesser@example.com", $"guess number {attempt}")).StatusCode);
        }
        var blocked = await client.SignInAsync("guesser@example.com", "guess number 4");

        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.True(blocked.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }
}
