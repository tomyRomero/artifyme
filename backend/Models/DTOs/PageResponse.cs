

using ArtifyMe.Models;

namespace ArtifyMe.Models.DTOs;
public class PageResponse
    {
        public List<Artwork>? Content { get; set; }
        public bool IsNext { get; set; }
        public string? Message { get; set; }
    }