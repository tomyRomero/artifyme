using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ArtifyMe.Models;
using ArtifyMe.Repositories.Interfaces;

namespace ArtifyMe.Repositories;

    public class ArtworkRepository : IArtworkRepository
    {
        private readonly ApplicationDbContext _context;

        public ArtworkRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Find artwork by ID
        public async Task<Artwork> FindByIdAsync(string id)
        {
            // Attempt to find the artwork by ID
            var artwork = await _context.Artworks
                .Include(a => a.Paths)
                .FirstOrDefaultAsync(a => a.Id == id);

            // Handle the case where artwork is not found
            if (artwork == null)
            {
                // Log a warning or handle the error as needed
                // e.g., throw new KeyNotFoundException($"Artwork with ID '{id}' not found.");
                Console.WriteLine($"Artwork with ID '{id}' was not found."); // For logging purposes only
            }

            return artwork; // Return the found artwork
        }

        // Get artworks with pagination and optional user email filter
        public async Task<List<Artwork>> GetArtworksWithPagination(int pageNumber, int pageSize, string userEmail = null)
        {
            var query = _context.Artworks.AsQueryable();

            if (!string.IsNullOrEmpty(userEmail))
            {
                query = query.Where(a => a.UserEmail == userEmail);
            }

            return await query
                .OrderByDescending(a => a.CreationDateTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Include(a => a.Paths)
                .ToListAsync();
        }

        // Insert a new artwork
        public async Task InsertArtworkAsync(Artwork artwork)
        {
            await _context.Artworks.AddAsync(artwork);
            await _context.SaveChangesAsync();
        }

        // Update an existing artwork
        public async Task UpdateArtworkAsync(Artwork artwork)
        {
            _context.Artworks.Update(artwork);
            await _context.SaveChangesAsync();
        }

        // Delete an artwork by ID
        public async Task DeleteArtworkAsync(string id)
        {
            var artwork = await FindByIdAsync(id);
            if (artwork != null)
            {
                _context.Artworks.Remove(artwork);
                await _context.SaveChangesAsync();
            }
        }
    }
