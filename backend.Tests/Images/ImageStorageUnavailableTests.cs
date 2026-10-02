using System.Net;
using System.Net.Http.Json;
using ArtifyMe.Artworks;
using ArtifyMe.Data;
using ArtifyMe.Images;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Images;

public class ImageStorageUnavailableTests : IClassFixture<ImageStorageUnavailableTests.ApiFactoryWithoutR2>
{
    public class ApiFactoryWithoutR2 : ApiFactory
    {
        protected override bool HasImageStorage => false;
    }

    private const string Password = "correct horse battery staple";

    private readonly ApiFactoryWithoutR2 _factory;

    public ImageStorageUnavailableTests(ApiFactoryWithoutR2 factory) => _factory = factory;

    [Fact]
    public async Task Users_can_still_sign_in_and_see_an_empty_gallery()
    {
        var client = await _factory.CreateSignedInClientAsync("unavailable.empty@example.com");

        var gallery = await client.GetAsync("/api/v1/artworks");

        Assert.Equal(HttpStatusCode.OK, gallery.StatusCode);
        Assert.Empty((await gallery.ReadJsonAsync()).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Making_an_artwork_says_images_are_unavailable_and_starts_nothing()
    {
        var client = await _factory.CreateSignedInClientAsync("unavailable.make@example.com");

        var response = await client.PostAsJsonAsync("/api/v1/generations", new
        {
            sketch = ApiClientExtensions.PngDataUri,
            title = "Couch",
            description = "A comfy couch",
            paths = new[] { new { path = new[] { "M5,5 L10,10" }, color = "#FF0000", size = 8 } },
        });

        await AssertUnavailableAsync(response);
        Assert.Null(_factory.Inference.LastJobId);
        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync("/api/v1/generations/active")).StatusCode);
    }

    [Fact]
    public async Task Artworks_already_made_say_their_images_are_unavailable()
    {
        var client = await _factory.CreateSignedInClientAsync("unavailable.gallery@example.com");
        var artworkId = await AddArtworkAsync(client);

        await AssertUnavailableAsync(await client.GetAsync("/api/v1/artworks"));
        await AssertUnavailableAsync(await client.GetAsync($"/api/v1/artworks/{artworkId}"));
    }

    [Fact]
    public async Task Artworks_and_accounts_can_still_be_deleted()
    {
        var client = await _factory.CreateSignedInClientAsync("unavailable.delete@example.com");
        var userId = await UserIdAsync(client);
        var deleted = await AddArtworkAsync(client);
        await AddArtworkAsync(client);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/artworks/{deleted}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsJsonAsync("/api/v1/users/me", new { password = Password })).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.Users.AnyAsync(u => u.UserId == userId));
        Assert.False(await db.Artworks.AnyAsync(a => a.UserId == userId));
    }

    private static async Task AssertUnavailableAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var problem = await response.ReadJsonAsync();
        Assert.Equal("Images are unavailable: the server's image storage isn't set up.", problem.GetProperty("title").GetString());
        Assert.Equal(ImageStorageUnavailableHandler.Code, problem.GetProperty("code").GetString());
    }

    // Stored while R2 was configured, so its images are now unreachable
    private async Task<string> AddArtworkAsync(HttpClient client)
    {
        var artwork = new Artwork
        {
            Id = Guid.NewGuid().ToString(),
            UserId = await UserIdAsync(client),
            Title = "Couch",
            SketchedImage = "users/1/sketch.png",
            AiImage = "users/1/image.webp",
        };
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Artworks.Add(artwork);
        await db.SaveChangesAsync();
        return artwork.Id;
    }

    private static async Task<int> UserIdAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();
}
