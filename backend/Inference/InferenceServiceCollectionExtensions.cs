namespace ArtifyMe.Inference;

public static class InferenceServiceCollectionExtensions
{
    public static IServiceCollection AddInferenceClient(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = configuration.GetSection("Inference").Get<InferenceSettings>() ?? new InferenceSettings();
        if (!Uri.TryCreate(settings.BaseUrl?.TrimEnd('/') + "/", UriKind.Absolute, out var baseUrl))
        {
            throw new InvalidOperationException(
                "Inference:BaseUrl must be set to the inference service's address, for example http://localhost:8000.");
        }

        services.AddHttpClient<IInferenceClient, HttpInferenceClient>(client =>
        {
            client.BaseAddress = baseUrl;
            if (!string.IsNullOrEmpty(settings.ApiKey))
                client.DefaultRequestHeaders.Add("X-API-Key", settings.ApiKey);
            // Submitting and polling are quick; the image is made in the background
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        return services;
    }
}
