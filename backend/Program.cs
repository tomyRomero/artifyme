using System.Text.Json;
using System.Text.Json.Serialization;
using ArtifyMe.Artworks;
using ArtifyMe.Auth;
using ArtifyMe.Data;
using ArtifyMe.Generations;
using ArtifyMe.Images;
using ArtifyMe.Inference;
using ArtifyMe.Notifications;
using ArtifyMe.Users;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection must be set. For local development run: " +
        "dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" " +
        "\"Server=localhost,14331;Database=ArtifyMe;User ID=sa;Password=<MSSQL_SA_PASSWORD from .env>;TrustServerCertificate=True\" --project backend");
}
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddHealthChecks().AddDbContextCheck<ApplicationDbContext>("database");

builder.Services.AddJwtAuth(builder.Configuration);
var imageStorage = builder.Services.AddImageStorage(builder.Configuration);
builder.Services.AddInferenceClient(builder.Configuration);
builder.Services.AddGenerations(builder.Configuration);
builder.Services.AddPushNotifications(builder.Configuration);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IArtworkService, ArtworkService>();
builder.Services.AddScoped<IArtworkRepository, ArtworkRepository>();

// Only browser clients need CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)));
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

if (imageStorage.Store == ImageStore.LocalFolder)
{
    app.Logger.LogInformation(
        "Images are kept in the local folder {Folder}. Set {MissingSettings} to store them in Cloudflare R2.",
        imageStorage.LocalFolder, string.Join(", ", imageStorage.MissingR2Settings));
}
else if (imageStorage.Store == ImageStore.Unavailable)
{
    app.Logger.LogWarning(
        "Image storage isn't set up, so requests that need images will answer 503. Set {MissingSettings}; see .env-example.",
        string.Join(", ", imageStorage.MissingR2Settings));
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    // Production applies migrations as a separate deploy step
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.Migrate();

    app.MapOpenApi().AllowAnonymous();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "ArtifyMe API"));
}
else
{
    // Only outside development: there, plain HTTP lets a phone on the same network reach the API
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();

// For WebApplicationFactory in the tests
public partial class Program { }
