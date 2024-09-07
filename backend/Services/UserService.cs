using Microsoft.AspNetCore.Mvc;
using ArtifyMe.Models;
using ArtifyMe.Models.DTOs;
using ArtifyMe.Services.Interfaces;
using ArtifyMe.Repositories.Interfaces;
using ArtifyMe.Utilities.Interfaces;
using System.Security.Cryptography;
using System.Text;


namespace ArtifyMe.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IHasher _hasher;

    public UserService(IUserRepository userRepository, IHasher hasher)
    {
        _userRepository = userRepository;
        _hasher = hasher;
    }

    public async Task<UserRegistrationResponseDTO> RegisterUserAsync(UserRegistrationDTO userRegistrationDTO)
    {
        //added to handle null value
        if (userRegistrationDTO == null)
            throw new ArgumentNullException(nameof(userRegistrationDTO));

        var existingUser = await _userRepository.GetUserByUserNameAsync(userRegistrationDTO.Email);

        if (existingUser != null)
        {
            throw new Exception("Email is already taken.");
        }


        // Generate salt and hash the password using the Hasher class
        var salt = _hasher.GenerateSalt();
        var hashedPassword = _hasher.HashPassword(userRegistrationDTO.Password, salt);

        var user = new User
        {
            FirstName = userRegistrationDTO.FirstName,
            LastName = userRegistrationDTO.LastName,
            Email = userRegistrationDTO.Email,
            PasswordHash = hashedPassword,
            Salt = salt,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddUserAsync(user); //add user
        var addedUser = await _userRepository.GetUserByUserNameAsync(user.Email); //return added user details


        if (addedUser == null)
            throw new Exception("User was not added correctly.");

        return new UserRegistrationResponseDTO
        {
            UserId = addedUser.UserId,
            Email = addedUser.Email,
            FirstName = addedUser.FirstName,
            LastName = addedUser.LastName,
            CreatedAt = addedUser.CreatedAt
        };

    }


    public async Task<User> GetUserByIdAsync(int id)
    {
        return await _userRepository.GetUserByIdAsync(id);
    }




}


