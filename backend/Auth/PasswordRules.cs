namespace ArtifyMe.Auth;

// Not checked at login, so accounts made under older rules can still sign in
public static class PasswordRules
{
    public const int MinLength = 12;
    public const int MaxLength = 128;
    public const string LengthMessage = "Password must be between 12 and 128 characters.";
}
