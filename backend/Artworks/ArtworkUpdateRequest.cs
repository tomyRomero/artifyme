using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Artworks;

public class ArtworkUpdateRequest : IValidatableObject
{
    [StringLength(ArtworkLimits.MaxTitleLength)]
    public string? Title { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }

    // Checked after trimming, since that's what gets saved
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Title is not null && Title.Trim().Length == 0)
            yield return new ValidationResult("The title can't be blank.", [nameof(Title)]);
        if (Description is not null && Description.Trim().Length < 3)
            yield return new ValidationResult("The description needs at least 3 characters.", [nameof(Description)]);
    }
}
