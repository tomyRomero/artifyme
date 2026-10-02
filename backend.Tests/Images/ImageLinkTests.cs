using System.Net;
using ArtifyMe.Images;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Images;

public class ImageLinkTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ImageLinkTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_gallery_links_to_the_artworks_image()
    {
        var owner = await _factory.CreateSignedInClientAsync("links.gallery@example.com");
        await _factory.CreateArtworkAsync(owner, withThumbnail: false);

        var imageUrl = await GalleryImageUrlAsync(owner);

        Assert.Equal(FakeInferenceClient.Image, _factory.R2.Open(imageUrl));
    }

    [Fact]
    public async Task The_local_image_route_is_off_while_images_are_in_R2()
    {
        var signer = _factory.Services.GetRequiredService<ImageUrlSigner>();
        var expires = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds();

        var response = await _factory.CreateClient()
            .GetAsync($"/api/v1/images/users/1/abc.webp?expires={expires}&sig={signer.Signature("users/1/abc.webp", expires)}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Responses_give_links_to_images_but_not_where_they_are_stored()
    {
        var owner = await _factory.CreateSignedInClientAsync("links.keys@example.com");
        var id = await _factory.CreateArtworkAsync(owner);

        var galleryItem = Assert.Single((await (await owner.GetAsync("/api/v1/artworks")).ReadJsonAsync()).GetProperty("items").EnumerateArray());
        var single = await (await owner.GetAsync($"/api/v1/artworks/{id}")).ReadJsonAsync();

        foreach (var key in new[] { "sketchedImage", "aiImage", "thumbnailImage" })
        {
            Assert.False(galleryItem.TryGetProperty(key, out _), $"The gallery shows {key}");
            Assert.False(single.TryGetProperty(key, out _), $"The artwork shows {key}");
        }
    }

    private static async Task<string> GalleryImageUrlAsync(HttpClient owner)
    {
        var gallery = await (await owner.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        return Assert.Single(gallery.GetProperty("items").EnumerateArray()).GetProperty("imageUrl").GetString()!;
    }
}
