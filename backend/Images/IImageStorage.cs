namespace ArtifyMe.Images;

public interface IImageStorage
{
    Task<string> SaveAsync(int ownerId, byte[] content, string extension);

    Task<string> GetUrlAsync(string key, TimeSpan lifetime);

    Task DeleteAsync(string key);

    Task DeleteOwnerFolderAsync(int ownerId);
}
