using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ArtifyMe.Tests;

public class SecurityTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SecurityTests(ApiFactory factory) => _factory = factory;

    [Theory]
    [InlineData("GET", "/api/v1/artworks")]
    [InlineData("GET", "/api/v1/artworks/anything")]
    [InlineData("PATCH", "/api/v1/artworks/anything")]
    [InlineData("DELETE", "/api/v1/artworks/anything")]
    [InlineData("GET", "/api/v1/users/me")]
    [InlineData("PUT", "/api/v1/users/me/password")]
    [InlineData("DELETE", "/api/v1/users/me")]
    [InlineData("POST", "/api/v1/generations")]
    [InlineData("GET", "/api/v1/generations/active")]
    [InlineData("GET", "/api/v1/generations/5f0c6a52-3d1c-4b8e-9a27-6f1e2b0c9d11")]
    [InlineData("DELETE", "/api/v1/generations/5f0c6a52-3d1c-4b8e-9a27-6f1e2b0c9d11")]
    [InlineData("GET", "/api/v1/auth/sessions")]
    [InlineData("DELETE", "/api/v1/auth/sessions/5f0c6a52-3d1c-4b8e-9a27-6f1e2b0c9d11")]
    public async Task Requests_without_a_token_are_rejected(string method, string url)
    {
        var response = await _factory.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_token_signed_with_a_different_key_is_rejected()
    {
        var forged = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = "artifyme-api",
            Audience = "artifyme-app",
            Claims = new Dictionary<string, object> { ["sub"] = "1", ["email"] = "someone@example.com" },
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes("an-attackers-key-that-is-also-32-bytes-long")),
                SecurityAlgorithms.HmacSha256),
        });
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);

        var response = await client.GetAsync("/api/v1/artworks");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Artworks_belong_to_the_signed_in_user_even_if_the_body_names_someone_else()
    {
        var alice = await _factory.CreateSignedInClientAsync("alice.owner@example.com");
        var bob = await _factory.CreateSignedInClientAsync("bob.owner@example.com");
        var bobsId = (await (await bob.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();

        (await alice.PostAsJsonAsync("/api/v1/generations", new
        {
            sketch = ApiClientExtensions.PngDataUri,
            title = "Couch",
            description = "Alice's couch",
            paths = new[] { new { path = new[] { "M1,1 " }, color = "#000000", size = 4 } },
            userId = bobsId,
            userEmail = "bob.owner@example.com",
        })).EnsureSuccessStatusCode();
        _factory.Inference.Succeed(_factory.Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var alicesGallery = await (await alice.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        var bobsGallery = await (await bob.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        Assert.Single(alicesGallery.GetProperty("items").EnumerateArray());
        Assert.Empty(bobsGallery.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Users_cannot_read_edit_or_delete_someone_elses_artwork()
    {
        var alice = await _factory.CreateSignedInClientAsync("alice.art@example.com");
        var bob = await _factory.CreateSignedInClientAsync("bob.art@example.com");
        var id = await _factory.CreateArtworkAsync(alice, title: "Private");

        var read = await bob.GetAsync($"/api/v1/artworks/{id}");
        var edit = await bob.PatchAsJsonAsync($"/api/v1/artworks/{id}", new { title = "Defaced" });
        var delete = await bob.DeleteAsync($"/api/v1/artworks/{id}");

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, edit.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        var stillThere = await (await alice.GetAsync($"/api/v1/artworks/{id}")).ReadJsonAsync();
        Assert.Equal("Private", stillThere.GetProperty("title").GetString());
    }

    [Fact]
    public async Task The_profile_endpoint_returns_only_your_own_profile_without_password_data()
    {
        var client = await _factory.CreateSignedInClientAsync("profile@example.com");

        var response = await client.GetAsync("/api/v1/users/me");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("profile@example.com", body);
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("salt", body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/users/1")).StatusCode);
    }

    [Fact]
    public async Task Changing_a_password_only_affects_the_signed_in_user()
    {
        var alice = await _factory.CreateSignedInClientAsync("alice.pw@example.com", "alice's old password");
        await _factory.CreateSignedInClientAsync("bob.pw@example.com", "bob's password");

        var change = await alice.PutAsJsonAsync("/api/v1/users/me/password",
            new { email = "bob.pw@example.com", currentPassword = "alice's old password", newPassword = "alice's new password" });
        change.EnsureSuccessStatusCode();

        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await anonymous.SignInAsync("alice.pw@example.com", "alice's new password")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonymous.SignInAsync("bob.pw@example.com", "bob's password")).StatusCode);
    }
}
