using ArtifyMe.Users;

namespace ArtifyMe.Auth;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user, Guid sessionId, DateTime now);
    (string Token, string Hash) CreateRefreshToken();
    string HashRefreshToken(string token);
}
