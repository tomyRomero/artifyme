using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string? CurrentPassword { get; set; }

    [Required, StringLength(PasswordRules.MaxLength, MinimumLength = PasswordRules.MinLength, ErrorMessage = PasswordRules.LengthMessage)]
    public string? NewPassword { get; set; }
}
