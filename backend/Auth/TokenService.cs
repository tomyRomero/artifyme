using System.Security.Cryptography;
using System.Text;
using ArtifyMe.Users;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ArtifyMe.Auth;

public class TokenService : ITokenService
{
    private readonly JwtSettings _settings;

    public TokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user, Guid sessionId, DateTime now)
    {
        var expiresAt = now.AddMinutes(_settings.AccessTokenMinutes);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _settings.Issuer,
            Audience = _settings.Audience,
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.UserId.ToString(),
                [JwtRegisteredClaimNames.Email] = user.Email!,
                [JwtRegisteredClaimNames.Sid] = sessionId.ToString(),
            },
            IssuedAt = now,
            NotBefore = now,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret!)), SecurityAlgorithms.HmacSha256)
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }

    // Only the SHA-256 hash is stored
    public (string Token, string Hash) CreateRefreshToken()
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return (token, HashRefreshToken(token));
    }

    public string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
