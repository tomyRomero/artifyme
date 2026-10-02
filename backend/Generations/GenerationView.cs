namespace ArtifyMe.Generations;

public class GenerationView
{
    public Guid Id { get; set; }
    public GenerationStatus Status { get; set; }
    public GenerationError? Error { get; set; }
    public int Step { get; set; }
    public int TotalSteps { get; set; }
    public int? Position { get; set; }
    public long? Seed { get; set; }
    public string? ArtworkId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }

    // The latest step as a data URI, while it runs
    public string? Preview { get; set; }

    public static GenerationView From(Generation generation) => new()
    {
        Id = generation.Id,
        Status = generation.Status,
        Error = generation.Error,
        Step = generation.Step,
        TotalSteps = generation.TotalSteps,
        Position = generation.Position,
        Seed = generation.Seed,
        ArtworkId = generation.ArtworkId,
        CreatedAt = generation.CreatedAt,
        StartedAt = generation.StartedAt,
        Preview = generation.Preview is { } preview ? $"data:image/webp;base64,{Convert.ToBase64String(preview)}" : null,
    };
}
