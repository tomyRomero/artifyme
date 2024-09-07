using Microsoft.AspNetCore.Mvc;
using ArtifyMe.Models;
using ArtifyMe.Services.Interfaces;
using ArtifyMe.Models.DTOs;
using System.Threading.Tasks;

namespace ArtifyMe.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {

        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO loginDTO)
        {
            // Validate the input
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Authenticate and get JWT
                var userResponseDTO = await _authService.LoginAsync(loginDTO);                

                // Return the JWT inside a user response DTO
                return Ok(userResponseDTO);
            }
            catch (Exception ex)
            {
                // Handle any authentication errors
                return Unauthorized(new { Message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
             try
            {
                // Invalidate the current user's JWT
                await _authService.LogoutAsync();

                // Return success
                return Ok(new { Message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                // Handle any errors during logout
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPatch("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDTO changePasswordDTO)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _authService.ChangePasswordAsync(changePasswordDTO);
                return Ok(new { Message = "Password changed successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
