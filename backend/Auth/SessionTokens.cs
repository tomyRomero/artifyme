namespace ArtifyMe.Auth;

public class SessionTokens
{
    public Guid SessionId { get; set; }

    public string AccessToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAt { get; set; }

    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiresAt { get; set; }
}
