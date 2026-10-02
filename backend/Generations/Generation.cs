using System.ComponentModel.DataAnnotations;
using ArtifyMe.Artworks;

namespace ArtifyMe.Generations;

public class Generation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public int UserId { get; set; }

    // The artwork being redrawn, or the one created when a new drawing succeeds. Not a foreign
    // key: an artwork deleted mid-generation is handled when the result arrives.
    [StringLength(64)]
    public string? ArtworkId { get; set; }

    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    // The user's words, which become the artwork's description
    [Required]
    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    [StringLength(32)]
    public string? Style { get; set; }

    // What the model reads: the description and the style's words
    [Required]
    [StringLength(1000)]
    public string Prompt { get; set; } = string.Empty;

    public ICollection<PathData> Paths { get; set; } = new List<PathData>();

    [Required]
    [StringLength(255)]
    public string SketchImage { get; set; } = string.Empty;

    [StringLength(64)]
    public string? InferenceJobId { get; set; }

    public GenerationStatus Status { get; set; } = GenerationStatus.Queued;
    public GenerationError? Error { get; set; }

    public int Step { get; set; }
    public int TotalSteps { get; set; }
    public int? Position { get; set; }
    public long? Seed { get; set; }

    // The latest step as a small WebP, while it runs
    public byte[]? Preview { get; set; }

    [StringLength(100)]
    public string? Model { get; set; }

    [StringLength(20)]
    public string? Device { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Concurrency token, so a cancel and a result racing each other can't both win
    public Guid Version { get; set; } = Guid.NewGuid();

    public bool IsActive => Status is GenerationStatus.Queued or GenerationStatus.Running;

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
        Version = Guid.NewGuid();
    }

    public void Finish(GenerationStatus status, GenerationError? error, DateTime now)
    {
        Status = status;
        Error = error;
        Position = null;
        Preview = null;
        CompletedAt = now;
        Touch(now);
    }
}

public enum GenerationStatus
{
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled
}

public enum GenerationError
{
    Filtered,
    GenerationFailed,
    // The inference service lost the job, or it ran past the timeout
    Interrupted
}
