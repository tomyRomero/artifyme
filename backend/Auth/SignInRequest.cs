using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

public class SignInRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required, StringLength(64, MinimumLength = 16)]
    public string InstallId { get; set; } = string.Empty;

    [Required, RegularExpression("^(ios|android)$", ErrorMessage = "Platform must be 'ios' or 'android'.")]
    public string Platform { get; set; } = string.Empty;

    [StringLength(100)]
    public string? DeviceModel { get; set; }

    [StringLength(32)]
    public string? AppVersion { get; set; }
}
