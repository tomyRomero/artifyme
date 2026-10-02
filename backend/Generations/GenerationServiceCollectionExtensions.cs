namespace ArtifyMe.Generations;

public static class GenerationServiceCollectionExtensions
{
    public static IServiceCollection AddGenerations(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<GenerationSettings>(configuration.GetSection("Generation"));
        services.AddScoped<IGenerationRepository, GenerationRepository>();
        services.AddScoped<IGenerationService, GenerationService>();
        services.AddScoped<GenerationProcessor>();
        services.AddSingleton<GenerationWorker>();
        if (configuration.GetValue("Generation:WorkerEnabled", true))
            services.AddHostedService(provider => provider.GetRequiredService<GenerationWorker>());
        return services;
    }
}
