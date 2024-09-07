using System.Threading.Tasks; 
using ArtifyMe.Models; 
using ArtifyMe.Models.DTOs; 

namespace ArtifyMe.Services.Interfaces;
    public interface IUserService
    {
        Task<UserRegistrationResponseDTO> RegisterUserAsync(UserRegistrationDTO userRegistrationDTO);
        Task<User> GetUserByIdAsync(int id);
  
    }
