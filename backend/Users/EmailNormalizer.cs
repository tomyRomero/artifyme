namespace ArtifyMe.Users;

public static class EmailNormalizer
{
    public static string Normalize(string? email) => (email ?? "").Trim().ToLowerInvariant();
}
