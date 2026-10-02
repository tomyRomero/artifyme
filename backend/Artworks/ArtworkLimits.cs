namespace ArtifyMe.Artworks;

public static class ArtworkLimits
{
    public const int MaxStrokes = 2_000;
    public const int MaxPointsPerStroke = 5_000;
    public const int MaxBrushSize = 100;
    public const int MaxPageSize = 50;
    public const int MaxTitleLength = 60;

    // 5 MB of image is about 7 MB as base64
    public const int MaxSketchBytes = 5 * 1024 * 1024;
    public const int MaxSketchDataUriLength = MaxSketchBytes / 3 * 4 + 100;
}
