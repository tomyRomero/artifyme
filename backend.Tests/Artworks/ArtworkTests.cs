using System.Net;
using System.Net.Http.Json;

namespace ArtifyMe.Tests.Artworks;

public class ArtworkTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ArtworkTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_gallery_leaves_out_strokes_which_only_the_single_artwork_endpoint_returns_in_order()
    {
        var client = await _factory.CreateSignedInClientAsync("strokes.owner@example.com");
        var id = await _factory.CreateArtworkAsync(client);

        var galleryItem = Assert.Single((await (await client.GetAsync("/api/v1/artworks")).ReadJsonAsync()).GetProperty("items").EnumerateArray());
        var single = await (await client.GetAsync($"/api/v1/artworks/{id}")).ReadJsonAsync();

        Assert.False(galleryItem.TryGetProperty("paths", out _));
        var strokes = single.GetProperty("paths").EnumerateArray().ToList();
        Assert.Equal(["#171A21", "#FF0000"], strokes.Select(s => s.GetProperty("color").GetString()));
    }

    [Fact]
    public async Task An_edit_changes_the_words_and_nothing_else()
    {
        var client = await _factory.CreateSignedInClientAsync("editor@example.com");
        var id = await _factory.CreateArtworkAsync(client);
        var before = await _factory.StoredArtworkAsync(id);

        var response = await client.PatchAsJsonAsync($"/api/v1/artworks/{id}", new
        {
            title = "  Sofa ",
            description = "A comfier couch",
            aiImage = "someone-elses.png",
            paths = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var after = await _factory.StoredArtworkAsync(id);
        Assert.Equal(("Sofa", "A comfier couch"), (after.Title, after.Description));
        Assert.Equal(before.AiImage, after.AiImage);
        Assert.Equal(before.Paths.Count, after.Paths.Count);
    }

    [Theory]
    [InlineData("title", "")]
    [InlineData("title", "   ")]
    [InlineData("description", " ab ")]
    [InlineData("title", "a title that goes on and on and on and on and on and on and on")]
    public async Task An_edit_that_would_leave_bad_words_is_refused_and_changes_nothing(string field, string value)
    {
        var client = await _factory.CreateSignedInClientAsync($"bad.edit.{Guid.NewGuid():N}@example.com");
        var id = await _factory.CreateArtworkAsync(client, title: "Couch");

        var response = await client.PatchAsJsonAsync($"/api/v1/artworks/{id}", new Dictionary<string, string> { [field] = value });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var stored = await _factory.StoredArtworkAsync(id);
        Assert.Equal(("Couch", "A comfy couch"), (stored.Title, stored.Description));
    }

    [Fact]
    public async Task Deleted_artwork_is_gone()
    {
        var client = await _factory.CreateSignedInClientAsync("deleter@example.com");
        var id = await _factory.CreateArtworkAsync(client);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/artworks/{id}")).StatusCode);

        var response = await client.GetAsync($"/api/v1/artworks/{id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Artwork not found.", (await response.ReadJsonAsync()).GetProperty("title").GetString());
    }
}
