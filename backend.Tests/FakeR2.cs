using System.Collections.Concurrent;
using System.Net;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using ArtifyMe.Images;

namespace ArtifyMe.Tests;

// In-memory R2. It subclasses the real S3 client, so links are signed exactly as in production.
public class FakeR2 : AmazonS3Client
{
    public const string Endpoint = "https://test-account.r2.cloudflarestorage.com";
    public const string Bucket = "artifyme-test";
    public const string AccessKeyId = "test-key-id";
    public const string SecretAccessKey = "test-secret-key";

    public record StoredObject(byte[] Content, string? ContentType);

    private readonly ConcurrentDictionary<string, StoredObject> _objects = new();

    public FakeR2() : base(new BasicAWSCredentials(AccessKeyId, SecretAccessKey), R2ImageStorage.ClientConfig(Endpoint))
    {
    }

    // R2 lists up to 1,000; tests lower it to see paging
    public int PageSize { get; set; } = 1000;

    // Uploads for which this returns true fail, as if R2 were unreachable
    public Func<PutObjectRequest, bool>? FailUpload { get; set; }

    // Keys a batch delete reports as failed
    public HashSet<string> Undeletable { get; } = [];

    public ICollection<string> Keys => _objects.Keys;

    public bool Contains(string key) => _objects.ContainsKey(key);

    public StoredObject? Get(string key) => _objects.GetValueOrDefault(key);

    public void Put(string key, byte[] content) => _objects[key] = new StoredObject(content, null);

    // Maps a link to its object; R2 itself would check the signature and expiry
    public byte[]? Open(string? url)
    {
        var path = new Uri(url!).AbsolutePath;
        var bucketPath = $"/{Bucket}/";
        return path.StartsWith(bucketPath, StringComparison.Ordinal)
            ? Get(Uri.UnescapeDataString(path[bucketPath.Length..]))?.Content
            : null;
    }

    public override async Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken cancellationToken = default)
    {
        CheckBucket(request.BucketName);
        // R2 rejects chunked (streaming) uploads
        if (request.UseChunkEncoding && request.DisablePayloadSigning != true)
        {
            throw new AmazonS3Exception("STREAMING-AWS4-HMAC-SHA256-PAYLOAD not implemented")
            {
                ErrorCode = "NotImplemented",
                StatusCode = HttpStatusCode.NotImplemented,
            };
        }
        if (FailUpload?.Invoke(request) == true)
            throw new AmazonS3Exception("Service unavailable") { StatusCode = HttpStatusCode.ServiceUnavailable };
        using var content = new MemoryStream();
        await request.InputStream.CopyToAsync(content, cancellationToken);
        _objects[request.Key] = new StoredObject(content.ToArray(), request.ContentType);
        return new PutObjectResponse();
    }

    public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken cancellationToken = default)
    {
        CheckBucket(request.BucketName);
        _objects.TryRemove(request.Key, out _);
        return Task.FromResult(new DeleteObjectResponse());
    }

    // The continuation token is the last key of the previous page
    public override Task<ListObjectsV2Response> ListObjectsV2Async(ListObjectsV2Request request, CancellationToken cancellationToken = default)
    {
        CheckBucket(request.BucketName);
        var after = request.ContinuationToken;
        var matching = _objects.Keys
            .Where(key => key.StartsWith(request.Prefix ?? "", StringComparison.Ordinal))
            .Where(key => after is null || string.CompareOrdinal(key, after) > 0)
            .Order(StringComparer.Ordinal)
            .ToList();
        var page = matching.Take(PageSize).ToList();
        var truncated = matching.Count > page.Count;

        return Task.FromResult(new ListObjectsV2Response
        {
            // The SDK leaves the list null when nothing matches
            S3Objects = page.Count == 0 ? null : page.Select(key => new S3Object { Key = key }).ToList(),
            IsTruncated = truncated,
            NextContinuationToken = truncated ? page[^1] : null,
        });
    }

    public override Task<DeleteObjectsResponse> DeleteObjectsAsync(DeleteObjectsRequest request, CancellationToken cancellationToken = default)
    {
        CheckBucket(request.BucketName);
        var errors = new List<DeleteError>();
        foreach (var key in request.Objects.Select(o => o.Key))
        {
            if (Undeletable.Contains(key))
                errors.Add(new DeleteError { Key = key, Code = "AccessDenied", Message = "Access Denied" });
            else
                _objects.TryRemove(key, out _);
        }
        return Task.FromResult(new DeleteObjectsResponse { DeleteErrors = errors });
    }

    private static void CheckBucket(string bucketName)
    {
        if (bucketName != Bucket)
        {
            throw new AmazonS3Exception($"The bucket {bucketName} does not exist.")
            {
                ErrorCode = "NoSuchBucket",
                StatusCode = HttpStatusCode.NotFound,
            };
        }
    }
}
