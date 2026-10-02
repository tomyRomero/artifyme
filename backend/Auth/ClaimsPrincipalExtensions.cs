using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ArtifyMe.Auth;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("The token has no subject claim."));

    public static Guid? GetSessionId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sid), out var sessionId) ? sessionId : null;
}
