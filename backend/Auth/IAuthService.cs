using ArtifyMe.Users;

namespace ArtifyMe.Auth;

public interface IAuthService
{
    Task<User?> ValidateCredentialsAsync(string email, string password);
    Task<PasswordChange> ChangePasswordAsync(int userId, ChangePasswordRequest request);
}
