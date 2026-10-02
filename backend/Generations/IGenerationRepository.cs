using ArtifyMe.Artworks;

namespace ArtifyMe.Generations;

public interface IGenerationRepository
{
    Task<Generation?> FindByIdAsync(Guid id, int ownerId);

    Task<Generation?> FindByIdAsync(Guid id);

    Task<Generation?> FindActiveAsync(int ownerId);
    Task<List<Guid>> ListActiveIdsAsync();

    // False when the owner already has a generation in progress
    Task<bool> TryInsertAsync(Generation generation);

    Task DeleteAsync(Generation generation);

    // False on a concurrency conflict or when the generation is gone; nothing is saved
    Task<bool> TrySaveAsync(Generation generation, Artwork? createdArtwork = null);
}
