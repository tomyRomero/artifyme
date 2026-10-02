using ArtifyMe.Artworks;
using ArtifyMe.Auth;
using ArtifyMe.Inference;
using Microsoft.AspNetCore.Mvc;

namespace ArtifyMe.Generations;

[ApiController]
[Route("api/v1/generations")]
public class GenerationsController : ControllerBase
{
    private readonly IGenerationService _generations;
    private readonly ILogger<GenerationsController> _logger;

    public GenerationsController(IGenerationService generations, ILogger<GenerationsController> logger)
    {
        _generations = generations;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Start([FromBody] GenerationRequest request)
    {
        try
        {
            var generation = await _generations.StartAsync(request, User.GetUserId());
            if (generation is null)
                return Problem(statusCode: StatusCodes.Status404NotFound, title: "Artwork not found.");

            return AcceptedAtAction(nameof(Get), new { id = generation.Id }, generation);
        }
        catch (InvalidArtworkException e)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: e.Message);
        }
        catch (InferenceRejectedException e)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: e.Message);
        }
        catch (GenerationInProgressException e)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: e.Message,
                extensions: new Dictionary<string, object?> { ["activeGenerationId"] = e.ActiveGenerationId });
        }
        catch (InferenceBusyException e)
        {
            Response.Headers.RetryAfter = ((int)Math.Ceiling(e.RetryAfter.TotalSeconds)).ToString();
            return Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "The studio is busy right now. Try again in a minute.");
        }
        catch (InferenceUnavailableException e)
        {
            _logger.LogWarning(e, "Couldn't start a generation");
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Image generation is unavailable right now. Try again shortly.");
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var generation = await _generations.GetAsync(id, User.GetUserId());
        return generation is null ? GenerationNotFound() : Ok(generation);
    }

    // 204 when nothing is in progress
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var generation = await _generations.GetActiveAsync(User.GetUserId());
        return generation is null ? NoContent() : Ok(generation);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var generation = await _generations.CancelAsync(id, User.GetUserId());
        return generation is null ? GenerationNotFound() : Ok(generation);
    }

    private ObjectResult GenerationNotFound() =>
        Problem(statusCode: StatusCodes.Status404NotFound, title: "Generation not found.");
}
