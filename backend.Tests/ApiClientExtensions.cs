using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ArtifyMe.Artworks;
using ArtifyMe.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests;

public static class ApiClientExtensions
{
    // 1x1 transparent PNG
    public const string PngDataUri =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    public static Task<HttpResponseMessage> RegisterAsync(this HttpClient client, string email, string password = "correct horse battery staple") =>
        client.PostAsJsonAsync("/api/v1/users", new { firstName = "Test", lastName = "User", email, password });

    public static Task<HttpResponseMessage> SignInAsync(this HttpClient client, string email,
        string password = "correct horse battery staple", string installId = "install-for-tests-0001") =>
        client.PostAsJsonAsync("/api/v1/auth/sessions", new { email, password, installId, platform = "ios", appVersion = "1.0.0" });

    public static Task<HttpResponseMessage> RefreshAsync(this HttpClient client, string refreshToken) =>
        client.PostAsJsonAsync("/api/v1/auth/sessions/refresh", new { refreshToken });

    public static Task<HttpResponseMessage> SignOutAsync(this HttpClient client, string refreshToken) =>
        client.PostAsJsonAsync("/api/v1/auth/sessions/sign-out", new { refreshToken });

    public static Task<HttpResponseMessage> DeleteAsJsonAsync<T>(this HttpClient client, string url, T body) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, url) { Content = JsonContent.Create(body) });

    public static async Task<JsonElement> ReadJsonAsync(this HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    public static async Task<HttpClient> CreateSignedInClientAsync(this WebApplicationFactory<Program> factory, string email, string password = "correct horse battery staple")
    {
        var client = factory.CreateClient();
        (await client.RegisterAsync(email, password)).EnsureSuccessStatusCode();
        var tokens = await (await client.SignInAsync(email, password)).ReadJsonAsync();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    public static async Task<string> StartGenerationAsync(this HttpClient client, string title = "Couch",
        string description = "A comfy couch", string? style = null)
    {
        var started = await client.PostAsJsonAsync("/api/v1/generations", new
        {
            sketch = PngDataUri,
            title,
            description,
            style,
            paths = new[]
            {
                new { path = new[] { "M1,1 ", "2,2 " }, color = "#171A21", size = 4 },
                new { path = new[] { "M5,5 " }, color = "#FF0000", size = 8 },
            },
        });
        started.EnsureSuccessStatusCode();
        return (await started.ReadJsonAsync()).GetProperty("id").GetString()!;
    }

    public static async Task<string> CreateArtworkAsync(this ApiFactory factory, HttpClient client, string title = "Couch",
        bool withThumbnail = true, string description = "A comfy couch", string? style = null)
    {
        var generationId = await client.StartGenerationAsync(title, description, style);

        factory.Inference.Succeed(factory.Inference.LastJobId!, withThumbnail);
        await factory.ProcessGenerationsAsync();

        var generation = await (await client.GetAsync($"/api/v1/generations/{generationId}")).ReadJsonAsync();
        return generation.GetProperty("artworkId").GetString()!;
    }

    public static async Task<Artwork> StoredArtworkAsync(this WebApplicationFactory<Program> factory, string artworkId)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Artworks
            .AsNoTracking()
            .SingleAsync(a => a.Id == artworkId);
    }
}
