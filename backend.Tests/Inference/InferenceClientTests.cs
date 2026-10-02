using System.Net;
using System.Text.Json;
using ArtifyMe.Inference;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using static ArtifyMe.Tests.StubHttpHandler;

namespace ArtifyMe.Tests.Inference;

public class InferenceClientTests
{
    private const string QueuedJob = """
        {"id": "job-1", "status": "queued", "step": 0, "total_steps": 0, "position": 2, "seed": 42,
         "error": null, "image": null, "thumbnail": null}
        """;

    [Fact]
    public async Task Submitting_sends_the_sketch_prompt_and_seed_and_reads_the_queued_job()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.Accepted, QueuedJob));
        var client = Client(service);

        var job = await client.SubmitAsync([1, 2, 3], "a red couch", 42);

        Assert.Equal(HttpMethod.Post, service.LastRequest!.Method);
        Assert.Equal("/jobs", service.LastRequest.RequestUri!.AbsolutePath);
        var body = JsonDocument.Parse(service.LastBody!).RootElement;
        Assert.Equal(Convert.ToBase64String([1, 2, 3]), body.GetProperty("sketch").GetString());
        Assert.Equal("a red couch", body.GetProperty("prompt").GetString());
        Assert.Equal(42, body.GetProperty("seed").GetInt64());

        Assert.Equal("job-1", job.Id);
        Assert.Equal(InferenceJobStatus.Queued, job.Status);
        Assert.Equal(2, job.Position);
        Assert.Equal(42, job.Seed);
    }

    [Fact]
    public async Task A_finished_job_carries_its_image_and_thumbnail_as_bytes()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.OK, $$"""
            {"id": "job-1", "status": "succeeded", "step": 21, "total_steps": 21, "position": null, "seed": 7,
             "error": null, "image": "{{Convert.ToBase64String([9, 8, 7])}}", "thumbnail": "{{Convert.ToBase64String([6, 5])}}"}
            """));

        var job = await Client(service).GetAsync("job-1");

        Assert.Equal(InferenceJobStatus.Succeeded, job!.Status);
        Assert.Equal(21, job.TotalSteps);
        Assert.Null(job.Position);
        Assert.Equal([9, 8, 7], job.Image);
        Assert.Equal([6, 5], job.Thumbnail);
    }

    [Fact]
    public async Task A_failed_job_reports_why()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.OK, """
            {"id": "job-1", "status": "failed", "step": 3, "total_steps": 21, "position": null, "seed": 7,
             "error": "generation_failed", "image": null, "thumbnail": null}
            """));

        var job = await Client(service).GetAsync("job-1");

        Assert.Equal(InferenceJobStatus.Failed, job!.Status);
        Assert.Equal(InferenceJobError.GenerationFailed, job.Error);
    }

    [Fact]
    public async Task A_job_the_service_has_forgotten_is_null()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.NotFound, """{"detail": "No such job."}"""));

        Assert.Null(await Client(service).GetAsync("job-1"));
    }

    [Fact]
    public async Task A_full_queue_is_reported_as_busy_with_the_suggested_wait()
    {
        var service = new StubHttpHandler(_ =>
        {
            var response = Json(HttpStatusCode.TooManyRequests, """{"detail": "The studio is busy. Try again shortly."}""");
            response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(45));
            return response;
        });

        var busy = await Assert.ThrowsAsync<InferenceBusyException>(() => Client(service).SubmitAsync([1], "cat", null));
        Assert.Equal(TimeSpan.FromSeconds(45), busy.RetryAfter);
    }

    [Fact]
    public async Task An_unreadable_sketch_is_rejected_with_the_services_message()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.BadRequest, """{"detail": "The sketch isn't a PNG, JPEG or WebP image."}"""));

        var rejected = await Assert.ThrowsAsync<InferenceRejectedException>(() => Client(service).SubmitAsync([1], "cat", null));
        Assert.Equal("The sketch isn't a PNG, JPEG or WebP image.", rejected.Message);
    }

    [Fact]
    public async Task An_unreachable_service_is_reported_as_unavailable()
    {
        var service = new StubHttpHandler(_ => throw new HttpRequestException("Connection refused"));

        await Assert.ThrowsAsync<InferenceUnavailableException>(() => Client(service).SubmitAsync([1], "cat", null));
        await Assert.ThrowsAsync<InferenceUnavailableException>(() => Client(service).GetAsync("job-1"));
    }

    [Fact]
    public async Task Cancelling_a_job_the_service_has_forgotten_is_not_an_error()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.NotFound, """{"detail": "No such job."}"""));

        await Client(service).CancelAsync("job-1");

        Assert.Equal(HttpMethod.Delete, service.LastRequest!.Method);
        Assert.Equal("/jobs/job-1", service.LastRequest.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task The_registered_client_uses_the_configured_address_and_api_key()
    {
        var service = new StubHttpHandler(_ => Json(HttpStatusCode.Accepted, QueuedJob));
        using var factory = new ApiFactory();
        using var api = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Inference:BaseUrl", "http://gpu.example:8000/");
            builder.UseSetting("Inference:ApiKey", "test-inference-key");
            builder.ConfigureTestServices(services =>
                services.AddHttpClient<IInferenceClient, HttpInferenceClient>().ConfigurePrimaryHttpMessageHandler(() => service));
        });

        await api.Services.GetRequiredService<IInferenceClient>().SubmitAsync([1], "cat", null);

        Assert.Equal("http://gpu.example:8000/jobs", service.LastRequest!.RequestUri!.ToString());
        Assert.Equal("test-inference-key", Assert.Single(service.LastRequest.Headers.GetValues("X-API-Key")));
    }

    private static HttpInferenceClient Client(StubHttpHandler service) => new(service.CreateHttpClient("http://inference.test/"));
}
