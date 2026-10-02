namespace ArtifyMe.Artworks;

public static class Strokes
{
    private static readonly string[] Brushes = ["pen", "pencil", "marker"];

    public static void EnsureValid(List<PathData> strokes)
    {
        foreach (var stroke in strokes)
        {
            if (stroke.Path.Count == 0 || stroke.Path.Count > ArtworkLimits.MaxPointsPerStroke)
                throw new InvalidArtworkException($"Each stroke needs between 1 and {ArtworkLimits.MaxPointsPerStroke} points.");
            if (string.IsNullOrWhiteSpace(stroke.Color) || stroke.Color.Length > 100)
                throw new InvalidArtworkException("Each stroke needs a color of at most 100 characters.");
            if (stroke.Size < 1 || stroke.Size > ArtworkLimits.MaxBrushSize)
                throw new InvalidArtworkException($"Brush size must be between 1 and {ArtworkLimits.MaxBrushSize}.");
            if (stroke.Brush is not null && !Brushes.Contains(stroke.Brush))
                throw new InvalidArtworkException($"The brush must be one of: {string.Join(", ", Brushes)}.");
        }
    }

    // Deep copy, so an entity never shares lists with a request
    public static List<PathData> Copy(IEnumerable<PathData> strokes) =>
        strokes.Select(p => new PathData { Color = p.Color, Path = [.. p.Path], Size = p.Size, Brush = p.Brush }).ToList();
}
