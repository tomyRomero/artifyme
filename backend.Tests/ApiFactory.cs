using Amazon.S3;
using ArtifyMe.Data;
using ArtifyMe.Generations;
using ArtifyMe.Inference;
using ArtifyMe.Notifications;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace ArtifyMe.Tests;

// Each test class gets its own API instance and SQLite database
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string JwtSecret = "test-only-signing-key-that-is-at-least-32-bytes-long";

    private readonly string _connectionString = $"Data Source=file:artifyme-tests-{Guid.NewGuid():N}?mode=memory&cache=shared";

    // In-memory SQLite lives only while a connection is open
    private readonly SqliteConnection _keepAlive;

    public FakeInferenceClient Inference { get; } = new();

    public FakeR2 R2 { get; } = new();

    public FakePushSender Push { get; } = new();

    protected virtual bool HasImageStorage => true;

    // Set by a test class to keep images in a folder instead of R2
    protected virtual string? LocalImageFolder => null;

    public ApiFactory()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // Replaced with SQLite below, but the API won't start without one
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Server=replaced-by-sqlite-in-tests");
        if (HasImageStorage)
        {
            builder.UseSetting("R2:Endpoint", FakeR2.Endpoint);
            builder.UseSetting("R2:BucketName", FakeR2.Bucket);
            builder.UseSetting("R2:AccessKeyId", FakeR2.AccessKeyId);
            builder.UseSetting("R2:SecretAccessKey", FakeR2.SecretAccessKey);
        }
        if (LocalImageFolder is not null)
        {
            builder.UseSetting("Images:LocalFolder", LocalImageFolder);
        }
        builder.UseSetting("JwtSettings:Secret", JwtSecret);
        builder.UseSetting("Inference:BaseUrl", "http://inference.test");
        // Tests run the worker themselves (ProcessGenerationsAsync) so each step is deterministic
        builder.UseSetting("Generation:WorkerEnabled", "false");
        // RateLimitTests lowers this
        builder.UseSetting("RateLimiting:AuthPermitLimit", "10000");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(_connectionString));
            services.AddSingleton<IInferenceClient>(Inference);
            services.RemoveAll<IPushSender>();
            services.AddSingleton<IPushSender>(Push);
            if (HasImageStorage)
            {
                services.RemoveAll<IAmazonS3>();
                services.AddSingleton<IAmazonS3>(R2);
            }
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.EnsureCreated();
        return host;
    }

    public Task ProcessGenerationsAsync() => Services.GetRequiredService<GenerationWorker>().RunOnceAsync();

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;

        _keepAlive.Dispose();
        R2.Dispose();
    }
}
