using System;
using System.Threading.Tasks;
using ArtifyMe.Models.DTOs;
using ArtifyMe.Services.Interfaces;
using ArtifyMe.Repositories.Interfaces;
using ArtifyMe.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using ArtifyMe.Utilities;
using ArtifyMe.Utilities.Interfaces;

namespace ArtifyMe.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IHasher _hasher;

    public AuthService(IUserRepository userRepository, IHasher hasher)
    {
        _userRepository = userRepository;
        _hasher = hasher;
    }


    public async Task<UserResponseDTO> LoginAsync(LoginDTO loginDTO)
    {
        // Retrieve the user from the database
        var user = await _userRepository.GetUserByUserNameAsync(loginDTO.Email);


        if (user == null)
        {
            // User does not exist
            throw new UnauthorizedAccessException("Invalid username or password.");
        }


        // Retrieve the stored password hash and salt
        var storedHash = user.PasswordHash;
        var storedSalt = user.Salt;

        // Verify the provided password
        if (!_hasher.VerifyPassword(loginDTO.Password, storedHash, storedSalt))
        {
            // Password does not match
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        //Generate and return JWT token if password is correct

        var JwtToken = _hasher.GenerateJwtToken(user);


        return new UserResponseDTO
        {
            UserId = user.UserId,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            CreatedAt = user.CreatedAt,
            Token = JwtToken
        };
    }


    public Task LogoutAsync()
    {

        //Invalidate the current user's JWT on the client side
        return Task.CompletedTask;
    }

    public async Task ChangePasswordAsync(ChangePasswordDTO changePasswordDTO)
{
    // Retrieve the user from the database using their email
    var user = await _userRepository.GetUserByUserNameAsync(changePasswordDTO.Email);

    if (user == null)
    {
        // Throw an error if the user does not exist
        throw new UnauthorizedAccessException("User not found.");
    }

    // Verify the current password with the stored hash and salt
    if (!_hasher.VerifyPassword(changePasswordDTO.CurrentPassword, user.PasswordHash, user.Salt))
    {
        // Throw an error if the current password does not match
        throw new UnauthorizedAccessException("Current password is incorrect.");
    }

    // Generate a new salt
    var newSalt = _hasher.GenerateSalt();

    // Hash the new password with the newly generated salt
    var newHash = _hasher.HashPassword(changePasswordDTO.NewPassword, newSalt);

    // Update the user's password hash and salt in the database
    user.PasswordHash = newHash;
    user.Salt = newSalt;

    // Save the updated user information
    await _userRepository.UpdateUserAsync(user);
}
}

