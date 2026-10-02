using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace ArtifyMe.Images;

public class R2ImageStorage : IImageStorage
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly TimeProvider _time;

    public R2ImageStorage(IAmazonS3 s3Client, IOptions<R2Settings> settings, TimeProvider time)
    {
        _s3Client = s3Client;
        _bucketName = settings.Value.BucketName!;
        _time = time;
    }

    public static AmazonS3Config ClientConfig(string endpoint) => new()
    {
        ServiceURL = endpoint,
        // R2 expects the region "auto"
        AuthenticationRegion = "auto",
        ForcePathStyle = true,
        // R2 rejects the checksums the SDK adds by default
        RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
        ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
    };

    public async Task<string> SaveAsync(int ownerId, byte[] content, string extension)
    {
        var key = ImageData.NewKey(ownerId, extension);
        ImageData.TryGetContentType(key, out var contentType);

        await _s3Client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            ContentType = contentType,
            InputStream = new MemoryStream(content),
            // R2 doesn't support streaming (chunked) SigV4 uploads
            UseChunkEncoding = false,
        });
        return key;
    }

    public Task<string> GetUrlAsync(string key, TimeSpan lifetime)
    {
        return _s3Client.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = _time.GetUtcNow().UtcDateTime.Add(lifetime),
        });
    }

    public async Task DeleteAsync(string key)
    {
        await _s3Client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = _bucketName, Key = key });
    }

    public async Task DeleteOwnerFolderAsync(int ownerId)
    {
        var request = new ListObjectsV2Request { BucketName = _bucketName, Prefix = ImageData.OwnerFolder(ownerId) };
        ListObjectsV2Response page;
        do
        {
            page = await _s3Client.ListObjectsV2Async(request);
            if (page.S3Objects is { Count: > 0 } objects)
            {
                var deleted = await _s3Client.DeleteObjectsAsync(new DeleteObjectsRequest
                {
                    BucketName = _bucketName,
                    Objects = objects.Select(o => new KeyVersion { Key = o.Key }).ToList(),
                });
                if (deleted.DeleteErrors is { Count: > 0 } errors)
                {
                    throw new IOException($"Could not delete {errors.Count} images in {request.Prefix}, such as {errors[0].Key}: {errors[0].Message}");
                }
            }
            request.ContinuationToken = page.NextContinuationToken;
        } while (page.IsTruncated == true);
    }
}
