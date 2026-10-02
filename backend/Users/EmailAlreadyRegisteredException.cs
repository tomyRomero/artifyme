namespace ArtifyMe.Users;

public class EmailAlreadyRegisteredException : Exception
{
    public EmailAlreadyRegisteredException() : base("An account with this email already exists.") { }
}
