using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ArtifyMe.Models;
using ArtifyMe.Repositories.Interfaces;
using ArtifyMe.Models.DTOs;
using ArtifyMe.Services.Interfaces;


namespace ArtifyMe.Services
{
    public class ArtworkService : IArtworkService
    {
        private readonly IArtworkRepository _artworkRepository;

        public ArtworkService(IArtworkRepository artworkRepository)
        {
            _artworkRepository = artworkRepository;
        }

        //Save Artwork
        public async Task<IActionResult> SaveArtwork(ArtworkRequest request)
        {
            try
            {
                // Validate request parameters
                if (string.IsNullOrWhiteSpace(request.UserEmail) ||
                    string.IsNullOrWhiteSpace(request.SketchedImage) ||
                    string.IsNullOrWhiteSpace(request.AiImage) ||
                    string.IsNullOrWhiteSpace(request.Title) ||
                    string.IsNullOrWhiteSpace(request.Description) ||
                    request.Paths == null || !request.Paths.Any())
                {
                    return new BadRequestObjectResult(new ArtworkResponse
                    {
                        Message = "User email, sketched image, AI image, description, title, and paths are required!",
                        Id = null
                    });
                }

                // Create Artwork entity from the request
                var artwork = new Artwork
                {
                    UserEmail = request.UserEmail,
                    SketchedImage = request.SketchedImage,
                    AiImage = request.AiImage,
                    CreationDateTime = DateTime.UtcNow,
                    Description = request.Description,
                    Paths = request.Paths.Select(p => new PathData
                    {
                        Color = p.Color,
                        Path = p.Path,
                        Size = p.Size
                    }).ToList(),
                    Title = request.Title
                };

                // Save the artwork to the repository
                await _artworkRepository.InsertArtworkAsync(artwork);

                // Return success response
                return new OkObjectResult(new ArtworkResponse
                {
                    Message = "Artwork saved successfully",
                    Id = artwork.Id
                });
            }
            catch (Exception ex)
            {
                // Handle exceptions and return internal server error
                Console.WriteLine(ex);
                return new ObjectResult(new ArtworkResponse
                {
                    Message = "An unexpected error occurred",
                    Id = null
                })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        // Get artworks with pagination
public async Task<IActionResult> GetArtworksWithPagination(int pageNumber, int pageSize, string userEmail)
{
    try
    {
        // Fetch one extra artwork to check if there's a next page
        var artworks = await _artworkRepository.GetArtworksWithPagination(pageNumber, pageSize + 1, userEmail);

        // Determine if there are more pages based on the extra item
        bool isNext = artworks.Count > pageSize;
        var artworksToReturn = artworks.Take(pageSize).ToList();

        // Create and return page response
        return new OkObjectResult(new PageResponse
        {
            Message = "Success getting results",
            IsNext = isNext,
            Content = artworksToReturn
        });
    }
    catch (Exception ex)
    {
        // Handle exceptions and return internal server error
        Console.WriteLine(ex);
        return new ObjectResult(new PageResponse
        {
            Message = $"An unexpected error occurred: {ex.Message}",
            IsNext = false,
            Content = new List<Artwork>()
        })
        {
            StatusCode = StatusCodes.Status500InternalServerError
        };
    }
}
   
        // Get artwork by ID
        public async Task<IActionResult> GetArtworkById(string id)
        {
            try
            {
                // Validate ID
                if (string.IsNullOrEmpty(id))
                {
                    return new BadRequestObjectResult(new { Message = "ID is required!" });
                }

                // Fetch artwork from the repository
                var artwork = await _artworkRepository.FindByIdAsync(id);

                // Check if artwork exists
                if (artwork == null)
                {
                    return new NotFoundObjectResult(new { Message = "Artwork not found" });
                }

                // Return the artwork
                return new OkObjectResult(new { Artwork = artwork, Message = "Artwork found" });
            }
            catch (Exception ex)
            {
                // Handle exceptions and return internal server error
                Console.WriteLine(ex);
                return new ObjectResult(new { Message = $"Internal Server Error: {ex.Message}" })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        // Delete artwork by ID
        public async Task<IActionResult> DeleteArtwork(string id)
        {
            try
            {
                // Validate ID
                if (string.IsNullOrEmpty(id))
                {
                    return new BadRequestObjectResult(new { Message = "ID is required!" });
                }

                // Check if artwork exists
                var artwork = await _artworkRepository.FindByIdAsync(id);
                if (artwork == null)
                {
                    return new NotFoundObjectResult(new { Message = "Artwork not found" });
                }

                // Delete artwork
                await _artworkRepository.DeleteArtworkAsync(id);

                // Return success message
                return new OkObjectResult(new { Message = "Artwork deleted successfully" });
            }
            catch (Exception ex)
            {
                // Handle exceptions and return internal server error
                Console.WriteLine(ex);
                return new ObjectResult(new { Message = $"Internal Server Error: {ex.Message}" })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        // Update artwork
       public async Task<IActionResult> UpdateArtwork(string id, ArtworkRequest request)
    {
    try
    {
        // Find the artwork by ID
        var artwork = await _artworkRepository.FindByIdAsync(id);
        if (artwork == null)
        {
            return new NotFoundObjectResult(new ArtworkResponse
            {
                Message = "Artwork not found"
            });
        }

        // Update artwork fields based on the request
        artwork.Title = request.Title ?? artwork.Title;
        artwork.Description = request.Description ?? artwork.Description;
        artwork.SketchedImage = request.SketchedImage ?? artwork.SketchedImage;
        artwork.AiImage = request.AiImage ?? artwork.AiImage;
        if (request.Paths != null && request.Paths.Any())
        {
            // Convert request paths to PathData
            artwork.Paths = request.Paths.Select(p => new PathData 
            { 
                Color = p.Color, 
                Path = p.Path, 
                Size = p.Size 
            }).ToList();
        }

        // Save the updated artwork
        await _artworkRepository.UpdateArtworkAsync(artwork);

        // Return success message
        return new OkObjectResult(new ArtworkResponse
        {
            Message = "Artwork updated successfully",
            Id = artwork.Id
        });
    }
    catch (Exception ex)
    {
        // Handle exceptions and return internal server error
        Console.WriteLine(ex);
        return new ObjectResult(new ArtworkResponse
        {
            Message = "An unexpected error occurred",
            Id = null
        })
        {
            StatusCode = StatusCodes.Status500InternalServerError
        };
    }
}
    }
}