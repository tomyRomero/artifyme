using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

public class RefreshRequest
{
    [Required, StringLength(128)]
    public string RefreshToken { get; set; } = string.Empty;

    [StringLength(32)]
    public string? AppVersion { get; set; }
}
