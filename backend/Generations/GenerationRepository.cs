using System.Linq.Expressions;
using ArtifyMe.Artworks;
using ArtifyMe.Data;
using Microsoft.EntityFrameworkCore;

namespace ArtifyMe.Generations;

public class GenerationRepository : IGenerationRepository
{
    // Matches the unique index's filter so the query can use it
    private static readonly Expression<Func<Generation, bool>> InProgress =
        g => g.Status == GenerationStatus.Queued || g.Status == GenerationStatus.Running;

    private readonly ApplicationDbContext _context;

    public GenerationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<Generation?> FindByIdAsync(Guid id, int ownerId) =>
        _context.Generations.FirstOrDefaultAsync(g => g.Id == id && g.UserId == ownerId);

    public Task<Generation?> FindByIdAsync(Guid id) =>
        _context.Generations.FirstOrDefaultAsync(g => g.Id == id);

    public Task<Generation?> FindActiveAsync(int ownerId) =>
        _context.Generations.Where(InProgress).FirstOrDefaultAsync(g => g.UserId == ownerId);

    public Task<List<Guid>> ListActiveIdsAsync() =>
        _context.Generations
            .Where(InProgress)
            .OrderBy(g => g.CreatedAt)
            .Select(g => g.Id)
            .ToListAsync();

    public async Task<bool> TryInsertAsync(Generation generation)
    {
        _context.Generations.Add(generation);
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            _context.ChangeTracker.Clear();
            // The filtered unique index rejected a second generation in progress
            if (await FindActiveAsync(generation.UserId) is not null)
                return false;
            throw;
        }
    }

    public async Task DeleteAsync(Generation generation)
    {
        _context.Generations.Remove(generation);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> TrySaveAsync(Generation generation, Artwork? createdArtwork = null)
    {
        // Save the generation first, so a cancelled or deleted one fails before its artwork is added
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await _context.SaveChangesAsync();
            if (createdArtwork is not null)
            {
                _context.Artworks.Add(createdArtwork);
                await _context.SaveChangesAsync();
            }
            await transaction.CommitAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            _context.ChangeTracker.Clear();
            return false;
        }
    }
}
