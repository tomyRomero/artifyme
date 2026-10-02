using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Users;

public class DeleteAccountRequest
{
    [Required]
    public string? Password { get; set; }
}
