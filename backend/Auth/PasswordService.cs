using System.Security.Cryptography;
using System.Text;
using ArtifyMe.Users;
using Microsoft.AspNetCore.Identity;

namespace ArtifyMe.Auth;

public class PasswordService : IPasswordService
{
    private readonly PasswordHasher<User> _hasher = new();

    // PBKDF2, with the salt and parameters stored in the hash
    public string HashPassword(string password) => _hasher.HashPassword(null!, password);

    // Legacy accounts have an HMAC-SHA512 hash with a separate salt
    public PasswordVerificationResult VerifyPassword(User user, string password)
    {
        if (string.IsNullOrEmpty(user.PasswordHash))
            return PasswordVerificationResult.Failed;

        if (!string.IsNullOrEmpty(user.Salt))
        {
            return VerifyLegacyPassword(password, user.PasswordHash, user.Salt)
                ? PasswordVerificationResult.SuccessRehashNeeded
                : PasswordVerificationResult.Failed;
        }

        return _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
    }

    private static bool VerifyLegacyPassword(string password, string storedHash, string storedSalt)
    {
        using var hmac = new HMACSHA512(Convert.FromBase64String(storedSalt));
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(computedHash, Convert.FromBase64String(storedHash));
    }
}
