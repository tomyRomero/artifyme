using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

// Refresh tokens rotate: each refresh revokes the token and points it at its replacement
public class RefreshToken
{
    [Key]
    public long Id { get; set; }

    public Guid SessionId { get; set; }
    public Session Session { get; set; } = null!;

    [Required]
    [StringLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    // Concurrency check, so two refreshes racing with one token can't both succeed
    [ConcurrencyCheck]
    public DateTime? RevokedAt { get; set; }

    // Only set by a refresh. A replaced token coming back means it was copied.
    public long? ReplacedById { get; set; }
    public RefreshToken? ReplacedBy { get; set; }
}
