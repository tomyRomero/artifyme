using System.Net;
using System.Text.RegularExpressions;
using ArtifyMe.Images;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Images;

public class LocalImageStorageTests : IClassFixture<LocalImageStorageTests.ApiFactoryWithLocalFolder>
{
    public class ApiFactoryWithLocalFolder : ApiFactory
    {
        public string Folder { get; } = Path.Combine(Path.GetTempPath(), $"artifyme-images-{Guid.NewGuid():N}");

        protected override bool HasImageStorage => false;

        protected override string? LocalImageFolder => Folder;

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing && Directory.Exists(Folder))
                Directory.Delete(Folder, recursive: true);
        }
    }

    private readonly ApiFactoryWithLocalFolder _factory;

    public LocalImageStorageTests(ApiFactoryWithLocalFolder factory) => _factory = factory;

    [Fact]
    public async Task Images_are_kept_in_the_folder_and_load_from_their_links_without_signing_in()
    {
        var owner = await _factory.CreateSignedInClientAsync("local.links@example.com");
        var id = await _factory.CreateArtworkAsync(owner);
        var stored = await _factory.StoredArtworkAsync(id);

        Assert.True(File.Exists(Path.Combine(_factory.Folder, stored.ThumbnailImage!)));
        var anonymous = _factory.CreateClient();
        var thumbnail = await anonymous.GetAsync(await GalleryImageUrlAsync(owner));
        Assert.Equal(HttpStatusCode.OK, thumbnail.StatusCode);
        Assert.Equal("image/webp", thumbnail.Content.Headers.ContentType?.MediaType);
        Assert.Equal(FakeInferenceClient.Thumbnail, await thumbnail.Content.ReadAsByteArrayAsync());

        var artwork = await (await owner.GetAsync($"/api/v1/artworks/{id}")).ReadJsonAsync();
        Assert.Equal(FakeInferenceClient.Image, await anonymous.GetByteArrayAsync(artwork.GetProperty("aiImageUrl").GetString()));
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync(artwork.GetProperty("sketchImageUrl").GetString())).StatusCode);
    }

    [Fact]
    public async Task A_link_that_was_changed_or_has_expired_is_refused()
    {
        var alice = await _factory.CreateSignedInClientAsync("local.alice@example.com");
        var bob = await _factory.CreateSignedInClientAsync("local.bob@example.com");
        var alicesKey = (await _factory.StoredArtworkAsync(await _factory.CreateArtworkAsync(alice))).ThumbnailImage!;
        var bobsKey = (await _factory.StoredArtworkAsync(await _factory.CreateArtworkAsync(bob))).ThumbnailImage!;
        var url = await GalleryImageUrlAsync(alice);

        var laterExpiry = Regex.Replace(url, @"expires=(\d+)", m => $"expires={long.Parse(m.Groups[1].Value) + 3600}");
        var signer = _factory.Services.GetRequiredService<ImageUrlSigner>();
        var expiredAt = DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeSeconds();
        var expired = $"/api/v1/images/{alicesKey}?expires={expiredAt}&sig={signer.Signature(alicesKey, expiredAt)}";

        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anonymous.GetAsync(laterExpiry)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anonymous.GetAsync(url.Replace(alicesKey, bobsKey))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anonymous.GetAsync(expired)).StatusCode);
    }

    [Fact]
    public async Task Keys_that_point_outside_the_folder_are_never_read_or_deleted()
    {
        using var scope = _factory.Services.CreateScope();
        var storage = Assert.IsType<LocalImageStorage>(scope.ServiceProvider.GetRequiredService<IImageStorage>());
        var name = $"outside-{Guid.NewGuid():N}.png";
        var outside = Path.Combine(Path.GetDirectoryName(storage.Folder)!, name);
        await File.WriteAllBytesAsync(outside, [1, 2, 3]);
        try
        {
            Assert.Null(storage.OpenRead($"../{name}"));
            Assert.Null(storage.OpenRead($"users/1/../../../{name}"));
            await storage.DeleteAsync($"../{name}");
            Assert.True(File.Exists(outside));
        }
        finally
        {
            File.Delete(outside);
        }
    }

    [Fact]
    public async Task Deleting_the_account_removes_its_folder()
    {
        var client = await _factory.CreateSignedInClientAsync("local.delete@example.com");
        var key = (await _factory.StoredArtworkAsync(await _factory.CreateArtworkAsync(client))).ThumbnailImage!;
        var folder = Path.GetDirectoryName(Path.Combine(_factory.Folder, key))!;
        Assert.True(Directory.Exists(folder));

        (await client.DeleteAsJsonAsync("/api/v1/users/me", new { password = "correct horse battery staple" })).EnsureSuccessStatusCode();

        Assert.False(Directory.Exists(folder));
    }

    private static async Task<string> GalleryImageUrlAsync(HttpClient owner)
    {
        var gallery = await (await owner.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        return Assert.Single(gallery.GetProperty("items").EnumerateArray()).GetProperty("imageUrl").GetString()!;
    }
}
