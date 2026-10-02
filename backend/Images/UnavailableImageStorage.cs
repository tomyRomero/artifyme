namespace ArtifyMe.Images;

// Used with neither R2 nor a local folder, so the API still starts and everything without images works
public class UnavailableImageStorage : IImageStorage
{
    public Task<string> SaveAsync(int ownerId, byte[] content, string extension) => throw new ImageStorageUnavailableException();

    public Task<string> GetUrlAsync(string key, TimeSpan lifetime) => throw new ImageStorageUnavailableException();

    public Task DeleteAsync(string key) => throw new ImageStorageUnavailableException();

    public Task DeleteOwnerFolderAsync(int ownerId) => throw new ImageStorageUnavailableException();
}
