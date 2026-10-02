using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArtifyMe.Images;

// Serves images from the local folder. The link's signature is the permission, so no sign-in is needed.
[ApiController]
[AllowAnonymous]
[Route("api/v1/images")]
public class ImagesController : ControllerBase
{
    private readonly IImageStorage _imageStorage;
    private readonly ImageUrlSigner _signer;

    public ImagesController(IImageStorage imageStorage, ImageUrlSigner signer)
    {
        _imageStorage = imageStorage;
        _signer = signer;
    }

    [HttpGet("{**key}")]
    public IActionResult Get(string key, [FromQuery] long expires, [FromQuery] string? sig)
    {
        if (_imageStorage is not LocalImageStorage local)
            return NotFound();
        if (!_signer.IsValid(key, expires, sig))
            return StatusCode(StatusCodes.Status403Forbidden);

        var stream = local.OpenRead(key);
        if (stream is null || !ImageData.TryGetContentType(key, out var contentType))
        {
            stream?.Dispose();
            return NotFound();
        }

        Response.Headers.CacheControl = "private, max-age=3600";
        return File(stream, contentType);
    }
}
