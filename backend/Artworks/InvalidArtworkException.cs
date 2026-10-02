namespace ArtifyMe.Artworks;

public class InvalidArtworkException : Exception
{
    public InvalidArtworkException(string message) : base(message) { }
}
