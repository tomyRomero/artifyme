using Microsoft.Extensions.Options;

namespace ArtifyMe.Images;

// Images as files in a folder, served by the API through signed links, so it runs without an R2 account
public class LocalImageStorage : IImageStorage
{
    private readonly string _root;
    private readonly ImageUrlSigner _signer;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LocalImageStorage(IOptions<ImageSettings> settings, IWebHostEnvironment environment,
        ImageUrlSigner signer, IHttpContextAccessor httpContextAccessor)
    {
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, settings.Value.LocalFolder!));
        _signer = signer;
        _httpContextAccessor = httpContextAccessor;
        Directory.CreateDirectory(_root);
    }

    public string Folder => _root;

    public async Task<string> SaveAsync(int ownerId, byte[] content, string extension)
    {
        var key = ImageData.NewKey(ownerId, extension);
        var path = PathFor(key)!;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content);
        return key;
    }

    // Links use the address the app called, which a phone on the network can reach
    public Task<string> GetUrlAsync(string key, TimeSpan lifetime)
    {
        var request = _httpContextAccessor.HttpContext?.Request
            ?? throw new InvalidOperationException("Links to local images can only be made while handling a request.");
        var (expires, signature) = _signer.Sign(key, lifetime);
        return Task.FromResult($"{request.Scheme}://{request.Host}{request.PathBase}/api/v1/images/{key}?expires={expires}&sig={signature}");
    }

    public Stream? OpenRead(string key)
    {
        var path = PathFor(key);
        return path is not null && File.Exists(path) ? File.OpenRead(path) : null;
    }

    public Task DeleteAsync(string key)
    {
        var path = PathFor(key);
        if (path is not null && File.Exists(path))
            File.Delete(path);
        return Task.CompletedTask;
    }

    public Task DeleteOwnerFolderAsync(int ownerId)
    {
        var folder = Path.Combine(_root, ImageData.OwnerFolder(ownerId));
        if (Directory.Exists(folder))
            Directory.Delete(folder, recursive: true);
        return Task.CompletedTask;
    }

    // Null for anything but a plain image name, so ".." can't reach outside the folder
    private string? PathFor(string? key) => ImageData.IsSafeKey(key) ? Path.Combine(_root, key!) : null;
}
