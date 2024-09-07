namespace ArtifyMe.Models.DTOs;

    public class ArtworkRequest
    {
        public string? UserEmail { get; set; }
        public string? SketchedImage { get; set; }
        public string? AiImage { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public List<PathData>? Paths { get; set; }
    }
