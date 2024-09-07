using System.Collections.Generic;

namespace ArtifyMe.Models
{
    public class PathData
    {
        public string Color { get; set; } = string.Empty;
        public List<string> Path { get; set; } = new List<string>();
        public int Size { get; set; }
    }
}