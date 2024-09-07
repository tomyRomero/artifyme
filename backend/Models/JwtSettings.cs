namespace ArtifyMe.Models
{
    public class JwtSettings
    {
        public string? Secret { get; set; }
        public int ExpiryInMinutes { get; set; }
    }
}
