using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ArtifyMe.Artworks;
using ArtifyMe.Data;
using ArtifyMe.Generations;
using ArtifyMe.Images;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Users;

public class AccountDeletionTests : IClassFixture<ApiFactory>
{
    private const string DeleteAccount = "/api/v1/users/me";
    private const string Password = "correct horse battery staple";

    private readonly ApiFactory _factory;

    public AccountDeletionTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Deleting_an_account_removes_its_artworks_images_and_sessions_for_good()
    {
        var (client, tokens) = await SignedInAsync("delete.all@example.com");
        var otherPhone = await (await _factory.CreateClient().SignInAsync("delete.all@example.com", installId: "install-for-tests-0002")).ReadJsonAsync();
        var userId = await UserIdAsync(client);
        var stored = await _factory.StoredArtworkAsync(await _factory.CreateArtworkAsync(client));

        var response = await client.DeleteAsJsonAsync(DeleteAccount, new { password = Password });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.False(_factory.R2.Contains(stored.SketchedImage!));
        Assert.False(_factory.R2.Contains(stored.AiImage!));
        Assert.False(_factory.R2.Contains(stored.ThumbnailImage!));
        Assert.DoesNotContain(_factory.R2.Keys, key => key.StartsWith(ImageData.OwnerFolder(userId)));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.Users.AnyAsync(u => u.UserId == userId));
        Assert.False(await db.Artworks.AnyAsync(a => a.UserId == userId));
        Assert.False(await db.Generations.AnyAsync(g => g.UserId == userId));
        Assert.False(await db.Sessions.AnyAsync(s => s.UserId == userId));

        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().RefreshAsync(RefreshToken(tokens))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().RefreshAsync(RefreshToken(otherPhone))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().SignInAsync("delete.all@example.com")).StatusCode);
    }

    [Fact]
    public async Task Images_from_before_the_per_user_folders_are_removed_too()
    {
        var (client, _) = await SignedInAsync("delete.legacy@example.com");
        var artworkId = await _factory.CreateArtworkAsync(client);
        const string legacyKey = "legacy-sketch-for-deletion.png";
        _factory.R2.Put(legacyKey, [1, 2, 3]);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var artwork = await db.Artworks.SingleAsync(a => a.Id == artworkId);
            artwork.SketchedImage = legacyKey;
            await db.SaveChangesAsync();
        }

        (await client.DeleteAsJsonAsync(DeleteAccount, new { password = Password })).EnsureSuccessStatusCode();

        Assert.False(_factory.R2.Contains(legacyKey));
    }

    [Fact]
    public async Task A_wrong_password_deletes_nothing()
    {
        var (client, _) = await SignedInAsync("delete.wrong@example.com");
        var artworkId = await _factory.CreateArtworkAsync(client);

        var response = await client.DeleteAsJsonAsync(DeleteAccount, new { password = "not the password" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("The password is incorrect.", (await response.ReadJsonAsync()).GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/artworks/{artworkId}")).StatusCode);
    }

    [Fact]
    public async Task The_password_is_required()
    {
        var (client, _) = await SignedInAsync("delete.nopassword@example.com");

        var response = await client.DeleteAsJsonAsync(DeleteAccount, new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task A_generation_in_progress_is_cancelled()
    {
        var (client, _) = await SignedInAsync("delete.painting@example.com");
        var started = await client.PostAsJsonAsync("/api/v1/generations", new
        {
            sketch = ApiClientExtensions.PngDataUri,
            title = "Couch",
            description = "A comfy couch",
            paths = new[] { new { path = new[] { "M1,1 " }, color = "#171A21", size = 4 } },
        });
        started.EnsureSuccessStatusCode();

        (await client.DeleteAsJsonAsync(DeleteAccount, new { password = Password })).EnsureSuccessStatusCode();

        Assert.Contains(_factory.Inference.LastJobId!, _factory.Inference.CancelRequests);
    }

    [Fact]
    public async Task A_generation_that_finishes_during_deletion_saves_nothing()
    {
        var (client, _) = await SignedInAsync("delete.race@example.com");
        var userId = await UserIdAsync(client);
        using var scope = _factory.Services.CreateScope();
        var generations = scope.ServiceProvider.GetRequiredService<IGenerationRepository>();
        var generation = new Generation { UserId = userId, Title = "Couch", Prompt = "couch", SketchImage = "couch.png" };
        Assert.True(await generations.TryInsertAsync(generation));

        (await client.DeleteAsJsonAsync(DeleteAccount, new { password = Password })).EnsureSuccessStatusCode();
        generation.Finish(GenerationStatus.Succeeded, null, DateTime.UtcNow);
        var artwork = new Artwork { Id = Guid.NewGuid().ToString(), UserId = userId, Title = "Couch" };

        Assert.False(await generations.TrySaveAsync(generation, artwork));
    }

    private async Task<(HttpClient Client, JsonElement Tokens)> SignedInAsync(string email)
    {
        var client = _factory.CreateClient();
        (await client.RegisterAsync(email)).EnsureSuccessStatusCode();
        var tokens = await (await client.SignInAsync(email)).ReadJsonAsync();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());
        return (client, tokens);
    }

    private static async Task<int> UserIdAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();

    private static string RefreshToken(JsonElement tokens) => tokens.GetProperty("refreshToken").GetString()!;
}
