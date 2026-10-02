using Amazon.Runtime;
using Amazon.S3;

namespace ArtifyMe.Images;

public enum ImageStore { R2, LocalFolder, Unavailable }

public record ImageStorageChoice(ImageStore Store, IReadOnlyList<string> MissingR2Settings, string? LocalFolder);

public static class ImageStorageServiceCollectionExtensions
{
    // R2 when it's set up, otherwise the local folder if there is one. With neither, the API still runs
    // and requests that need images get a 503.
    public static ImageStorageChoice AddImageStorage(this IServiceCollection services, IConfiguration configuration)
    {
        var r2Section = configuration.GetSection("R2");
        services.Configure<R2Settings>(r2Section);
        var missing = (r2Section.Get<R2Settings>() ?? new R2Settings()).Missing();

        var imagesSection = configuration.GetSection("Images");
        services.Configure<ImageSettings>(imagesSection);
        var localFolder = imagesSection.Get<ImageSettings>()?.LocalFolder;

        services.AddSingleton<ImageUrlSigner>();
        services.AddExceptionHandler<ImageStorageUnavailableHandler>();

        if (missing.Count == 0)
        {
            var settings = r2Section.Get<R2Settings>()!;
            services.AddSingleton<IAmazonS3>(new AmazonS3Client(
                new BasicAWSCredentials(settings.AccessKeyId, settings.SecretAccessKey),
                R2ImageStorage.ClientConfig(settings.Endpoint!)));
            services.AddScoped<IImageStorage, R2ImageStorage>();
            return new ImageStorageChoice(ImageStore.R2, missing, null);
        }
        if (!string.IsNullOrWhiteSpace(localFolder))
        {
            services.AddHttpContextAccessor();
            services.AddScoped<IImageStorage, LocalImageStorage>();
            return new ImageStorageChoice(ImageStore.LocalFolder, missing, localFolder);
        }
        services.AddSingleton<IImageStorage, UnavailableImageStorage>();
        return new ImageStorageChoice(ImageStore.Unavailable, missing, null);
    }
}
