using System.Net.Http.Json;

namespace ArtifyMe.Tests.Images;

public class ImageCleanupTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ImageCleanupTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Deleting_an_artwork_removes_all_its_images()
    {
        var client = await _factory.CreateSignedInClientAsync("cleanup.delete@example.com");
        var id = await _factory.CreateArtworkAsync(client);
        var stored = await _factory.StoredArtworkAsync(id);

        (await client.DeleteAsync($"/api/v1/artworks/{id}")).EnsureSuccessStatusCode();

        Assert.False(_factory.R2.Contains(stored.SketchedImage!));
        Assert.False(_factory.R2.Contains(stored.AiImage!));
        Assert.False(_factory.R2.Contains(stored.ThumbnailImage!));
        Assert.False(_factory.R2.Contains(stored.OutlineImage!));
    }

    [Fact]
    public async Task Editing_the_words_keeps_every_image()
    {
        var client = await _factory.CreateSignedInClientAsync("cleanup.edit@example.com");
        var id = await _factory.CreateArtworkAsync(client);
        var stored = await _factory.StoredArtworkAsync(id);

        (await client.PatchAsJsonAsync($"/api/v1/artworks/{id}", new { title = "Sofa" })).EnsureSuccessStatusCode();

        Assert.True(_factory.R2.Contains(stored.SketchedImage!));
        Assert.True(_factory.R2.Contains(stored.AiImage!));
        Assert.True(_factory.R2.Contains(stored.ThumbnailImage!));
    }
}
