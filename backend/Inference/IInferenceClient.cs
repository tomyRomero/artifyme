namespace ArtifyMe.Inference;

// Jobs live in the inference service's memory, so a restart forgets them
public interface IInferenceClient
{
    Task<InferenceJob> SubmitAsync(byte[] sketch, string prompt, long? seed, CancellationToken cancellationToken = default);

    Task<InferenceJob?> GetAsync(string jobId, CancellationToken cancellationToken = default);

    Task CancelAsync(string jobId, CancellationToken cancellationToken = default);
}
