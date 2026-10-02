using ArtifyMe.Images;

namespace ArtifyMe.Artworks;

public class ArtworkService : IArtworkService
{
    public static readonly TimeSpan ImageLinkLifetime = TimeSpan.FromHours(1);

    private readonly IArtworkRepository _artworkRepository;
    private readonly IImageStorage _imageStorage;
    private readonly ILogger<ArtworkService> _logger;

    public ArtworkService(IArtworkRepository artworkRepository, IImageStorage imageStorage, ILogger<ArtworkService> logger)
    {
        _artworkRepository = artworkRepository;
        _imageStorage = imageStorage;
        _logger = logger;
    }

    public async Task<ArtworkPage> ListAsync(ArtworkQuery query, int ownerId)
    {
        // Fetch one extra to know whether there's another page
        var artworks = await _artworkRepository.ListAsync(ownerId, query, (query.Page - 1) * query.PageSize, query.PageSize + 1);

        var page = artworks.Take(query.PageSize).ToList();
        foreach (var artwork in page)
        {
            artwork.ImageUrl = await LinkTo(artwork.ThumbnailImage ?? artwork.AiImage);
        }

        return new ArtworkPage { Items = page, HasMore = artworks.Count > query.PageSize };
    }

    public async Task<ArtworkDetail?> GetAsync(string id, int ownerId)
    {
        var artwork = await _artworkRepository.FindByIdAsync(id, ownerId);
        if (artwork == null)
        {
            return null;
        }

        return new ArtworkDetail
        {
            Id = artwork.Id,
            Title = artwork.Title,
            Description = artwork.Description,
            Style = artwork.Style,
            CreationDateTime = artwork.CreationDateTime,
            Paths = artwork.Paths.ToList(),
            SketchImageUrl = await LinkTo(artwork.SketchedImage),
            AiImageUrl = await LinkTo(artwork.AiImage),
            HowItWasMade = artwork.Making is { } making
                ? new HowItWasMade
                {
                    OutlineImageUrl = await LinkTo(artwork.OutlineImage),
                    Prompt = making.Prompt,
                    Model = making.Model,
                    Device = making.Device,
                    Seed = making.Seed,
                    Steps = making.Steps,
                    StartedAt = making.StartedAt,
                    FinishedAt = making.FinishedAt,
                }
                : null,
        };
    }

    public async Task<bool> UpdateAsync(string id, ArtworkUpdateRequest request, int ownerId)
    {
        var artwork = await _artworkRepository.FindByIdAsync(id, ownerId);
        if (artwork == null)
        {
            return false;
        }

        artwork.Title = request.Title?.Trim() ?? artwork.Title;
        artwork.Description = request.Description?.Trim() ?? artwork.Description;

        await _artworkRepository.UpdateArtworkAsync(artwork);
        return true;
    }

    public async Task<bool> DeleteAsync(string id, int ownerId)
    {
        var artwork = await _artworkRepository.FindByIdAsync(id, ownerId);
        if (artwork == null)
        {
            return false;
        }

        await _artworkRepository.DeleteArtworkAsync(artwork);
        await _imageStorage.DeleteQuietlyAsync(
            [artwork.SketchedImage, artwork.AiImage, artwork.ThumbnailImage, artwork.OutlineImage], _logger);
        return true;
    }

    private async Task<string?> LinkTo(string? imageKey) =>
        string.IsNullOrEmpty(imageKey) ? null : await _imageStorage.GetUrlAsync(imageKey, ImageLinkLifetime);
}
