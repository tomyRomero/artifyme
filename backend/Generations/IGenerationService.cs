namespace ArtifyMe.Generations;

public interface IGenerationService
{
    Task<GenerationView?> StartAsync(GenerationRequest request, int ownerId);

    Task<GenerationView?> GetAsync(Guid id, int ownerId);

    Task<GenerationView?> GetActiveAsync(int ownerId);

    Task<GenerationView?> CancelAsync(Guid id, int ownerId);
}
