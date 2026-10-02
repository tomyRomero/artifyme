using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

// One sign-in on one app install. Revoked sessions are kept as history.
public class Session
{
    [Key]
    public Guid Id { get; set; }

    public int UserId { get; set; }

    [Required]
    [StringLength(64)]
    public string InstallId { get; set; } = string.Empty;

    [Required]
    [StringLength(10)]
    public string Platform { get; set; } = string.Empty;

    [StringLength(100)]
    public string? DeviceModel { get; set; }

    [StringLength(32)]
    public string? AppVersion { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime LastSeenAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    // Where to send this phone's notifications. Cleared when the session ends.
    [StringLength(PushTokenRequest.MaxLength)]
    public string? PushToken { get; set; }

    public bool IsActive => RevokedAt is null;
}
