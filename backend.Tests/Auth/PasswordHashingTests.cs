using System.Net;
using System.Security.Cryptography;
using System.Text;
using ArtifyMe.Data;
using ArtifyMe.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Auth;

public class PasswordHashingTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PasswordHashingTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task New_accounts_are_stored_as_PBKDF2_hashes_with_at_least_100k_iterations()
    {
        (await _factory.CreateClient().RegisterAsync("fresh@example.com")).EnsureSuccessStatusCode();

        var user = await FindUserAsync("fresh@example.com");

        Assert.Null(user.Salt);
        var hash = Convert.FromBase64String(user.PasswordHash!);
        Assert.Equal(0x01, hash[0]); // ASP.NET Core Identity V3 format marker
        var iterations = (hash[5] << 24) | (hash[6] << 16) | (hash[7] << 8) | hash[8];
        Assert.True(iterations >= 100_000, $"Expected at least 100,000 iterations, found {iterations}");
    }

    [Fact]
    public async Task An_account_with_the_old_hash_can_log_in_and_is_upgraded_to_PBKDF2()
    {
        await SeedLegacyUserAsync("legacy@example.com", "old password");
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.SignInAsync("legacy@example.com", "old password")).StatusCode);

        var user = await FindUserAsync("legacy@example.com");
        Assert.Null(user.Salt);
        Assert.Equal(0x01, Convert.FromBase64String(user.PasswordHash!)[0]);
        Assert.Equal(HttpStatusCode.OK, (await client.SignInAsync("legacy@example.com", "old password")).StatusCode);
    }

    [Fact]
    public async Task A_wrong_password_for_an_old_account_is_rejected_and_nothing_changes()
    {
        var legacyHash = await SeedLegacyUserAsync("legacy.wrong@example.com", "right password");

        var response = await _factory.CreateClient().SignInAsync("legacy.wrong@example.com", "wrong password");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(legacyHash, (await FindUserAsync("legacy.wrong@example.com")).PasswordHash);
    }

    // A user stored with the legacy HMAC-SHA512 hash and salt
    private async Task<string> SeedLegacyUserAsync(string email, string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        using var hmac = new HMACSHA512(salt);
        var hash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(password)));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new User { FirstName = "Old", LastName = "Account", Email = email, PasswordHash = hash, Salt = Convert.ToBase64String(salt), CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return hash;
    }

    private async Task<User> FindUserAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Users.AsNoTracking().SingleAsync(u => u.Email == email);
    }
}
