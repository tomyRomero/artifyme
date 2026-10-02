using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArtifyMe.Artworks;

[ApiController]
[Route("api/v1/styles")]
[AllowAnonymous]
public class StylesController : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 3600)]
    public IReadOnlyList<Style> List() => Styles.All;
}
