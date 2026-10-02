using ArtifyMe.Users;
using Microsoft.AspNetCore.Identity;

namespace ArtifyMe.Auth;

public interface IPasswordService
{
    string HashPassword(string password);
    PasswordVerificationResult VerifyPassword(User user, string password);
}
