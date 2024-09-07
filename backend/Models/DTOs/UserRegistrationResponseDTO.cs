using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Models.DTOs;

public class UserRegistrationResponseDTO
{
    public int UserId { get; set; }
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
