namespace ArtifyMe.Inference;

public class InferenceBusyException : Exception
{
    public TimeSpan RetryAfter { get; }

    public InferenceBusyException(TimeSpan retryAfter) : base("The image generation service is busy.")
    {
        RetryAfter = retryAfter;
    }
}
