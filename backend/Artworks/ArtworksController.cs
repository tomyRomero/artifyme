using ArtifyMe.Auth;
using Microsoft.AspNetCore.Mvc;

namespace ArtifyMe.Artworks;

[ApiController]
[Route("api/v1/artworks")]
public class ArtworksController : ControllerBase
{
    private readonly IArtworkService _artworks;

    public ArtworksController(IArtworkService artworks)
    {
        _artworks = artworks;
    }

    [HttpGet]
    public async Task<ArtworkPage> List([FromQuery] ArtworkQuery query) =>
        await _artworks.ListAsync(query, User.GetUserId());

    [HttpGet("{id}")]
    public async Task<ActionResult<ArtworkDetail>> Get(string id)
    {
        var artwork = await _artworks.GetAsync(id, User.GetUserId());
        if (artwork is null)
            return ArtworkNotFound();
        return artwork;
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(string id, ArtworkUpdateRequest request) =>
        await _artworks.UpdateAsync(id, request, User.GetUserId()) ? NoContent() : ArtworkNotFound();

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id) =>
        await _artworks.DeleteAsync(id, User.GetUserId()) ? NoContent() : ArtworkNotFound();

    private ObjectResult ArtworkNotFound() =>
        Problem(statusCode: StatusCodes.Status404NotFound, title: "Artwork not found.");
}
