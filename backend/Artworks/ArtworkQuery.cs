using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Artworks;

public class ArtworkQuery
{
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, ArtworkLimits.MaxPageSize)]
    public int PageSize { get; set; } = 12;

    // Matches anywhere in the title or description
    [StringLength(100)]
    public string? Search { get; set; }

    [StringLength(32)]
    public string? Style { get; set; }

    public ArtworkSort Sort { get; set; } = ArtworkSort.Newest;
}

public enum ArtworkSort
{
    Newest,
    Oldest,
}
