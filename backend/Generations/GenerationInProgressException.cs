namespace ArtifyMe.Generations;

public class GenerationInProgressException : Exception
{
    public Guid? ActiveGenerationId { get; }

    public GenerationInProgressException(Guid? activeGenerationId) : base("A generation is already in progress.")
    {
        ActiveGenerationId = activeGenerationId;
    }
}
