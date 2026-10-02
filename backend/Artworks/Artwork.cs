using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Artworks;

public class Artwork
{
    [Key]
    public string? Id { get; set; }

    public int UserId { get; set; }

    [StringLength(255)]
    public string? SketchedImage { get; set; }

    [StringLength(255)]
    public string? AiImage { get; set; }

    [StringLength(255)]
    public string? ThumbnailImage { get; set; }

    // The lines ControlNet followed
    [StringLength(255)]
    public string? OutlineImage { get; set; }

    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(32)]
    public string? Style { get; set; }

    public DateTime CreationDateTime { get; set; }

    public ICollection<PathData> Paths { get; set; } = new List<PathData>();

    // How the image was made. Older artworks have none.
    public ArtworkMaking? Making { get; set; }
}
