namespace ArtifyMe.Inference;

public static class InferenceClientExtensions
{
    public static async Task CancelQuietlyAsync(this IInferenceClient inference, string jobId, ILogger logger)
    {
        try
        {
            await inference.CancelAsync(jobId);
        }
        catch (InferenceUnavailableException e)
        {
            logger.LogWarning(e, "Couldn't tell the image generation service to stop job {JobId}", jobId);
        }
    }
}
