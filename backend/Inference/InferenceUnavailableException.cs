namespace ArtifyMe.Inference;

public class InferenceUnavailableException : Exception
{
    public InferenceUnavailableException(string message, Exception? innerException = null) : base(message, innerException) { }
}
