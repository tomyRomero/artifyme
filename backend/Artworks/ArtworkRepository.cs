using ArtifyMe.Data;
using Microsoft.EntityFrameworkCore;

namespace ArtifyMe.Artworks;

public class ArtworkRepository : IArtworkRepository
{
    private readonly ApplicationDbContext _context;

    public ArtworkRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Artwork?> FindByIdAsync(string id, int ownerId)
    {
        return await _context.Artworks
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == ownerId);
    }

    // Summary columns only, so the strokes JSON stays in the database
    public async Task<List<ArtworkSummary>> ListAsync(int ownerId, ArtworkQuery query, int skip, int take)
    {
        var artworks = _context.Artworks.AsNoTracking().Where(a => a.UserId == ownerId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = $"%{EscapeLike(query.Search.Trim())}%";
            artworks = artworks.Where(a =>
                EF.Functions.Like(a.Title, pattern, LikeEscape) || EF.Functions.Like(a.Description!, pattern, LikeEscape));
        }
        if (query.Style is not null)
            artworks = artworks.Where(a => a.Style == query.Style);

        // Id breaks ties, so a page boundary never repeats or skips an artwork
        artworks = query.Sort == ArtworkSort.Oldest
            ? artworks.OrderBy(a => a.CreationDateTime).ThenBy(a => a.Id)
            : artworks.OrderByDescending(a => a.CreationDateTime).ThenByDescending(a => a.Id);

        return await artworks
            .Skip(skip)
            .Take(take)
            .Select(a => new ArtworkSummary
            {
                Id = a.Id,
                Title = a.Title,
                Description = a.Description,
                AiImage = a.AiImage,
                ThumbnailImage = a.ThumbnailImage,
                CreationDateTime = a.CreationDateTime
            })
            .ToListAsync();
    }

    private const string LikeEscape = "\\";

    // So "50%" or "a_b" match literally
    private static string EscapeLike(string text) =>
        text.Replace(LikeEscape, LikeEscape + LikeEscape).Replace("%", LikeEscape + "%").Replace("_", LikeEscape + "_").Replace("[", LikeEscape + "[");

    public async Task UpdateArtworkAsync(Artwork artwork)
    {
        _context.Artworks.Update(artwork);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteArtworkAsync(Artwork artwork)
    {
        _context.Artworks.Remove(artwork);
        await _context.SaveChangesAsync();
    }

    public async Task<List<string>> GetImageKeysAsync(int ownerId)
    {
        var images = await _context.Artworks
            .AsNoTracking()
            .Where(a => a.UserId == ownerId)
            .Select(a => new { a.SketchedImage, a.AiImage, a.ThumbnailImage, a.OutlineImage })
            .ToListAsync();
        return images.SelectMany(i => new[] { i.SketchedImage, i.AiImage, i.ThumbnailImage, i.OutlineImage }).OfType<string>().ToList();
    }
}
