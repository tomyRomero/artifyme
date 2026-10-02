using System.Net;

namespace ArtifyMe.Tests.Artworks;

public class StylesTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public StylesTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Anyone_can_list_the_styles_each_with_a_name_and_the_words_it_adds()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v1/styles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var styles = (await response.ReadJsonAsync()).EnumerateArray().ToList();
        Assert.NotEmpty(styles);
        Assert.Equal(styles.Count, styles.Select(style => style.GetProperty("id").GetString()).Distinct().Count());
        Assert.All(styles, style =>
        {
            Assert.False(string.IsNullOrWhiteSpace(style.GetProperty("name").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(style.GetProperty("words").GetString()));
        });
    }
}
