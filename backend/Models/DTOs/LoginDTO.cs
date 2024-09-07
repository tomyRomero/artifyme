using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Models.DTOs;

    public class LoginDTO
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
    }

