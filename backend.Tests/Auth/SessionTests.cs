using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ArtifyMe.Auth;
using ArtifyMe.Data;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ArtifyMe.Tests.Auth;

public class SessionTests : IClassFixture<ApiFactory>
{
    private const string Sessions = "/api/v1/auth/sessions";

    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public SessionTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Signing_in_returns_a_short_lived_access_token_and_a_refresh_token()
    {
        await RegisterAsync("sess.signin@example.com");

        var response = await _client.SignInAsync("sess.signin@example.com");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        var tokens = await response.ReadJsonAsync();
        var accessToken = new JsonWebToken(tokens.GetProperty("accessToken").GetString());
        Assert.Equal(tokens.GetProperty("sessionId").GetString(), accessToken.GetClaim("sid").Value);
        Assert.InRange(accessToken.ValidTo - accessToken.IssuedAt, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(15));
        Assert.False(string.IsNullOrEmpty(tokens.GetProperty("refreshToken").GetString()));
        Assert.Equal(HttpStatusCode.OK, (await ClientWith(tokens).GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Theory]
    [InlineData("sess.wrong@example.com", "not the password")]
    [InlineData("nobody@example.com", "correct horse battery staple")]
    public async Task A_wrong_password_and_an_unknown_email_get_the_same_answer(string email, string password)
    {
        await RegisterAsync("sess.wrong@example.com");

        var response = await _client.SignInAsync(email, password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Invalid email or password.", (await response.ReadJsonAsync()).GetProperty("title").GetString());
    }

    [Fact]
    public async Task A_refresh_token_is_exchanged_for_new_tokens_that_work()
    {
        var first = await SignInAsync("sess.refresh@example.com");

        var response = await _client.RefreshAsync(first.GetProperty("refreshToken").GetString()!);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var second = await response.ReadJsonAsync();
        Assert.Equal(first.GetProperty("sessionId").GetString(), second.GetProperty("sessionId").GetString());
        Assert.NotEqual(first.GetProperty("refreshToken").GetString(), second.GetProperty("refreshToken").GetString());
        Assert.Equal(HttpStatusCode.OK, (await ClientWith(second).GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(second.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task A_refresh_token_presented_again_after_its_exchange_ends_the_session()
    {
        var first = await SignInAsync("sess.replay@example.com");
        var second = await (await _client.RefreshAsync(first.GetProperty("refreshToken").GetString()!)).ReadJsonAsync();

        // Someone kept a copy of the first token
        var replay = await _client.RefreshAsync(first.GetProperty("refreshToken").GetString()!);

        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
        // The newest token is revoked too
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.RefreshAsync(second.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task Two_refreshes_racing_with_one_token_end_the_session()
    {
        var tokens = await SignInAsync("sess.race@example.com");
        var refreshToken = tokens.GetProperty("refreshToken").GetString()!;

        // Another refresh exchanges the token between this one's read and save
        using var api = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddScoped<ISessionRepository>(provider => new ExchangedByAnotherRefreshRepository(
                ActivatorUtilities.CreateInstance<SessionRepository>(provider),
                provider.GetRequiredService<IServiceScopeFactory>()))));

        var response = await api.CreateClient().RefreshAsync(refreshToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(await IsActiveAsync(tokens));
    }

    [Fact]
    public async Task Signing_out_ends_the_session_without_an_access_token()
    {
        var tokens = await SignInAsync("sess.signout@example.com");

        var response = await _client.SignOutAsync(tokens.GetProperty("refreshToken").GetString()!);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.RefreshAsync(tokens.GetProperty("refreshToken").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SignOutAsync(tokens.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task Signing_in_again_on_the_same_install_replaces_its_session()
    {
        var first = await SignInAsync("sess.reinstall@example.com");
        var again = await (await _client.SignInAsync("sess.reinstall@example.com")).ReadJsonAsync();
        var otherPhone = await (await _client.SignInAsync("sess.reinstall@example.com", installId: "install-for-tests-0002")).ReadJsonAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.RefreshAsync(first.GetProperty("refreshToken").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(again.GetProperty("refreshToken").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(otherPhone.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task The_list_shows_each_signed_in_device_and_marks_this_one()
    {
        var thisPhone = await SignInAsync("sess.list@example.com");
        var otherPhone = await (await _client.SignInAsync("sess.list@example.com", installId: "install-for-tests-0002")).ReadJsonAsync();
        var signedOut = await (await _client.SignInAsync("sess.list@example.com", installId: "install-for-tests-0003")).ReadJsonAsync();
        await _client.SignOutAsync(signedOut.GetProperty("refreshToken").GetString()!);

        var list = (await (await ClientWith(thisPhone).GetAsync(Sessions)).ReadJsonAsync()).EnumerateArray().ToList();

        Assert.Equal(2, list.Count);
        var current = Assert.Single(list, s => s.GetProperty("current").GetBoolean());
        Assert.Equal(thisPhone.GetProperty("sessionId").GetString(), current.GetProperty("id").GetString());
        Assert.Contains(list, s => s.GetProperty("id").GetString() == otherPhone.GetProperty("sessionId").GetString());
        Assert.Equal("ios", current.GetProperty("platform").GetString());
        Assert.Equal("1.0.0", current.GetProperty("appVersion").GetString());
    }

    [Fact]
    public async Task Signing_out_another_device_ends_its_session()
    {
        var thisPhone = await SignInAsync("sess.remote@example.com");
        var otherPhone = await (await _client.SignInAsync("sess.remote@example.com", installId: "install-for-tests-0002")).ReadJsonAsync();

        var response = await ClientWith(thisPhone).DeleteAsync($"{Sessions}/{otherPhone.GetProperty("sessionId").GetString()}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.RefreshAsync(otherPhone.GetProperty("refreshToken").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(thisPhone.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task Another_users_session_cannot_be_signed_out()
    {
        var alice = await SignInAsync("sess.alice@example.com");
        var bob = await SignInAsync("sess.bob@example.com");

        var response = await ClientWith(alice).DeleteAsync($"{Sessions}/{bob.GetProperty("sessionId").GetString()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(bob.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task Changing_the_password_ends_the_other_sessions_and_keeps_this_one()
    {
        var thisPhone = await SignInAsync("sess.password@example.com");
        var otherPhone = await (await _client.SignInAsync("sess.password@example.com", installId: "install-for-tests-0002")).ReadJsonAsync();

        var change = await ClientWith(thisPhone).PutAsJsonAsync("/api/v1/users/me/password",
            new { currentPassword = "correct horse battery staple", newPassword = "a brand new password" });

        change.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await _client.RefreshAsync(thisPhone.GetProperty("refreshToken").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.RefreshAsync(otherPhone.GetProperty("refreshToken").GetString()!)).StatusCode);
    }

    [Fact]
    public async Task An_expired_refresh_token_is_refused()
    {
        var tokens = await SignInAsync("sess.expired@example.com");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var sessionId = Guid.Parse(tokens.GetProperty("sessionId").GetString()!);
            await db.RefreshTokens.Where(t => t.SessionId == sessionId)
                .ExecuteUpdateAsync(t => t.SetProperty(x => x.ExpiresAt, DateTime.UtcNow.AddMinutes(-1)));
        }

        var response = await _client.RefreshAsync(tokens.GetProperty("refreshToken").GetString()!);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_made_up_refresh_token_is_refused()
    {
        var response = await _client.RefreshAsync(Convert.ToBase64String(new byte[64]));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task RegisterAsync(string email)
    {
        var response = await _client.RegisterAsync(email);
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.Conflict);
    }

    private async Task<JsonElement> SignInAsync(string email)
    {
        await RegisterAsync(email);
        var response = await _client.SignInAsync(email);
        response.EnsureSuccessStatusCode();
        return await response.ReadJsonAsync();
    }

    private HttpClient ClientWith(JsonElement tokens)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());
        return client;
    }

    private async Task<bool> IsActiveAsync(JsonElement tokens)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var session = await db.Sessions.SingleAsync(s => s.Id == Guid.Parse(tokens.GetProperty("sessionId").GetString()!));
        return session.IsActive;
    }

    // Exchanges the token right after this request reads it
    private sealed class ExchangedByAnotherRefreshRepository(ISessionRepository inner, IServiceScopeFactory scopes) : ISessionRepository
    {
        public Task<Session?> FindActiveAsync(Guid id, int ownerId) => inner.FindActiveAsync(id, ownerId);
        public Task<Session?> FindActiveByInstallAsync(int ownerId, string installId) => inner.FindActiveByInstallAsync(ownerId, installId);
        public Task<List<Session>> ListActiveAsync(int ownerId) => inner.ListActiveAsync(ownerId);
        public Task CreateAsync(Session session, RefreshToken firstToken, Session? replaces, DateTime now) =>
            inner.CreateAsync(session, firstToken, replaces, now);
        public Task RevokeAsync(Session session, DateTime now) => inner.RevokeAsync(session, now);
        public Task SetPushTokenAsync(Session session, string? pushToken) => inner.SetPushTokenAsync(session, pushToken);
        public Task<List<string>> ListPushTokensAsync(int ownerId) => inner.ListPushTokensAsync(ownerId);
        public Task ForgetPushTokensAsync(IReadOnlyCollection<string> pushTokens) => inner.ForgetPushTokensAsync(pushTokens);
        public Task<bool> TrySaveAsync() => inner.TrySaveAsync();

        public async Task<RefreshToken?> FindTokenAsync(string tokenHash)
        {
            var token = await inner.FindTokenAsync(tokenHash);
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.RefreshTokens.Where(t => t.TokenHash == tokenHash)
                .ExecuteUpdateAsync(t => t.SetProperty(x => x.RevokedAt, DateTime.UtcNow));
            return token;
        }
    }
}
