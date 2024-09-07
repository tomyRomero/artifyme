using ArtifyMe.Models;

namespace ArtifyMe.Utilities.Interfaces;

public interface IHasher
{
    public string GenerateSalt();
    string HashPassword(string password, string salt);
    bool VerifyPassword(string password, string storedHash, string storedSalt);
    string GenerateJwtToken(User user);
}