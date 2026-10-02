namespace ArtifyMe.Artworks;

public class ArtworkDetail
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Style { get; set; }
    public DateTime CreationDateTime { get; set; }
    public List<PathData> Paths { get; set; } = [];
    public string? SketchImageUrl { get; set; }
    public string? AiImageUrl { get; set; }
    public HowItWasMade? HowItWasMade { get; set; }
}

public class HowItWasMade
{
    public string? OutlineImageUrl { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? Device { get; set; }
    public long Seed { get; set; }
    public int Steps { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
}
