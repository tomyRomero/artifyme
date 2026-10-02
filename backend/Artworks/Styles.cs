namespace ArtifyMe.Artworks;

public record Style(string Id, string Name, string Words);

public static class Styles
{
    public static readonly IReadOnlyList<Style> All =
    [
        new("watercolor", "Watercolor", "watercolor painting, soft washes, paper texture"),
        new("oil", "Oil paint", "oil painting, thick brushstrokes, canvas texture"),
        new("pencil", "Pencil", "pencil drawing, graphite shading, sketchbook"),
        new("anime", "Anime", "anime style, cel shading, vibrant colors"),
        new("pixel", "Pixel art", "pixel art, 16-bit, crisp pixels"),
        new("comic", "Comic", "comic book art, bold ink lines, halftone"),
        new("photo", "Photo", "photograph, natural light, sharp focus"),
        new("3d", "3D", "3D render, soft studio lighting, smooth shapes"),
    ];

    public static Style? Find(string? id) => All.FirstOrDefault(style => style.Id == id);

    // What the model reads: the description, then the style's words
    public static string Prompt(string description, Style? style) =>
        style is null ? description : $"{description}, {style.Words}";
}
