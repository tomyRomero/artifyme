namespace ArtifyMe.Images;

public class R2Settings
{
    // https://<account id>.r2.cloudflarestorage.com
    public string? Endpoint { get; set; }
    public string? BucketName { get; set; }
    public string? AccessKeyId { get; set; }
    public string? SecretAccessKey { get; set; }

    public IReadOnlyList<string> Missing() =>
        new (string Name, string? Value)[]
        {
            ("R2:Endpoint", Endpoint),
            ("R2:BucketName", BucketName),
            ("R2:AccessKeyId", AccessKeyId),
            ("R2:SecretAccessKey", SecretAccessKey),
        }
        .Where(setting => string.IsNullOrWhiteSpace(setting.Value))
        .Select(setting => setting.Name)
        .ToList();
}
