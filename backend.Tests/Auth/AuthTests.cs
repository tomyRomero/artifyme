using System.Net;
using System.Net.Http.Json;

namespace ArtifyMe.Tests.Auth;

public class AuthTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public AuthTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Changing_the_password_with_the_wrong_current_password_is_a_bad_request()
    {
        var client = await _factory.CreateSignedInClientAsync("linus@example.com");

        var response = await client.PutAsJsonAsync("/api/v1/users/me/password",
            new { currentPassword = "not the password", newPassword = "a brand new password" });

        // Not 401: the user is still signed in
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("The current password is incorrect.", (await response.ReadJsonAsync()).GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _client.SignInAsync("linus@example.com")).StatusCode);
    }

    [Fact]
    public async Task Registering_returns_the_new_profile_and_where_to_find_it()
    {
        var response = await _client.RegisterAsync("grace@example.com");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("/api/v1/users/me", response.Headers.Location?.AbsolutePath);
        var profile = await response.ReadJsonAsync();
        Assert.Equal("grace@example.com", profile.GetProperty("email").GetString());
        Assert.False(profile.TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task Registering_the_same_email_twice_is_a_conflict()
    {
        (await _client.RegisterAsync("alan@example.com")).EnsureSuccessStatusCode();

        var response = await _client.RegisterAsync("alan@example.com");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
