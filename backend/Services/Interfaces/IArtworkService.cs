using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ArtifyMe.Models;
using ArtifyMe.Models.DTOs;

namespace ArtifyMe.Services.Interfaces
{
    public interface IArtworkService
    {
        Task<IActionResult> SaveArtwork(ArtworkRequest request);
        Task<IActionResult> GetArtworksWithPagination(int pageNumber, int pageSize, string userEmail);
        Task<IActionResult> GetArtworkById(string id);
        Task<IActionResult> DeleteArtwork(string id);
        Task<IActionResult> UpdateArtwork(string id, ArtworkRequest request);
    }
}