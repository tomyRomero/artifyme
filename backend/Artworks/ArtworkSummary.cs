using System.Text.Json.Serialization;

namespace ArtifyMe.Artworks;

public class ArtworkSummary
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreationDateTime { get; set; }

    [JsonIgnore]
    public string? AiImage { get; set; }

    [JsonIgnore]
    public string? ThumbnailImage { get; set; }

    public string? ImageUrl { get; set; }
}
