namespace ArtifyMe.Auth;

public class JwtSettings
{
    public string? Secret { get; set; }
    public string Issuer { get; set; } = "artifyme-api";
    public string Audience { get; set; } = "artifyme-app";
    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 90;
}
