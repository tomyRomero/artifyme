using System.Threading.Tasks;
using ArtifyMe.Models.DTOs;

namespace ArtifyMe.Services.Interfaces;

    public interface IAuthService
    {
        Task<UserResponseDTO> LoginAsync(LoginDTO loginDTO);
        Task LogoutAsync();

        Task ChangePasswordAsync(ChangePasswordDTO changePasswordDTO);
    }

