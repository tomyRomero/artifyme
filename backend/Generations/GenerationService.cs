using ArtifyMe.Artworks;
using ArtifyMe.Images;
using ArtifyMe.Inference;

namespace ArtifyMe.Generations;

public class GenerationService : IGenerationService
{
    private const int MaxCancelAttempts = 3;

    private readonly IGenerationRepository _generations;
    private readonly IArtworkRepository _artworks;
    private readonly IImageStorage _imageStorage;
    private readonly IInferenceClient _inference;
    private readonly TimeProvider _time;
    private readonly ILogger<GenerationService> _logger;

    public GenerationService(IGenerationRepository generations, IArtworkRepository artworks, IImageStorage imageStorage,
        IInferenceClient inference, TimeProvider time, ILogger<GenerationService> logger)
    {
        _generations = generations;
        _artworks = artworks;
        _imageStorage = imageStorage;
        _inference = inference;
        _time = time;
        _logger = logger;
    }

    public async Task<GenerationView?> StartAsync(GenerationRequest request, int ownerId)
    {
        // The inference service reads PNG, JPEG and WebP
        if (!ImageData.TryParseDataUri(request.Sketch, out var sketch, out var extension) || extension == "gif")
            throw new InvalidArtworkException("The sketch must be a base64 PNG, JPEG or WebP data URI.");
        if (sketch.Length > ArtworkLimits.MaxSketchBytes)
            throw new InvalidArtworkException($"The sketch must be at most {ArtworkLimits.MaxSketchBytes / 1024 / 1024} MB.");
        Strokes.EnsureValid(request.Paths);
        var style = request.Style is null ? null : Styles.Find(request.Style)
            ?? throw new InvalidArtworkException($"There's no style called \"{request.Style}\".");

        if (request.ArtworkId is not null && await _artworks.FindByIdAsync(request.ArtworkId, ownerId) is null)
            return null;

        if (await _generations.FindActiveAsync(ownerId) is { } active)
            throw new GenerationInProgressException(active.Id);

        var now = Now();
        var generation = new Generation
        {
            UserId = ownerId,
            ArtworkId = request.ArtworkId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Style = style?.Id,
            Prompt = Styles.Prompt(request.Description.Trim(), style),
            Paths = Strokes.Copy(request.Paths),
            SketchImage = await _imageStorage.SaveAsync(ownerId, sketch, extension),
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (!await _generations.TryInsertAsync(generation))
        {
            await _imageStorage.DeleteQuietlyAsync([generation.SketchImage], _logger);
            throw new GenerationInProgressException((await _generations.FindActiveAsync(ownerId))?.Id);
        }

        InferenceJob job;
        try
        {
            job = await _inference.SubmitAsync(sketch, generation.Prompt, request.Seed);
        }
        catch (Exception e) when (e is InferenceBusyException or InferenceRejectedException or InferenceUnavailableException)
        {
            // It never started, so nothing is kept
            await _generations.DeleteAsync(generation);
            await _imageStorage.DeleteQuietlyAsync([generation.SketchImage], _logger);
            throw;
        }

        generation.InferenceJobId = job.Id;
        generation.Seed = job.Seed;
        generation.Position = job.Position;
        generation.Touch(Now());
        if (!await _generations.TrySaveAsync(generation))
        {
            // Cancelled while it was being submitted, so stop the job too
            await _inference.CancelQuietlyAsync(job.Id, _logger);
            return await GetAsync(generation.Id, ownerId);
        }
        return GenerationView.From(generation);
    }

    public async Task<GenerationView?> GetAsync(Guid id, int ownerId)
    {
        var generation = await _generations.FindByIdAsync(id, ownerId);
        return generation is null ? null : GenerationView.From(generation);
    }

    public async Task<GenerationView?> GetActiveAsync(int ownerId)
    {
        var generation = await _generations.FindActiveAsync(ownerId);
        return generation is null ? null : GenerationView.From(generation);
    }

    public async Task<GenerationView?> CancelAsync(Guid id, int ownerId)
    {
        // A cancel can collide with the worker's progress updates, so re-read and retry
        for (var attempt = 1; ; attempt++)
        {
            var generation = await _generations.FindByIdAsync(id, ownerId);
            if (generation is null || !generation.IsActive)
                return generation is null ? null : GenerationView.From(generation);

            generation.Finish(GenerationStatus.Cancelled, null, Now());
            if (await _generations.TrySaveAsync(generation))
            {
                if (generation.InferenceJobId is not null)
                    await _inference.CancelQuietlyAsync(generation.InferenceJobId, _logger);
                await _imageStorage.DeleteQuietlyAsync([generation.SketchImage], _logger);
                return GenerationView.From(generation);
            }

            if (attempt == MaxCancelAttempts)
                return await GetAsync(id, ownerId);
        }
    }

    private DateTime Now() => _time.GetUtcNow().UtcDateTime;
}
