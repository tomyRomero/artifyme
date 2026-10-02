namespace ArtifyMe.Notifications;

// Url is the app screen a tap opens, such as /artwork/{id}
public record PushMessage(string To, string Title, string Body, string Url);
