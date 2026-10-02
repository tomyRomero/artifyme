using System.Collections.Concurrent;
using ArtifyMe.Inference;

namespace ArtifyMe.Tests;

public class FakeInferenceClient : IInferenceClient
{
    public static readonly byte[] Image = [0x52, 0x49, 0x46, 0x46, 1, 2, 3];
    public static readonly byte[] Thumbnail = [0x52, 0x49, 0x46, 0x46, 4, 5];
    public static readonly byte[] Outline = [0x52, 0x49, 0x46, 0x46, 6];
    public static readonly byte[] Preview = [0x52, 0x49, 0x46, 0x46, 7];
    public const string Model = "Test model";
    public const string Device = "mps";

    private readonly ConcurrentDictionary<string, InferenceJob> _jobs = new();

    // Thrown once, by the next SubmitAsync
    public Exception? NextSubmitError { get; set; }

    // Every call fails as if the service were down
    public bool Unreachable { get; set; }

    public string? LastJobId { get; private set; }
    public string? LastPrompt { get; private set; }
    public long? LastSeed { get; private set; }
    public ConcurrentBag<string> CancelRequests { get; } = [];

    public Task<InferenceJob> SubmitAsync(byte[] sketch, string prompt, long? seed, CancellationToken cancellationToken = default)
    {
        ThrowIfUnreachable();
        if (NextSubmitError is { } error)
        {
            NextSubmitError = null;
            throw error;
        }

        var job = new InferenceJob { Id = Guid.NewGuid().ToString("N"), Status = InferenceJobStatus.Queued, Position = 0, Seed = seed ?? 1234 };
        _jobs[job.Id] = job;
        (LastJobId, LastPrompt, LastSeed) = (job.Id, prompt, seed);
        return Task.FromResult(job);
    }

    public Task<InferenceJob?> GetAsync(string jobId, CancellationToken cancellationToken = default)
    {
        ThrowIfUnreachable();
        return Task.FromResult(_jobs.GetValueOrDefault(jobId));
    }

    public Task CancelAsync(string jobId, CancellationToken cancellationToken = default)
    {
        ThrowIfUnreachable();
        CancelRequests.Add(jobId);
        if (_jobs.TryGetValue(jobId, out var job) && job.Status is InferenceJobStatus.Queued or InferenceJobStatus.Running)
            _jobs[jobId] = job with { Status = InferenceJobStatus.Cancelled, Position = null };
        return Task.CompletedTask;
    }

    public void Run(string jobId, int step, int totalSteps = 21) =>
        _jobs[jobId] = _jobs[jobId] with
        {
            Status = InferenceJobStatus.Running,
            Step = step,
            TotalSteps = totalSteps,
            Position = null,
            Preview = Preview,
            Model = Model,
            Device = Device,
        };

    public void Succeed(string jobId, bool withThumbnail = true) =>
        _jobs[jobId] = _jobs[jobId] with
        {
            Status = InferenceJobStatus.Succeeded,
            Step = 21,
            TotalSteps = 21,
            Position = null,
            Image = Image,
            Thumbnail = withThumbnail ? Thumbnail : null,
            Outline = Outline,
            Preview = null,
            Model = Model,
            Device = Device,
        };

    public void Fail(string jobId, InferenceJobError error) =>
        _jobs[jobId] = _jobs[jobId] with { Status = InferenceJobStatus.Failed, Error = error, Position = null };

    // As if the service restarted and lost its jobs
    public void Forget(string jobId) => _jobs.TryRemove(jobId, out _);

    private void ThrowIfUnreachable()
    {
        if (Unreachable)
            throw new InferenceUnavailableException("The image generation service couldn't be reached.");
    }
}
