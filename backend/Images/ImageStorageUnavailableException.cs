namespace ArtifyMe.Images;

public class ImageStorageUnavailableException : Exception
{
    public ImageStorageUnavailableException() : base("Images are unavailable: the server's image storage isn't set up.")
    {
    }
}
