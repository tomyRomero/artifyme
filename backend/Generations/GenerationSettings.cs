namespace ArtifyMe.Generations;

public class GenerationSettings
{
    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(1);

    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(15);

    // Turn off on all but one instance when scaling out
    public bool WorkerEnabled { get; set; } = true;
}
