using ArtifyMe.Artworks;
using ArtifyMe.Auth;
using ArtifyMe.Generations;
using ArtifyMe.Images;
using Microsoft.AspNetCore.Identity;

namespace ArtifyMe.Users;

public class UserService : IUserService
{
    private readonly IUserRepository _users;
    private readonly IPasswordService _passwords;
    private readonly IArtworkRepository _artworks;
    private readonly IGenerationService _generations;
    private readonly IImageStorage _imageStorage;
    private readonly TimeProvider _time;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository users, IPasswordService passwords, IArtworkRepository artworks,
        IGenerationService generations, IImageStorage imageStorage, TimeProvider time, ILogger<UserService> logger)
    {
        _users = users;
        _passwords = passwords;
        _artworks = artworks;
        _generations = generations;
        _imageStorage = imageStorage;
        _time = time;
        _logger = logger;
    }

    public async Task<UserProfile> RegisterAsync(RegisterRequest request)
    {
        var email = EmailNormalizer.Normalize(request.Email);
        if (await _users.GetUserByEmailAsync(email) is not null)
            throw new EmailAlreadyRegisteredException();

        var user = new User
        {
            FirstName = request.FirstName!.Trim(),
            LastName = request.LastName!.Trim(),
            Email = email,
            PasswordHash = _passwords.HashPassword(request.Password!),
            CreatedAt = _time.GetUtcNow().UtcDateTime,
        };
        await _users.AddUserAsync(user);
        return ToProfile(user);
    }

    public async Task<UserProfile?> GetProfileAsync(int userId)
    {
        var user = await _users.GetUserByIdAsync(userId);
        return user is null ? null : ToProfile(user);
    }

    public async Task<AccountDeletion> DeleteAccountAsync(int userId, string password)
    {
        var user = await _users.GetUserByIdAsync(userId);
        if (user is null)
            return AccountDeletion.NoAccount;

        if (_passwords.VerifyPassword(user, password) == PasswordVerificationResult.Failed)
            return AccountDeletion.WrongPassword;

        // Stop any generation in progress first
        if (await _generations.GetActiveAsync(userId) is { } active)
            await _generations.CancelAsync(active.Id, userId);

        // Older images aren't in the user's folder, so delete each artwork's images too
        var imageKeys = await _artworks.GetImageKeysAsync(userId);

        // Artworks, generations and sessions cascade with the user
        await _users.DeleteUserAsync(userId);

        await _imageStorage.DeleteQuietlyAsync(imageKeys, _logger);
        try
        {
            await _imageStorage.DeleteOwnerFolderAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not delete the image folder of deleted account {UserId}", userId);
        }

        return AccountDeletion.Deleted;
    }

    private static UserProfile ToProfile(User user) => new()
    {
        UserId = user.UserId,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        CreatedAt = user.CreatedAt,
    };
}
