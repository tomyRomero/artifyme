using System.Net.Http.Headers;

namespace ArtifyMe.Notifications;

public static class PushServiceCollectionExtensions
{
    public static IServiceCollection AddPushNotifications(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = configuration.GetSection("Push").Get<PushSettings>() ?? new PushSettings();

        services.AddHttpClient<IPushSender, ExpoPushSender>(client =>
        {
            client.BaseAddress = new Uri("https://exp.host/");
            if (!string.IsNullOrEmpty(settings.AccessToken))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", settings.AccessToken);
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddScoped<GenerationNotifier>();
        return services;
    }
}
