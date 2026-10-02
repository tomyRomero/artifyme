using System.ComponentModel.DataAnnotations;
using ArtifyMe.Auth;

namespace ArtifyMe.Users;

public class RegisterRequest
{
    [Required, StringLength(50)]
    public string? FirstName { get; set; }

    [Required, StringLength(50)]
    public string? LastName { get; set; }

    [Required, EmailAddress, StringLength(255)]
    public string? Email { get; set; }

    // Length only, per NIST SP 800-63B
    [Required, StringLength(PasswordRules.MaxLength, MinimumLength = PasswordRules.MinLength, ErrorMessage = PasswordRules.LengthMessage)]
    public string? Password { get; set; }
}
