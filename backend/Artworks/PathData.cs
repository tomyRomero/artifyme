namespace ArtifyMe.Artworks;

public class PathData
{
    public string Color { get; set; } = string.Empty;
    public List<string> Path { get; set; } = new List<string>();
    public int Size { get; set; }

    // pen, pencil or marker; older strokes have none and are drawn with a pen
    public string? Brush { get; set; }
}
