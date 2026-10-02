using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ArtifyMe.Data;
using ArtifyMe.Inference;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Notifications;

public class PushNotificationTests : IClassFixture<ApiFactory>
{
    private const string PushToken = "/api/v1/auth/sessions/current/push-token";

    private readonly ApiFactory _factory;

    public PushNotificationTests(ApiFactory factory) => _factory = factory;

    private FakePushSender Push => _factory.Push;

    [Fact]
    public async Task Only_an_Expo_push_token_from_a_signed_in_phone_is_kept()
    {
        var client = await _factory.CreateSignedInClientAsync("push.invalid@example.com");

        var invalid = await client.PutAsJsonAsync(PushToken, new { token = "https://example.com/not-a-token" });
        var anonymous = await _factory.CreateClient().PutAsJsonAsync(PushToken, new { token = "ExponentPushToken[anon-1]" });

        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal([null], await TokensOfAsync("push.invalid@example.com"));
    }

    [Fact]
    public async Task A_token_moves_to_whoever_signed_in_on_that_phone_last()
    {
        var first = await _factory.CreateSignedInClientAsync("push.first@example.com");
        await KeepTokenAsync(first, "ExponentPushToken[shared-phone]");
        var second = await _factory.CreateSignedInClientAsync("push.second@example.com");

        await KeepTokenAsync(second, "ExponentPushToken[shared-phone]");

        Assert.Equal([null], await TokensOfAsync("push.first@example.com"));
        Assert.Equal(["ExponentPushToken[shared-phone]"], await TokensOfAsync("push.second@example.com"));
    }

    [Fact]
    public async Task Turning_notifications_off_forgets_the_token()
    {
        var client = await _factory.CreateSignedInClientAsync("push.off@example.com");
        await KeepTokenAsync(client, "ExponentPushToken[off-1]");

        var response = await client.DeleteAsync(PushToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal([null], await TokensOfAsync("push.off@example.com"));
    }

    [Fact]
    public async Task Signing_out_forgets_the_token()
    {
        (await _factory.CreateClient().RegisterAsync("push.signout@example.com")).EnsureSuccessStatusCode();
        var (client, refreshToken) = await SignInAsync("push.signout@example.com", "install-for-tests-0001");
        await KeepTokenAsync(client, "ExponentPushToken[signout-1]");

        (await client.SignOutAsync(refreshToken)).EnsureSuccessStatusCode();

        Assert.Equal([null], await TokensOfAsync("push.signout@example.com"));
    }

    [Fact]
    public async Task A_finished_artwork_is_announced_on_each_of_its_owners_phones()
    {
        var owner = await _factory.CreateSignedInClientAsync("push.ready@example.com");
        await KeepTokenAsync(owner, "ExponentPushToken[ready-phone-1]");
        var (secondPhone, _) = await SignInAsync("push.ready@example.com", "install-for-tests-0002");
        await KeepTokenAsync(secondPhone, "ExponentPushToken[ready-phone-2]");
        var someoneElse = await _factory.CreateSignedInClientAsync("push.ready.other@example.com");
        await KeepTokenAsync(someoneElse, "ExponentPushToken[ready-other]");

        var artworkId = await _factory.CreateArtworkAsync(owner, title: "Couch");

        foreach (var token in new[] { "ExponentPushToken[ready-phone-1]", "ExponentPushToken[ready-phone-2]" })
        {
            var message = Assert.Single(Push.SentTo(token));
            Assert.Equal("Your artwork is ready", message.Title);
            Assert.Equal("Couch is in your gallery.", message.Body);
            Assert.Equal($"/artwork/{artworkId}", message.Url);
        }
        Assert.Empty(Push.SentTo("ExponentPushToken[ready-other]"));
    }

    [Fact]
    public async Task A_failed_generation_says_why_and_leads_back_to_the_studio()
    {
        var client = await _factory.CreateSignedInClientAsync("push.failed@example.com");
        await KeepTokenAsync(client, "ExponentPushToken[failed-1]");
        await client.StartGenerationAsync();

        _factory.Inference.Fail(_factory.Inference.LastJobId!, InferenceJobError.Filtered);
        await _factory.ProcessGenerationsAsync();

        var message = Assert.Single(Push.SentTo("ExponentPushToken[failed-1]"));
        Assert.Equal("Your artwork wasn't made", message.Title);
        Assert.Equal("The safety filter stopped this one. Try again, or change the words.", message.Body);
        Assert.Equal("/studio", message.Url);
    }

    [Fact]
    public async Task A_cancelled_generation_sends_nothing()
    {
        var client = await _factory.CreateSignedInClientAsync("push.cancel@example.com");
        await KeepTokenAsync(client, "ExponentPushToken[cancel-1]");
        await client.StartGenerationAsync();

        await _factory.Inference.CancelAsync(_factory.Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        Assert.Empty(Push.SentTo("ExponentPushToken[cancel-1]"));
    }

    [Fact]
    public async Task A_token_that_no_longer_reaches_a_phone_is_forgotten()
    {
        var client = await _factory.CreateSignedInClientAsync("push.gone@example.com");
        await KeepTokenAsync(client, "ExponentPushToken[deleted-app]");
        Push.Unregistered["ExponentPushToken[deleted-app]"] = true;

        await _factory.CreateArtworkAsync(client);

        Assert.Equal([null], await TokensOfAsync("push.gone@example.com"));
    }

    [Fact]
    public async Task An_artwork_is_saved_even_when_the_notification_cant_be_sent()
    {
        var client = await _factory.CreateSignedInClientAsync("push.down@example.com");
        await KeepTokenAsync(client, "ExponentPushToken[down-1]");
        Push.Unreachable = true;
        try
        {
            var artworkId = await _factory.CreateArtworkAsync(client, title: "Lamp");

            Assert.Equal("Lamp", (await _factory.StoredArtworkAsync(artworkId)).Title);
            Assert.Equal(["ExponentPushToken[down-1]"], await TokensOfAsync("push.down@example.com"));
        }
        finally
        {
            Push.Unreachable = false;
        }
    }

    private static async Task KeepTokenAsync(HttpClient client, string token) =>
        (await client.PutAsJsonAsync(PushToken, new { token })).EnsureSuccessStatusCode();

    private async Task<(HttpClient Client, string RefreshToken)> SignInAsync(string email, string installId)
    {
        var client = _factory.CreateClient();
        var tokens = await (await client.SignInAsync(email, installId: installId)).ReadJsonAsync();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());
        return (client, tokens.GetProperty("refreshToken").GetString()!);
    }

    // The push token of each of the account's sessions, ended ones included
    private async Task<List<string?>> TokensOfAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userId = await db.Users.Where(u => u.Email == email).Select(u => u.UserId).SingleAsync();
        return await db.Sessions.Where(s => s.UserId == userId).Select(s => s.PushToken).ToListAsync();
    }
}
