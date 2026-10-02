using System.ComponentModel.DataAnnotations;

namespace ArtifyMe.Auth;

public class PushTokenRequest
{
    public const int MaxLength = 200;

    // As Expo issues them, for example ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
    [Required, StringLength(MaxLength)]
    [RegularExpression(@"^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$", ErrorMessage = "That isn't an Expo push token.")]
    public string Token { get; set; } = string.Empty;
}
