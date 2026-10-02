using System.ComponentModel.DataAnnotations;
using ArtifyMe.Artworks;

namespace ArtifyMe.Generations;

public class GenerationRequest
{
    [Required]
    [MaxLength(ArtworkLimits.MaxSketchDataUriLength)]
    public string Sketch { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 3)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [StringLength(ArtworkLimits.MaxTitleLength)]
    public string Title { get; set; } = string.Empty;

    // One of Styles.All, or none
    [StringLength(32)]
    public string? Style { get; set; }

    [Required]
    [MinLength(1)]
    [MaxLength(ArtworkLimits.MaxStrokes)]
    public List<PathData> Paths { get; set; } = [];

    [StringLength(64)]
    public string? ArtworkId { get; set; }

    [Range(0, uint.MaxValue)]
    public long? Seed { get; set; }
}
