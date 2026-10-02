using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using ArtifyMe.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests;

public class UtcTimeTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public UtcTimeTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Times_the_api_reads_back_are_sent_as_utc()
    {
        var client = await _factory.CreateSignedInClientAsync("utc.times@example.com");
        var artworkId = await _factory.CreateArtworkAsync(client);
        (await client.PostAsJsonAsync("/api/v1/generations", new
        {
            sketch = ApiClientExtensions.PngDataUri,
            title = "Couch",
            description = "a comfy couch",
            paths = new[] { new { path = new[] { "M1,1 " }, color = "#000000", size = 4 } },
        })).EnsureSuccessStatusCode();

        var gallery = await (await client.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        var artwork = await (await client.GetAsync($"/api/v1/artworks/{artworkId}")).ReadJsonAsync();
        var generation = await (await client.GetAsync("/api/v1/generations/active")).ReadJsonAsync();
        var session = (await (await client.GetAsync("/api/v1/auth/sessions")).ReadJsonAsync()).EnumerateArray().Single();
        var profile = await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync();

        AssertUtcNow(gallery.GetProperty("items")[0].GetProperty("creationDateTime"));
        AssertUtcNow(artwork.GetProperty("creationDateTime"));
        AssertUtcNow(generation.GetProperty("createdAt"));
        AssertUtcNow(session.GetProperty("createdAt"));
        AssertUtcNow(session.GetProperty("lastSeenAt"));
        AssertUtcNow(profile.GetProperty("createdAt"));
    }

    [Fact]
    public async Task Optional_times_are_read_back_as_utc_too()
    {
        var client = await _factory.CreateSignedInClientAsync("utc.optional@example.com");
        var tokens = await (await client.SignInAsync("utc.optional@example.com", installId: "second-phone-0001")).ReadJsonAsync();
        (await client.SignOutAsync(tokens.GetProperty("refreshToken").GetString()!)).EnsureSuccessStatusCode();

        using var scope = _factory.Services.CreateScope();
        var signedOut = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Sessions
            .AsNoTracking()
            .SingleAsync(s => s.InstallId == "second-phone-0001");

        Assert.Equal(DateTimeKind.Utc, signedOut.RevokedAt!.Value.Kind);
    }

    // A local time mislabeled as UTC would be hours out in most time zones
    private static void AssertUtcNow(JsonElement time)
    {
        var text = time.GetString()!;
        Assert.EndsWith("Z", text);
        var parsed = DateTimeOffset.Parse(text, CultureInfo.InvariantCulture);
        Assert.InRange(parsed, DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddMinutes(1));
    }
}
