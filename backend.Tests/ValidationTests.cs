using System.Net;
using System.Net.Http.Json;
using ArtifyMe.Artworks;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests;

public class ValidationTests : IClassFixture<ApiFactory>
{
    private const string GoodPassword = "correct horse battery staple";
    private readonly ApiFactory _factory;

    public ValidationTests(ApiFactory factory) => _factory = factory;

    [Theory]
    [InlineData("", "User", "empty.first@example.com", GoodPassword)]
    [InlineData("Test", "   ", "blank.last@example.com", GoodPassword)]
    [InlineData("Test", "User", "not-an-email", GoodPassword)]
    [InlineData("Test", "User", "short.pw@example.com", "short")]
    public async Task Registration_rejects_invalid_input(string firstName, string lastName, string email, string password)
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/v1/users", new { firstName, lastName, email, password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Passwords_longer_than_128_characters_are_rejected()
    {
        var response = await _factory.CreateClient().RegisterAsync("long.pw@example.com", new string('x', 129));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Emails_are_matched_regardless_of_case_or_surrounding_spaces()
    {
        var client = _factory.CreateClient();
        (await client.RegisterAsync("  Mixed.Case@Example.COM ")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.OK, (await client.SignInAsync("mixed.case@example.com")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.RegisterAsync("MIXED.CASE@example.com")).StatusCode);
    }

    [Fact]
    public async Task Names_are_saved_without_surrounding_spaces()
    {
        var client = _factory.CreateClient();
        (await client.PostAsJsonAsync("/api/v1/users",
            new { firstName = "  Ada ", lastName = " Lovelace  ", email = "spaced.names@example.com", password = GoodPassword })).EnsureSuccessStatusCode();
        var tokens = await (await client.SignInAsync("spaced.names@example.com")).ReadJsonAsync();
        client.DefaultRequestHeaders.Authorization = new("Bearer", tokens.GetProperty("accessToken").GetString());

        var profile = await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync();

        Assert.Equal(("Ada", "Lovelace"), (profile.GetProperty("firstName").GetString(), profile.GetProperty("lastName").GetString()));
    }

    [Fact]
    public async Task A_new_password_must_meet_the_length_rule()
    {
        var client = await _factory.CreateSignedInClientAsync("change.short@example.com");

        var response = await client.PutAsJsonAsync("/api/v1/users/me/password", new { currentPassword = GoodPassword, newPassword = "short" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("page=0", HttpStatusCode.BadRequest)]
    [InlineData("pageSize=0", HttpStatusCode.BadRequest)]
    [InlineData("pageSize=51", HttpStatusCode.BadRequest)]
    [InlineData("pageSize=50", HttpStatusCode.OK)]
    public async Task Gallery_paging_is_bounded(string query, HttpStatusCode expected)
    {
        var client = await _factory.CreateSignedInClientAsync($"paging.{Guid.NewGuid():N}@example.com");

        var response = await client.GetAsync($"/api/v1/artworks?{query}");

        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task Unexpected_errors_return_a_generic_problem_without_internal_details()
    {
        using var failingApi = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services => services.AddScoped<IArtworkRepository, FailingArtworkRepository>()));
        var client = await failingApi.CreateSignedInClientAsync("unlucky@example.com");

        var response = await client.GetAsync("/api/v1/artworks");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("traceId", body);
        Assert.DoesNotContain(FailingArtworkRepository.InternalDetail, body);
    }

    private sealed class FailingArtworkRepository : IArtworkRepository
    {
        public const string InternalDetail = "connection string with a password in it";

        public Task<List<ArtworkSummary>> ListAsync(int ownerId, ArtworkQuery query, int skip, int take) =>
            throw new InvalidOperationException(InternalDetail);

        public Task<Artwork?> FindByIdAsync(string id, int ownerId) => throw new InvalidOperationException(InternalDetail);
        public Task UpdateArtworkAsync(Artwork artwork) => throw new InvalidOperationException(InternalDetail);
        public Task DeleteArtworkAsync(Artwork artwork) => throw new InvalidOperationException(InternalDetail);
        public Task<List<string>> GetImageKeysAsync(int ownerId) => throw new InvalidOperationException(InternalDetail);
    }
}
