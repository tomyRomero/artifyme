namespace ArtifyMe.Inference;

public record InferenceJob
{
    public string Id { get; init; } = string.Empty;
    public InferenceJobStatus Status { get; init; }
    public int Step { get; init; }
    public int TotalSteps { get; init; }
    public int? Position { get; init; }
    public long Seed { get; init; }
    public InferenceJobError? Error { get; init; }
    public byte[]? Image { get; init; }
    public byte[]? Thumbnail { get; init; }
    public byte[]? Outline { get; init; }
    public byte[]? Preview { get; init; }
    public string? Model { get; init; }
    public string? Device { get; init; }
}

public enum InferenceJobStatus
{
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled
}

public enum InferenceJobError
{
    Filtered,
    GenerationFailed
}
