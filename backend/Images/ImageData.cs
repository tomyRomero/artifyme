using System.Text.RegularExpressions;

namespace ArtifyMe.Images;

public static partial class ImageData
{
    private static readonly Dictionary<string, string> ContentTypes = new()
    {
        ["png"] = "image/png",
        ["jpg"] = "image/jpeg",
        ["jpeg"] = "image/jpeg",
        ["gif"] = "image/gif",
        ["webp"] = "image/webp",
    };

    // No SVG: it can carry script
    public static bool TryParseDataUri(string? dataUri, out byte[] bytes, out string extension)
    {
        bytes = [];
        extension = "";

        var match = DataUriPattern().Match(dataUri ?? "");
        if (!match.Success)
            return false;

        extension = match.Groups["type"].Value == "jpeg" ? "jpg" : match.Groups["type"].Value;
        try
        {
            bytes = Convert.FromBase64String(match.Groups["data"].Value);
            return bytes.Length > 0;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public static string NewKey(int ownerId, string extension) => $"{OwnerFolder(ownerId)}{Guid.NewGuid():N}.{extension}";

    public static string OwnerFolder(int ownerId) => $"users/{ownerId}/";

    // A plain file name, optionally in a user's folder (older images have none). Anything else, such as "..", is refused.
    public static bool IsSafeKey(string? key) => key is not null && SafeKeyPattern().IsMatch(key);

    public static bool TryGetContentType(string key, out string contentType)
    {
        var extension = Path.GetExtension(key).TrimStart('.').ToLowerInvariant();
        return ContentTypes.TryGetValue(extension, out contentType!);
    }

    [GeneratedRegex(@"^data:image/(?<type>png|jpeg|gif|webp);base64,(?<data>.+)$", RegexOptions.Singleline)]
    private static partial Regex DataUriPattern();

    [GeneratedRegex(@"^(users/[0-9]+/)?[A-Za-z0-9_\-]+\.(png|jpe?g|gif|webp)$", RegexOptions.IgnoreCase)]
    private static partial Regex SafeKeyPattern();
}
