using ArtifyMe.Models;
using ArtifyMe.Repositories;
using ArtifyMe.Repositories.Interfaces;
using ArtifyMe.Services;
using ArtifyMe.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using ArtifyMe.Utilities.Interfaces;
using OMDbProject.Utilities;
using Amazon.S3;
using Amazon.Extensions.NETCore.Setup;
using Amazon;

var builder = WebApplication.CreateBuilder(args);


// Bind JwtSettings from configuration
//GetSection() argument must match appsettings.json file
//Configure<TOptions>() automatically registers the settings object in the DI container as a singleton.
//When using IOptions<T> or IOptionsMonitor<T>, you do not need AddSingleton:
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));

// Bind AWS settings from appsettings.json
builder.Services.Configure<AwsSettings>(builder.Configuration.GetSection("AWS"));

// Extract AWS credentials and region from configuration
var awsSettings = builder.Configuration.GetSection("AWS").Get<AwsSettings>();

// Configure AWS options using the credentials from appsettings.json
var awsOptions = new AWSOptions
{
    Credentials = new Amazon.Runtime.BasicAWSCredentials(
        awsSettings.AccessKeyId, 
        awsSettings.SecretKey
    ),
    Region = RegionEndpoint.GetBySystemName(awsSettings.Region)
};

// Register AWS S3 service with configured options
builder.Services.AddDefaultAWSOptions(awsOptions);
builder.Services.AddAWSService<IAmazonS3>();

// Add services to the container.
builder.Services.AddControllers();

//CORS
builder.Services.AddCors(co =>
{
    co.AddPolicy("CORS", pb =>
    {
        pb.WithOrigins("*")
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});
//CORS

//JSON serealizer to ignore cycles
builder.Services.AddControllers()
.AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//Register dependencies
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IHasher, Hasher>();
builder.Services.AddScoped<IArtworkService, ArtworkService>();
builder.Services.AddScoped<IArtworkRepository, ArtworkRepository>();
builder.Services.AddScoped<IS3Service, S3Service>();

// Configure database context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Logging.AddConsole();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//CORS
app.UseCors("CORS"); //<-USE CORS with your policy name


app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
