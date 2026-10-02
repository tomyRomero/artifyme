using System.Security.Cryptography;
using System.Text;
using ArtifyMe.Auth;
using Microsoft.Extensions.Options;

namespace ArtifyMe.Images;

// Signs links to images in the local folder the way R2's presigned links work: the link carries
// an expiry time and a signature over the key and that time, so it needs no sign-in header.
public class ImageUrlSigner
{
    private readonly byte[] _signingKey;
    private readonly TimeProvider _time;

    public ImageUrlSigner(IOptions<JwtSettings> jwtSettings, TimeProvider time)
    {
        // Derived from the API secret, so image links and sign-in tokens never share a key
        using var derive = new HMACSHA256(Encoding.UTF8.GetBytes(jwtSettings.Value.Secret!));
        _signingKey = derive.ComputeHash(Encoding.UTF8.GetBytes("artifyme-image-urls"));
        _time = time;
    }

    public (long Expires, string Signature) Sign(string key, TimeSpan lifetime)
    {
        var expires = _time.GetUtcNow().Add(lifetime).ToUnixTimeSeconds();
        return (expires, Signature(key, expires));
    }

    public bool IsValid(string key, long expires, string? signature)
    {
        if (string.IsNullOrEmpty(signature) || expires < _time.GetUtcNow().ToUnixTimeSeconds())
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(signature), Encoding.ASCII.GetBytes(Signature(key, expires)));
    }

    public string Signature(string key, long expires)
    {
        using var hmac = new HMACSHA256(_signingKey);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{key}\n{expires}"));
        return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
