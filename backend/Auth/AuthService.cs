using ArtifyMe.Users;
using Microsoft.AspNetCore.Identity;

namespace ArtifyMe.Auth;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordService _passwords;

    public AuthService(IUserRepository users, IPasswordService passwords)
    {
        _users = users;
        _passwords = passwords;
    }

    public async Task<User?> ValidateCredentialsAsync(string email, string password)
    {
        var user = await _users.GetUserByEmailAsync(EmailNormalizer.Normalize(email));
        if (user is null)
            return null;

        var verification = _passwords.VerifyPassword(user, password);
        if (verification == PasswordVerificationResult.Failed)
            return null;

        // Upgrade legacy HMAC hashes to PBKDF2 on a successful login
        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            await SetPasswordAsync(user, password);

        return user;
    }

    public async Task<PasswordChange> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _users.GetUserByIdAsync(userId);
        if (user is null)
            return PasswordChange.NoAccount;

        if (_passwords.VerifyPassword(user, request.CurrentPassword!) == PasswordVerificationResult.Failed)
            return PasswordChange.WrongPassword;

        await SetPasswordAsync(user, request.NewPassword!);
        return PasswordChange.Changed;
    }

    private async Task SetPasswordAsync(User user, string password)
    {
        user.PasswordHash = _passwords.HashPassword(password);
        user.Salt = null;
        await _users.UpdateUserAsync(user);
    }
}
