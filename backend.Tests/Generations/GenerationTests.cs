using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ArtifyMe.Artworks;
using ArtifyMe.Data;
using ArtifyMe.Generations;
using ArtifyMe.Images;
using ArtifyMe.Inference;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ArtifyMe.Tests.Generations;

public class GenerationTests : IClassFixture<ApiFactory>
{
    private const string Generations = "/api/v1/generations";

    private readonly ApiFactory _factory;

    public GenerationTests(ApiFactory factory) => _factory = factory;

    private FakeInferenceClient Inference => _factory.Inference;

    [Fact]
    public async Task Starting_a_generation_queues_the_sketch_and_says_where_to_follow_it()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.start@example.com");

        var response = await client.PostAsJsonAsync(Generations, NewGeneration(seed: 42));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var generation = await response.ReadJsonAsync();
        Assert.Equal("queued", generation.GetProperty("status").GetString());
        Assert.Equal(0, generation.GetProperty("position").GetInt32());
        Assert.Equal(42, generation.GetProperty("seed").GetInt64());
        Assert.Equal("a comfy red couch", Inference.LastPrompt);
        Assert.Equal(42, Inference.LastSeed);

        var followed = await client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, followed.StatusCode);
        Assert.Equal(generation.GetProperty("id").GetString(), (await followed.ReadJsonAsync()).GetProperty("id").GetString());
    }

    [Fact]
    public async Task Progress_from_the_service_shows_up_on_the_generation()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.progress@example.com");
        var id = await StartAsync(client);

        Inference.Run(Inference.LastJobId!, step: 5, totalSteps: 21);
        await _factory.ProcessGenerationsAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("running", generation.GetProperty("status").GetString());
        Assert.Equal(5, generation.GetProperty("step").GetInt32());
        Assert.Equal(21, generation.GetProperty("totalSteps").GetInt32());
        Assert.Equal(JsonValueKind.Null, generation.GetProperty("position").ValueKind);
        Assert.Equal($"data:image/webp;base64,{Convert.ToBase64String(FakeInferenceClient.Preview)}",
            generation.GetProperty("preview").GetString());
        Assert.NotEqual(JsonValueKind.Null, generation.GetProperty("startedAt").ValueKind);
    }

    [Fact]
    public async Task A_finished_generation_saves_a_new_artwork_with_its_images_and_strokes()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.finish@example.com");
        var id = await StartAsync(client);

        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("succeeded", generation.GetProperty("status").GetString());
        var artworkId = generation.GetProperty("artworkId").GetString();

        var artwork = await (await client.GetAsync($"/api/v1/artworks/{artworkId}")).ReadJsonAsync();
        Assert.Equal("Red couch", artwork.GetProperty("title").GetString());
        Assert.Equal("a comfy red couch", artwork.GetProperty("description").GetString());
        var paths = artwork.GetProperty("paths");
        Assert.Equal(2, paths.GetArrayLength());
        Assert.Equal(JsonValueKind.Null, paths[0].GetProperty("brush").ValueKind);
        Assert.Equal("pencil", paths[1].GetProperty("brush").GetString());

        Assert.Equal(FakeInferenceClient.Image, _factory.R2.Open(artwork.GetProperty("aiImageUrl").GetString()));
        Assert.Equal(PngBytes, _factory.R2.Open(artwork.GetProperty("sketchImageUrl").GetString()));

        var gallery = await (await client.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        var card = Assert.Single(gallery.GetProperty("items").EnumerateArray());
        Assert.Equal(FakeInferenceClient.Thumbnail, _factory.R2.Open(card.GetProperty("imageUrl").GetString()));
        Assert.Equal(JsonValueKind.Null, generation.GetProperty("preview").ValueKind);
    }

    [Fact]
    public async Task The_artwork_records_how_it_was_made()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.making@example.com");
        var id = await StartAsync(client, NewGeneration(seed: 77));
        Inference.Run(Inference.LastJobId!, step: 1);
        await _factory.ProcessGenerationsAsync();
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var made = (await ArtworkOfAsync(client, id)).GetProperty("howItWasMade");

        Assert.Equal("a comfy red couch", made.GetProperty("prompt").GetString());
        Assert.Equal((FakeInferenceClient.Model, FakeInferenceClient.Device), (made.GetProperty("model").GetString(), made.GetProperty("device").GetString()));
        Assert.Equal((77, 21), (made.GetProperty("seed").GetInt64(), made.GetProperty("steps").GetInt32()));
        Assert.True(made.GetProperty("finishedAt").GetDateTime() >= made.GetProperty("startedAt").GetDateTime());
        Assert.Equal(FakeInferenceClient.Outline, _factory.R2.Open(made.GetProperty("outlineImageUrl").GetString()));
    }

    [Fact]
    public async Task A_style_adds_its_words_to_the_prompt_and_is_kept_on_the_artwork()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.style@example.com");
        var id = await StartAsync(client, NewGeneration(style: "watercolor"));
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        Assert.Equal("a comfy red couch, watercolor painting, soft washes, paper texture", Inference.LastPrompt);
        var artwork = await ArtworkOfAsync(client, id);
        Assert.Equal("watercolor", artwork.GetProperty("style").GetString());
        Assert.Equal("a comfy red couch", artwork.GetProperty("description").GetString());
        Assert.Equal(Inference.LastPrompt, artwork.GetProperty("howItWasMade").GetProperty("prompt").GetString());
    }

    [Fact]
    public async Task A_failed_upload_keeps_no_images_and_is_tried_again()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.upload@example.com");
        var userId = (await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();
        var id = await StartAsync(client);
        Inference.Succeed(Inference.LastJobId!);
        string[] Stored() => _factory.R2.Keys.Where(key => key.StartsWith($"users/{userId}/")).ToArray();

        // The image uploads, then the thumbnail fails
        var uploads = 0;
        _factory.R2.FailUpload = _ => ++uploads == 2;
        try
        {
            await _factory.ProcessGenerationsAsync();
        }
        finally
        {
            _factory.R2.FailUpload = null;
        }

        Assert.NotEqual("succeeded", (await GetAsync(client, id)).GetProperty("status").GetString());
        Assert.Single(Stored());

        await _factory.ProcessGenerationsAsync();

        Assert.Equal("succeeded", (await GetAsync(client, id)).GetProperty("status").GetString());
        Assert.Equal(4, Stored().Length);
    }

    [Fact]
    public async Task The_title_is_saved_trimmed()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.title@example.com");
        var id = await StartAsync(client, NewGeneration(title: "  Sunday couch "));
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var artwork = await ArtworkOfAsync(client, id);

        Assert.Equal("Sunday couch", artwork.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Redrawing_an_artwork_replaces_its_drawing_and_images_and_removes_the_old_files()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.redraw@example.com");
        var first = await StartAsync(client);
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();
        var artworkId = (await GetAsync(client, first)).GetProperty("artworkId").GetString()!;
        var before = await StoredArtworkAsync(artworkId);

        var redraw = await StartAsync(client, NewGeneration(description: "a blue couch", title: "Blue couch", artworkId: artworkId, paths: [Stroke("#0000FF")]));
        Inference.Succeed(Inference.LastJobId!, withThumbnail: false);
        await _factory.ProcessGenerationsAsync();

        Assert.Equal(artworkId, (await GetAsync(client, redraw)).GetProperty("artworkId").GetString());
        var artwork = await (await client.GetAsync($"/api/v1/artworks/{artworkId}")).ReadJsonAsync();
        Assert.Equal("Blue couch", artwork.GetProperty("title").GetString());
        Assert.Equal("a blue couch", artwork.GetProperty("description").GetString());
        Assert.Equal("#0000FF", Assert.Single(artwork.GetProperty("paths").EnumerateArray()).GetProperty("color").GetString());

        var after = await StoredArtworkAsync(artworkId);
        Assert.Null(after.ThumbnailImage);
        foreach (var oldImage in new[] { before.SketchedImage!, before.AiImage!, before.ThumbnailImage!, before.OutlineImage! })
            Assert.False(_factory.R2.Contains(oldImage));
        Assert.True(_factory.R2.Contains(after.SketchedImage!));
        Assert.True(_factory.R2.Contains(after.AiImage!));
        Assert.True(_factory.R2.Contains(after.OutlineImage!));

        var gallery = await (await client.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        Assert.Single(gallery.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Only_one_generation_runs_at_a_time_for_each_user()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.one@example.com");
        var first = await StartAsync(client);

        var second = await client.PostAsJsonAsync(Generations, NewGeneration());
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal(first, (await second.ReadJsonAsync()).GetProperty("activeGenerationId").GetString());

        var someoneElse = await _factory.CreateSignedInClientAsync("gen.one.other@example.com");
        Assert.Equal(HttpStatusCode.Accepted, (await someoneElse.PostAsJsonAsync(Generations, NewGeneration())).StatusCode);

        Inference.Succeed((await StoredGenerationAsync(first)).InferenceJobId!);
        await _factory.ProcessGenerationsAsync();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync(Generations, NewGeneration())).StatusCode);
    }

    [Fact]
    public async Task The_database_refuses_a_second_generation_in_progress_even_when_requests_race()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.race@example.com");
        var userId = (await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();
        Generation InProgress() => new() { UserId = userId, Title = "Race", Prompt = "race", SketchImage = "race.png" };

        using var scope = _factory.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IGenerationRepository>();

        Assert.True(await repository.TryInsertAsync(InProgress()));
        Assert.False(await repository.TryInsertAsync(InProgress()));
        // Finished generations don't count
        Assert.True(await repository.TryInsertAsync(new Generation
        { UserId = userId, Title = "Done", Prompt = "done", SketchImage = "done.png", Status = GenerationStatus.Succeeded }));
    }

    [Fact]
    public async Task The_generation_in_progress_can_be_picked_up_again()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.active@example.com");
        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync($"{Generations}/active")).StatusCode);

        var id = await StartAsync(client);
        var active = await client.GetAsync($"{Generations}/active");
        Assert.Equal(id, (await active.ReadJsonAsync()).GetProperty("id").GetString());

        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync($"{Generations}/active")).StatusCode);
    }

    [Fact]
    public async Task Cancelling_stops_the_job_and_discards_the_sketch()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.cancel@example.com");
        var id = await StartAsync(client);
        var stored = await StoredGenerationAsync(id);

        var cancelled = await client.DeleteAsync($"{Generations}/{id}");

        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal("cancelled", (await cancelled.ReadJsonAsync()).GetProperty("status").GetString());
        Assert.Contains(stored.InferenceJobId, Inference.CancelRequests);
        Assert.False(_factory.R2.Contains(stored.SketchImage));
    }

    [Fact]
    public async Task A_cancel_that_collides_with_a_progress_update_still_cancels()
    {
        // Slip a worker progress update in between the cancel's read and save
        using var api = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddScoped<IGenerationRepository>(provider => new ProgressBeforeCancelRepository(
                ActivatorUtilities.CreateInstance<GenerationRepository>(provider),
                async generationId =>
                {
                    Inference.Run(Inference.LastJobId!, step: 7);
                    using var scope = provider.GetRequiredService<IServiceScopeFactory>().CreateScope();
                    await scope.ServiceProvider.GetRequiredService<GenerationProcessor>().ProcessAsync(generationId);
                }))));
        var client = await api.CreateSignedInClientAsync("gen.cancel.race@example.com");
        var id = await StartAsync(client);

        var response = await client.DeleteAsync($"{Generations}/{id}");

        Assert.Equal("cancelled", (await response.ReadJsonAsync()).GetProperty("status").GetString());
        Assert.Contains(Inference.LastJobId, Inference.CancelRequests);
    }

    [Fact]
    public async Task A_result_that_arrives_after_cancelling_is_thrown_away()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.late@example.com");
        var id = await StartAsync(client);
        Inference.Succeed(Inference.LastJobId!);

        await client.DeleteAsync($"{Generations}/{id}");
        await _factory.ProcessGenerationsAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("cancelled", generation.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, generation.GetProperty("artworkId").ValueKind);
        var gallery = await (await client.GetAsync("/api/v1/artworks")).ReadJsonAsync();
        Assert.Empty(gallery.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Cancelling_a_finished_generation_changes_nothing()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.cancel.done@example.com");
        var id = await StartAsync(client);
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var response = await client.DeleteAsync($"{Generations}/{id}");

        Assert.Equal("succeeded", (await response.ReadJsonAsync()).GetProperty("status").GetString());
    }

    [Theory]
    [InlineData(InferenceJobError.Filtered, "filtered")]
    [InlineData(InferenceJobError.GenerationFailed, "generation_failed")]
    public async Task A_failed_job_reports_why_and_discards_the_sketch(InferenceJobError error, string reported)
    {
        var client = await _factory.CreateSignedInClientAsync($"gen.failed.{reported}@example.com");
        var id = await StartAsync(client);
        var sketch = (await StoredGenerationAsync(id)).SketchImage;

        Inference.Fail(Inference.LastJobId!, error);
        await _factory.ProcessGenerationsAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("failed", generation.GetProperty("status").GetString());
        Assert.Equal(reported, generation.GetProperty("error").GetString());
        Assert.False(_factory.R2.Contains(sketch));
    }

    [Fact]
    public async Task A_job_the_service_lost_is_reported_as_interrupted()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.lost@example.com");
        var id = await StartAsync(client);

        Inference.Forget(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("failed", generation.GetProperty("status").GetString());
        Assert.Equal("interrupted", generation.GetProperty("error").GetString());
    }

    [Fact]
    public async Task A_generation_past_the_time_limit_is_interrupted_and_stopped_on_the_service()
    {
        using var api = _factory.WithWebHostBuilder(builder => builder.UseSetting("Generation:Timeout", "00:00:00"));
        var client = await api.CreateSignedInClientAsync("gen.timeout@example.com");
        var id = await StartAsync(client);
        var jobId = Inference.LastJobId!;
        Inference.Run(jobId, step: 3);

        await api.Services.GetRequiredService<GenerationWorker>().RunOnceAsync();

        var generation = await GetAsync(client, id);
        Assert.Equal("interrupted", generation.GetProperty("error").GetString());
        Assert.Contains(jobId, Inference.CancelRequests);
    }

    [Fact]
    public async Task While_the_service_is_unreachable_a_generation_waits_and_then_catches_up()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.outage@example.com");
        var id = await StartAsync(client);
        Inference.Succeed(Inference.LastJobId!);

        try
        {
            Inference.Unreachable = true;
            await _factory.ProcessGenerationsAsync();
            Assert.Equal("queued", (await GetAsync(client, id)).GetProperty("status").GetString());
        }
        finally
        {
            Inference.Unreachable = false;
        }

        await _factory.ProcessGenerationsAsync();
        Assert.Equal("succeeded", (await GetAsync(client, id)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task A_busy_service_answers_429_with_a_retry_time_and_keeps_nothing()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.busy@example.com");
        Inference.NextSubmitError = new InferenceBusyException(TimeSpan.FromSeconds(45));

        var response = await client.PostAsJsonAsync(Generations, NewGeneration());

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal(TimeSpan.FromSeconds(45), response.Headers.RetryAfter?.Delta);
        await AssertNothingKeptAsync(client);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync(Generations, NewGeneration())).StatusCode);
    }

    [Fact]
    public async Task An_unreachable_service_answers_503_and_keeps_nothing()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.down@example.com");
        Inference.NextSubmitError = new InferenceUnavailableException("The image generation service couldn't be reached.");

        var response = await client.PostAsJsonAsync(Generations, NewGeneration());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        await AssertNothingKeptAsync(client);
    }

    [Fact]
    public async Task A_sketch_the_service_cannot_read_is_refused_with_its_reason()
    {
        var client = await _factory.CreateSignedInClientAsync("gen.unreadable@example.com");
        Inference.NextSubmitError = new InferenceRejectedException("The sketch isn't a PNG, JPEG or WebP image.");

        var response = await client.PostAsJsonAsync(Generations, NewGeneration());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("The sketch isn't a PNG, JPEG or WebP image.", (await response.ReadJsonAsync()).GetProperty("title").GetString());
        await AssertNothingKeptAsync(client);
    }

    public static TheoryData<string, object> BadRequests => new()
    {
        { "not an image", NewGeneration(sketch: "hello") },
        { "a GIF", NewGeneration(sketch: "data:image/gif;base64,R0lGODlhAQABAAAAACw=") },
        { "no strokes", NewGeneration(paths: []) },
        { "an SVG", NewGeneration(sketch: "data:image/svg+xml;base64,PHN2Zy8+") },
        { "a stroke without points", NewGeneration(paths: [new { path = Array.Empty<string>(), color = "#000", size = 4 }]) },
        { "a zero brush size", NewGeneration(paths: [new { path = new[] { "M1,1 " }, color = "#000", size = 0 }]) },
        { "an unknown brush", NewGeneration(paths: [new { path = new[] { "M1,1 " }, color = "#000", size = 4, brush = "crayon" }]) },
        { "a two-letter description", NewGeneration(description: "ab") },
        { "no title", NewGeneration(title: null) },
        { "a blank title", NewGeneration(title: "   ") },
        { "a title over 60 characters", NewGeneration(title: new string('t', 61)) },
        { "an unknown style", NewGeneration(style: "crayon") },
    };

    [Theory]
    [MemberData(nameof(BadRequests))]
    public async Task Bad_requests_are_refused_before_anything_is_stored(string problem, object request)
    {
        var client = await _factory.CreateSignedInClientAsync($"gen.bad.{problem.Replace(' ', '-')}@example.com");

        var response = await client.PostAsJsonAsync(Generations, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertNothingKeptAsync(client);
    }

    [Fact]
    public async Task Other_users_generations_and_artworks_are_off_limits()
    {
        var alice = await _factory.CreateSignedInClientAsync("gen.alice@example.com");
        var bob = await _factory.CreateSignedInClientAsync("gen.bob@example.com");
        var first = await StartAsync(alice);
        Inference.Succeed(Inference.LastJobId!);
        await _factory.ProcessGenerationsAsync();
        var artworkId = (await GetAsync(alice, first)).GetProperty("artworkId").GetString();
        var inProgress = await StartAsync(alice);

        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"{Generations}/{inProgress}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"{Generations}/{inProgress}")).StatusCode);
        Assert.Equal("queued", (await GetAsync(alice, inProgress)).GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await bob.PostAsJsonAsync(Generations, NewGeneration(artworkId: artworkId))).StatusCode);
    }

    private static readonly byte[] PngBytes = Convert.FromBase64String(ApiClientExtensions.PngDataUri.Split(',')[1]);

    private static object Stroke(string color) => new { path = new[] { "M1,1 ", "2,2 " }, color, size = 4 };

    private static object NewGeneration(string description = "a comfy red couch", string? title = "Red couch", string? artworkId = null,
        long? seed = null, string sketch = ApiClientExtensions.PngDataUri, object[]? paths = null, string? style = null) => new
        {
            sketch,
            description,
            title,
            style,
            artworkId,
            seed,
            paths = paths ?? [Stroke("#171A21"), new { path = new[] { "M5,5 " }, color = "#FF0000", size = 8, brush = "pencil" }],
        };

    private static async Task<string> StartAsync(HttpClient client, object? request = null)
    {
        var response = await client.PostAsJsonAsync(Generations, request ?? NewGeneration());
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        return (await response.ReadJsonAsync()).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> GetAsync(HttpClient client, string id)
    {
        var response = await client.GetAsync($"{Generations}/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadJsonAsync();
    }

    private static async Task<JsonElement> ArtworkOfAsync(HttpClient client, string generationId)
    {
        var artworkId = (await GetAsync(client, generationId)).GetProperty("artworkId").GetString();
        return await (await client.GetAsync($"/api/v1/artworks/{artworkId}")).ReadJsonAsync();
    }

    private async Task<Generation> StoredGenerationAsync(string id)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Generations.AsNoTracking().SingleAsync(g => g.Id == Guid.Parse(id));
    }

    private async Task<Artwork> StoredArtworkAsync(string id)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Artworks.AsNoTracking().SingleAsync(a => a.Id == id);
    }

    private sealed class ProgressBeforeCancelRepository(IGenerationRepository inner, Func<Guid, Task> progressUpdate) : IGenerationRepository
    {
        private bool _collided;

        public Task<Generation?> FindByIdAsync(Guid id, int ownerId) => inner.FindByIdAsync(id, ownerId);
        public Task<Generation?> FindByIdAsync(Guid id) => inner.FindByIdAsync(id);
        public Task<Generation?> FindActiveAsync(int ownerId) => inner.FindActiveAsync(ownerId);
        public Task<List<Guid>> ListActiveIdsAsync() => inner.ListActiveIdsAsync();
        public Task<bool> TryInsertAsync(Generation generation) => inner.TryInsertAsync(generation);
        public Task DeleteAsync(Generation generation) => inner.DeleteAsync(generation);

        public async Task<bool> TrySaveAsync(Generation generation, Artwork? createdArtwork = null)
        {
            if (!_collided && generation.Status == GenerationStatus.Cancelled)
            {
                _collided = true;
                await progressUpdate(generation.Id);
            }
            return await inner.TrySaveAsync(generation, createdArtwork);
        }
    }

    // No generation in progress, and no images left in the user's folder
    private async Task AssertNothingKeptAsync(HttpClient client)
    {
        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync($"{Generations}/active")).StatusCode);
        var userId = (await (await client.GetAsync("/api/v1/users/me")).ReadJsonAsync()).GetProperty("userId").GetInt32();
        Assert.DoesNotContain(_factory.R2.Keys, key => key.StartsWith(ImageData.OwnerFolder(userId)));
    }
}
