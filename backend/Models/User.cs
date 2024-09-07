using System;
using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Models;

    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string? FirstName { get; set; }

        [Required]
        [StringLength(50)]
        public string? LastName { get; set; }

        [Required]
        [StringLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [Required]
        [StringLength(255)]
        public string? PasswordHash { get; set; }

        public string? Salt { get; set; }

        public DateTime CreatedAt { get; set; }
    }

