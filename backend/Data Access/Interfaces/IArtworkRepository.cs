using System.Collections.Generic;
using System.Threading.Tasks;
using ArtifyMe.Models;

namespace ArtifyMe.Repositories.Interfaces;

    public interface IArtworkRepository
    {
        Task<Artwork> FindByIdAsync(string id);
        Task<List<Artwork>> GetArtworksWithPagination(int pageNumber, int pageSize, string userEmail = null);
        Task InsertArtworkAsync(Artwork artwork);
        Task UpdateArtworkAsync(Artwork artwork);
        Task DeleteArtworkAsync(string id);
    }
