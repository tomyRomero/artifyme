using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Models.DTOs;

public class UserRegistrationDTO
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
}