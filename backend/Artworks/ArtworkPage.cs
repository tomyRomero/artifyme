namespace ArtifyMe.Artworks;

public class ArtworkPage
{
    public List<ArtworkSummary> Items { get; set; } = [];
    public bool HasMore { get; set; }
}
