namespace ArtifyMe.Inference;

public class InferenceRejectedException : Exception
{
    public InferenceRejectedException(string message) : base(message) { }
}
