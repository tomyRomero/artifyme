using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ArtifyMe.Images;

public class ImageStorageUnavailableHandler : IExceptionHandler
{
    public const string Code = "image_storage_unavailable";

    private readonly IProblemDetailsService _problemDetails;

    public ImageStorageUnavailableHandler(IProblemDetailsService problemDetails) => _problemDetails = problemDetails;

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ImageStorageUnavailableException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        return await _problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = exception.Message,
                Extensions = { ["code"] = Code },
            },
        });
    }
}
