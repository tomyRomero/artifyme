using ArtifyMe.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Artworks;

public class GallerySearchTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public GallerySearchTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Search_matches_the_title_or_description_ignoring_case()
    {
        var client = await _factory.CreateSignedInClientAsync("search.words@example.com");
        await _factory.CreateArtworkAsync(client, title: "Red couch", description: "a comfy red couch");
        await _factory.CreateArtworkAsync(client, title: "Harbour", description: "boats at DUSK");
        await _factory.CreateArtworkAsync(client, title: "Cat", description: "a sleepy cat");

        Assert.Equal(["Red couch"], await TitlesAsync(client, "search=COUCH"));
        Assert.Equal(["Harbour"], await TitlesAsync(client, "search=dusk"));
        Assert.Empty(await TitlesAsync(client, "search=dog"));
    }

    [Fact]
    public async Task Wildcards_in_a_search_are_matched_literally()
    {
        var client = await _factory.CreateSignedInClientAsync("search.wildcards@example.com");
        await _factory.CreateArtworkAsync(client, title: "Half off", description: "a 50% off sign");
        await _factory.CreateArtworkAsync(client, title: "Plain", description: "a plain wall");

        Assert.Equal(["Half off"], await TitlesAsync(client, "search=%25"));
        Assert.Empty(await TitlesAsync(client, "search=_"));
    }

    [Fact]
    public async Task The_gallery_can_show_one_style_and_the_oldest_first()
    {
        var client = await _factory.CreateSignedInClientAsync("search.style@example.com");
        await _factory.CreateArtworkAsync(client, title: "First", style: "watercolor");
        await _factory.CreateArtworkAsync(client, title: "Second");
        await _factory.CreateArtworkAsync(client, title: "Third", style: "watercolor");

        Assert.Equal(["Third", "First"], await TitlesAsync(client, "style=watercolor"));
        Assert.Equal(["First", "Second", "Third"], await TitlesAsync(client, "sort=oldest"));
        Assert.Equal(["First"], await TitlesAsync(client, "style=watercolor&sort=oldest&pageSize=1"));
    }

    [Fact]
    public async Task Artworks_made_at_the_same_moment_page_in_a_fixed_order()
    {
        var client = await _factory.CreateSignedInClientAsync("search.ties@example.com");
        var ids = new List<string>();
        foreach (var title in new[] { "One", "Two", "Three", "Four" })
            ids.Add(await _factory.CreateArtworkAsync(client, title: title));
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sameMoment = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            await db.Artworks.Where(a => ids.Contains(a.Id!)).ExecuteUpdateAsync(a => a.SetProperty(x => x.CreationDateTime, sameMoment));
        }

        var newestPages = new List<string>();
        var oldestPages = new List<string>();
        for (var page = 1; page <= ids.Count; page++)
        {
            newestPages.AddRange(await IdsAsync(client, $"pageSize=1&page={page}"));
            oldestPages.AddRange(await IdsAsync(client, $"pageSize=1&page={page}&sort=oldest"));
        }

        Assert.Equal(ids.OrderByDescending(id => id, StringComparer.Ordinal), newestPages);
        Assert.Equal(ids.Order(StringComparer.Ordinal), oldestPages);
    }

    private static async Task<string[]> IdsAsync(HttpClient client, string query)
    {
        var page = await (await client.GetAsync($"/api/v1/artworks?{query}")).ReadJsonAsync();
        return page.GetProperty("items").EnumerateArray().Select(a => a.GetProperty("id").GetString()!).ToArray();
    }

    private static async Task<string[]> TitlesAsync(HttpClient client, string query)
    {
        var page = await (await client.GetAsync($"/api/v1/artworks?{query}")).ReadJsonAsync();
        return page.GetProperty("items").EnumerateArray().Select(a => a.GetProperty("title").GetString()!).ToArray();
    }
}
