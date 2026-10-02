using System.Net;
using System.Text.Json;
using ArtifyMe.Notifications;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using static ArtifyMe.Tests.StubHttpHandler;

namespace ArtifyMe.Tests.Notifications;

public class ExpoPushSenderTests
{
    private const string Delivered = """{"data": [{"status": "ok", "id": "ticket-1"}, {"status": "ok", "id": "ticket-2"}]}""";

    private static readonly PushMessage[] Messages =
    [
        new("ExponentPushToken[phone-1]", "Your artwork is ready", "Couch is in your gallery.", "/artwork/a1"),
        new("ExponentPushToken[phone-2]", "Your artwork is ready", "Couch is in your gallery.", "/artwork/a1"),
    ];

    [Fact]
    public async Task Each_message_goes_to_Expo_with_the_screen_a_tap_opens()
    {
        var expo = new StubHttpHandler(_ => Json(HttpStatusCode.OK, Delivered));

        var gone = await Sender(expo).SendAsync(Messages);

        Assert.Empty(gone);
        Assert.Equal(HttpMethod.Post, expo.LastRequest!.Method);
        Assert.Equal("/--/api/v2/push/send", expo.LastRequest.RequestUri!.AbsolutePath);
        var sent = JsonDocument.Parse(expo.LastBody!).RootElement;
        Assert.Equal(2, sent.GetArrayLength());
        var first = sent[0];
        Assert.Equal("ExponentPushToken[phone-1]", first.GetProperty("to").GetString());
        Assert.Equal("Your artwork is ready", first.GetProperty("title").GetString());
        Assert.Equal("Couch is in your gallery.", first.GetProperty("body").GetString());
        Assert.Equal("/artwork/a1", first.GetProperty("data").GetProperty("url").GetString());
        Assert.Equal("default", first.GetProperty("sound").GetString());
        Assert.Equal(ExpoPushSender.AndroidChannel, first.GetProperty("channelId").GetString());
    }

    [Fact]
    public async Task Tokens_Expo_no_longer_recognizes_are_reported()
    {
        var expo = new StubHttpHandler(_ => Json(HttpStatusCode.OK, """
            {"data": [
              {"status": "ok", "id": "ticket-1"},
              {"status": "error", "message": "Not a registered push token", "details": {"error": "DeviceNotRegistered"}}
            ]}
            """));

        var gone = await Sender(expo).SendAsync(Messages);

        Assert.Equal(["ExponentPushToken[phone-2]"], gone);
    }

    [Fact]
    public async Task A_refused_request_throws()
    {
        var expo = new StubHttpHandler(_ => Json(HttpStatusCode.InternalServerError, """{"errors": [{"code": "INTERNAL_SERVER_ERROR"}]}"""));

        await Assert.ThrowsAsync<HttpRequestException>(() => Sender(expo).SendAsync(Messages));
    }

    [Fact]
    public async Task Nothing_is_sent_without_messages()
    {
        var expo = new StubHttpHandler(_ => Json(HttpStatusCode.OK, Delivered));

        Assert.Empty(await Sender(expo).SendAsync([]));
        Assert.Null(expo.LastRequest);
    }

    [Fact]
    public async Task The_registered_sender_calls_Expo_with_the_configured_access_token()
    {
        var expo = new StubHttpHandler(_ => Json(HttpStatusCode.OK, Delivered));
        using var factory = new ApiFactory();
        using var api = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Push:AccessToken", "test-expo-access-token");
            builder.ConfigureTestServices(services =>
                services.AddHttpClient<IPushSender, ExpoPushSender>().ConfigurePrimaryHttpMessageHandler(() => expo));
        });

        await api.Services.GetRequiredService<IPushSender>().SendAsync(Messages);

        Assert.Equal("https://exp.host/--/api/v2/push/send", expo.LastRequest!.RequestUri!.ToString());
        Assert.Equal("Bearer test-expo-access-token", expo.LastRequest.Headers.Authorization!.ToString());
    }

    private static ExpoPushSender Sender(StubHttpHandler expo) => new(expo.CreateHttpClient("https://exp.host/"));
}
