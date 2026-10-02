namespace ArtifyMe.Images;

public static class ImageStorageExtensions
{
    // A failure only leaves an unused file behind, so log it and carry on
    public static async Task DeleteQuietlyAsync(this IImageStorage storage, IEnumerable<string?> keys, ILogger logger)
    {
        foreach (var key in keys.OfType<string>().Distinct())
        {
            try
            {
                await storage.DeleteAsync(key);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not delete image {ImageKey}; it is no longer used", key);
            }
        }
    }
}
