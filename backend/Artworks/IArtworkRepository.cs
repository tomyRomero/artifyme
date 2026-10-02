namespace ArtifyMe.Artworks;

public interface IArtworkRepository
{
    Task<Artwork?> FindByIdAsync(string id, int ownerId);
    Task<List<ArtworkSummary>> ListAsync(int ownerId, ArtworkQuery query, int skip, int take);
    Task UpdateArtworkAsync(Artwork artwork);
    Task DeleteArtworkAsync(Artwork artwork);
    Task<List<string>> GetImageKeysAsync(int ownerId);
}
