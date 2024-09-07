using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ArtifyMe.Models.DTOs;
using ArtifyMe.Services;
using ArtifyMe.Services.Interfaces;

namespace ArtifyMe.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class S3Controller : ControllerBase
    {
        private readonly IS3Service _s3Service;

        // Inject S3Service into the controller
        public S3Controller(IS3Service s3Service)
        {
            _s3Service = s3Service;
        }

        /// Uploads an image to S3
        [HttpPost("upload")]
        public async Task<IActionResult> UploadImage([FromBody] UploadImageRequest request)
        {
            // Validate the input
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Call the service to upload the image
                var response = await _s3Service.UploadImage(request);

                // Check if the upload was successful
                if (response.Message.Contains("Error"))
                {
                    return BadRequest(response);
                }

                // Return the successful response
                return Ok(response);
            }
            catch (Exception ex)
            {
                // Handle exceptions and return a bad request with the error message
                return BadRequest(new { Message = ex.Message });
            }
        }

        /// Retrieves an image from S3
        [HttpGet("get")]
        public async Task<IActionResult> GetImage([FromQuery] string key)
        {
            // Validate that the key is provided
            if (string.IsNullOrEmpty(key))
            {
                return BadRequest(new { Message = "Image key is required." });
            }

            try
            {
                // Call the service to get the image
                var response = await _s3Service.GetImage(new GetImageRequest { Key = key });

                // Check if the response contains valid data
                if (string.IsNullOrEmpty(response.Base64ImageData))
                {
                    return NotFound(new { Message = "Image not found or could not be retrieved." });
                }

                // Return the image data and content type
                return Ok(response);
            }
            catch (Exception ex)
            {
                // Handle exceptions and return a bad request with the error message
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}