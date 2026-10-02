using Microsoft.Extensions.Options;

namespace ArtifyMe.Generations;

public class GenerationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly GenerationSettings _settings;
    private readonly ILogger<GenerationWorker> _logger;

    public GenerationWorker(IServiceScopeFactory scopes, IOptions<GenerationSettings> settings, ILogger<GenerationWorker> logger)
    {
        _scopes = scopes;
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_settings.PollInterval);
        do
        {
            await RunOnceAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    // A scope per generation, so one failure doesn't hold up the rest
    public async Task RunOnceAsync(CancellationToken cancellationToken = default)
    {
        List<Guid> ids;
        try
        {
            using var scope = _scopes.CreateScope();
            ids = await scope.ServiceProvider.GetRequiredService<GenerationProcessor>().ListActiveAsync();
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            _logger.LogError(e, "Couldn't list the generations in progress; trying again at the next check");
            return;
        }

        foreach (var id in ids)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<GenerationProcessor>().ProcessAsync(id, cancellationToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                _logger.LogError(e, "Checking generation {GenerationId} failed; trying again at the next check", id);
            }
        }
    }
}
