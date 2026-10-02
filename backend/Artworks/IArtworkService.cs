namespace ArtifyMe.Artworks;

public interface IArtworkService
{
    Task<ArtworkPage> ListAsync(ArtworkQuery query, int ownerId);
    Task<ArtworkDetail?> GetAsync(string id, int ownerId);
    Task<bool> UpdateAsync(string id, ArtworkUpdateRequest request, int ownerId);
    Task<bool> DeleteAsync(string id, int ownerId);
}
