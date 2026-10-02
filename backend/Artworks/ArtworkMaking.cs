namespace ArtifyMe.Artworks;

public class ArtworkMaking
{
    public string Prompt { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Device { get; set; }
    public long Seed { get; set; }
    public int Steps { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
}
