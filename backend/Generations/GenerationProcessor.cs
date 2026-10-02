using ArtifyMe.Artworks;
using ArtifyMe.Images;
using ArtifyMe.Inference;
using ArtifyMe.Notifications;
using Microsoft.Extensions.Options;

namespace ArtifyMe.Generations;

public class GenerationProcessor
{
    // For a generation that never got a job id (the API stopped while submitting it)
    private static readonly TimeSpan SubmitGracePeriod = TimeSpan.FromMinutes(2);

    private readonly IGenerationRepository _generations;
    private readonly IArtworkRepository _artworks;
    private readonly IImageStorage _imageStorage;
    private readonly IInferenceClient _inference;
    private readonly GenerationNotifier _notifier;
    private readonly TimeProvider _time;
    private readonly GenerationSettings _settings;
    private readonly ILogger<GenerationProcessor> _logger;

    public GenerationProcessor(IGenerationRepository generations, IArtworkRepository artworks, IImageStorage imageStorage,
        IInferenceClient inference, GenerationNotifier notifier, TimeProvider time, IOptions<GenerationSettings> settings,
        ILogger<GenerationProcessor> logger)
    {
        _generations = generations;
        _artworks = artworks;
        _imageStorage = imageStorage;
        _inference = inference;
        _notifier = notifier;
        _time = time;
        _settings = settings.Value;
        _logger = logger;
    }

    public Task<List<Guid>> ListActiveAsync() => _generations.ListActiveIdsAsync();

    public async Task ProcessAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var generation = await _generations.FindByIdAsync(id);
        if (generation is null || !generation.IsActive)
            return;

        if (generation.InferenceJobId is null)
        {
            if (Now() - generation.CreatedAt > SubmitGracePeriod)
                await FinishAsync(generation, GenerationStatus.Failed, GenerationError.Interrupted);
            return;
        }

        InferenceJob? job;
        try
        {
            job = await _inference.GetAsync(generation.InferenceJobId, cancellationToken);
        }
        catch (InferenceUnavailableException e)
        {
            if (TimedOut(generation))
            {
                await FinishAsync(generation, GenerationStatus.Failed, GenerationError.Interrupted);
                return;
            }
            _logger.LogWarning(e, "Couldn't check generation {GenerationId}; trying again at the next check", id);
            return;
        }

        switch (job?.Status)
        {
            case null:
                _logger.LogWarning("The image generation service no longer knows job {JobId} of generation {GenerationId}",
                    generation.InferenceJobId, id);
                await FinishAsync(generation, GenerationStatus.Failed, GenerationError.Interrupted);
                break;
            case InferenceJobStatus.Queued or InferenceJobStatus.Running when TimedOut(generation):
                await _inference.CancelQuietlyAsync(generation.InferenceJobId, _logger);
                await FinishAsync(generation, GenerationStatus.Failed, GenerationError.Interrupted);
                break;
            case InferenceJobStatus.Queued or InferenceJobStatus.Running:
                await CopyProgressAsync(generation, job);
                break;
            case InferenceJobStatus.Succeeded:
                await CompleteAsync(generation, job);
                break;
            case InferenceJobStatus.Failed:
                var error = job.Error == InferenceJobError.Filtered ? GenerationError.Filtered : GenerationError.GenerationFailed;
                await FinishAsync(generation, GenerationStatus.Failed, error);
                break;
            case InferenceJobStatus.Cancelled:
                await FinishAsync(generation, GenerationStatus.Cancelled, null);
                break;
        }
    }

    private async Task CopyProgressAsync(Generation generation, InferenceJob job)
    {
        var status = job.Status == InferenceJobStatus.Running ? GenerationStatus.Running : GenerationStatus.Queued;
        if (generation.Status == status && generation.Step == job.Step && generation.TotalSteps == job.TotalSteps &&
            generation.Position == job.Position)
            return;

        var now = Now();
        if (status == GenerationStatus.Running)
            generation.StartedAt ??= now;
        generation.Status = status;
        generation.Step = job.Step;
        generation.TotalSteps = job.TotalSteps;
        generation.Position = job.Position;
        generation.Preview = job.Preview ?? generation.Preview;
        generation.Touch(now);
        // Refused if it was cancelled meanwhile; the next pass picks that up
        await _generations.TrySaveAsync(generation);
    }

    private async Task CompleteAsync(Generation generation, InferenceJob job)
    {
        if (job.Image is null)
        {
            await FinishAsync(generation, GenerationStatus.Failed, GenerationError.GenerationFailed);
            return;
        }

        var uploaded = await UploadAsync(generation.UserId, job.Image, job.Thumbnail, job.Outline);
        var (aiImage, thumbnail, outline) = (uploaded[0]!, uploaded[1], uploaded[2]);
        var now = Now();
        var making = new ArtworkMaking
        {
            Prompt = generation.Prompt,
            Model = job.Model,
            Device = job.Device,
            Seed = job.Seed,
            Steps = job.TotalSteps,
            StartedAt = generation.StartedAt,
            FinishedAt = now,
        };
        Artwork? created = null;
        string?[] replaced = [];

        if (generation.ArtworkId is null)
        {
            created = new Artwork
            {
                Id = Guid.NewGuid().ToString(),
                UserId = generation.UserId,
                Title = generation.Title,
                Description = generation.Description,
                Style = generation.Style,
                Paths = Strokes.Copy(generation.Paths),
                SketchedImage = generation.SketchImage,
                AiImage = aiImage,
                ThumbnailImage = thumbnail,
                OutlineImage = outline,
                Making = making,
                CreationDateTime = now,
            };
            generation.ArtworkId = created.Id;
        }
        else
        {
            var artwork = await _artworks.FindByIdAsync(generation.ArtworkId, generation.UserId);
            if (artwork is null)
            {
                // The artwork was deleted while it was being redrawn
                await _imageStorage.DeleteQuietlyAsync(uploaded, _logger);
                await FinishAsync(generation, GenerationStatus.Cancelled, null);
                return;
            }

            replaced = [artwork.SketchedImage, artwork.AiImage, artwork.ThumbnailImage, artwork.OutlineImage];
            artwork.Title = generation.Title;
            artwork.Description = generation.Description;
            artwork.Style = generation.Style;
            artwork.Paths = Strokes.Copy(generation.Paths);
            artwork.SketchedImage = generation.SketchImage;
            artwork.AiImage = aiImage;
            artwork.ThumbnailImage = thumbnail;
            artwork.OutlineImage = outline;
            artwork.Making = making;
        }

        generation.Model = job.Model;
        generation.Device = job.Device;
        generation.Seed = job.Seed;
        generation.Step = job.TotalSteps;
        generation.TotalSteps = job.TotalSteps;
        generation.Finish(GenerationStatus.Succeeded, null, now);

        if (!await _generations.TrySaveAsync(generation, created))
        {
            // Cancelled or finished elsewhere during the upload, so drop the new images
            await _imageStorage.DeleteQuietlyAsync(uploaded, _logger);
            return;
        }
        await _imageStorage.DeleteQuietlyAsync(replaced, _logger);
        await _notifier.ArtworkReadyAsync(generation);
    }

    // If one upload fails, the ones before it are deleted, and the next pass uploads them all again
    private async Task<string?[]> UploadAsync(int ownerId, params byte[]?[] images)
    {
        var keys = new string?[images.Length];
        try
        {
            for (var i = 0; i < images.Length; i++)
                keys[i] = images[i] is { } image ? await _imageStorage.SaveAsync(ownerId, image, "webp") : null;
            return keys;
        }
        catch
        {
            await _imageStorage.DeleteQuietlyAsync(keys, _logger);
            throw;
        }
    }

    // Only delete the sketch, and tell the owner, once the final state is saved
    private async Task FinishAsync(Generation generation, GenerationStatus status, GenerationError? error)
    {
        generation.Finish(status, error, Now());
        if (!await _generations.TrySaveAsync(generation))
            return;

        await _imageStorage.DeleteQuietlyAsync([generation.SketchImage], _logger);
        if (status == GenerationStatus.Failed)
            await _notifier.ArtworkFailedAsync(generation);
    }

    private bool TimedOut(Generation generation) => Now() - generation.CreatedAt > _settings.Timeout;

    private DateTime Now() => _time.GetUtcNow().UtcDateTime;
}
