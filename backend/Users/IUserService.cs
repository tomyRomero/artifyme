namespace ArtifyMe.Users;

public interface IUserService
{
    Task<UserProfile> RegisterAsync(RegisterRequest request);
    Task<UserProfile?> GetProfileAsync(int userId);
    Task<AccountDeletion> DeleteAccountAsync(int userId, string password);
}
