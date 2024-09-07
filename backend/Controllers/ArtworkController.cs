using Microsoft.AspNetCore.Mvc;
using ArtifyMe.Services;
using ArtifyMe.Models;
using ArtifyMe.Models.DTOs;
using System.Threading.Tasks;
using ArtifyMe.Services.Interfaces;

namespace ArtifyMe.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ArtworkController : ControllerBase
    {
        private readonly IArtworkService _artworkService;

        public ArtworkController(IArtworkService artworkService)
        {
            _artworkService = artworkService;
        }

        [HttpPost]
        public async Task<IActionResult> SaveArtwork([FromBody] ArtworkRequest request)
        {
            // Validate the request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return await _artworkService.SaveArtwork(request);
        }

        [HttpGet("artworks")]
        public async Task<IActionResult> GetArtworksWithPagination(
            [FromQuery] string userEmail,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
         
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return BadRequest(new PageResponse
                {
                    Message = "User email must be provided.",
                    IsNext = false,
                    Content = new List<Artwork>()
                });
            }

    // Call the service layer to get paginated artworks
    var response = await _artworkService.GetArtworksWithPagination(pageNumber, pageSize, userEmail);

    // Return the response as-is, ensuring IsNext and Content are preserved
    return response;
}


        [HttpGet("artwork")]
        public async Task<IActionResult> GetArtworkById([FromQuery] string id)
        {
            return await _artworkService.GetArtworkById(id);
        }

        [HttpDelete("artwork")]
        public async Task<IActionResult> DeleteArtworkById([FromQuery] string id)
        {
            return await _artworkService.DeleteArtwork(id);
        }

        [HttpPatch("artwork")]
        public async Task<IActionResult> UpdateArtwork([FromQuery] string id, [FromBody] ArtworkRequest request)
        {
            // Validate the request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return await _artworkService.UpdateArtwork(id, request);
        }
    }
}