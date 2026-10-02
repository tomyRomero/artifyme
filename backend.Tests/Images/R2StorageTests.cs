using ArtifyMe.Images;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace ArtifyMe.Tests.Images;

public class R2StorageTests : IDisposable
{
    private readonly FakeR2 _r2 = new();

    public void Dispose() => _r2.Dispose();

    [Fact]
    public async Task Image_links_point_at_the_bucket_and_are_signed_for_R2()
    {
        var link = new Uri(await Storage().GetUrlAsync("users/1/abc.webp", TimeSpan.FromHours(1)));

        Assert.Equal($"{FakeR2.Endpoint}/{FakeR2.Bucket}/users/1/abc.webp", link.GetLeftPart(UriPartial.Path));
        var query = QueryHelpers.ParseQuery(link.Query);
        Assert.Contains($"{FakeR2.AccessKeyId}/", query["X-Amz-Credential"].ToString());
        Assert.Contains("/auto/s3/aws4_request", query["X-Amz-Credential"].ToString());
        Assert.Equal("3600", query["X-Amz-Expires"].ToString());
        Assert.False(string.IsNullOrEmpty(query["X-Amz-Signature"]));
    }

    [Fact]
    public async Task New_images_go_in_their_owners_folder_with_their_type_and_can_be_deleted()
    {
        var storage = Storage();

        var key = await storage.SaveAsync(42, [1, 2, 3], "webp");

        Assert.Matches(@"^users/42/[0-9a-f]{32}\.webp$", key);
        var stored = _r2.Get(key)!;
        Assert.Equal([1, 2, 3], stored.Content);
        Assert.Equal("image/webp", stored.ContentType);
        await storage.DeleteAsync(key);
        Assert.False(_r2.Contains(key));
    }

    [Fact]
    public async Task Deleting_a_folder_removes_every_image_in_it_a_page_at_a_time()
    {
        _r2.PageSize = 2;
        var theirs = Enumerable.Range(1, 5).Select(n => $"users/7/image-{n}.webp").ToList();
        theirs.ForEach(key => _r2.Put(key, [1]));
        // A folder whose name starts the same, and another user's
        _r2.Put("users/70/kept.webp", [1]);
        _r2.Put("users/8/kept.webp", [1]);

        await Storage().DeleteOwnerFolderAsync(7);

        Assert.Equal(["users/70/kept.webp", "users/8/kept.webp"], _r2.Keys.Order());
    }

    [Fact]
    public async Task A_folder_that_cant_all_be_deleted_says_which_image_was_left()
    {
        _r2.Put("users/9/a.webp", [1]);
        _r2.Put("users/9/b.webp", [1]);
        _r2.Undeletable.Add("users/9/b.webp");

        var error = await Assert.ThrowsAsync<IOException>(() => Storage().DeleteOwnerFolderAsync(9));

        Assert.Contains("users/9/b.webp", error.Message);
        Assert.False(_r2.Contains("users/9/a.webp"));
    }

    [Fact]
    public void Every_setting_still_to_be_set_is_named()
    {
        Assert.Equal(["R2:Endpoint", "R2:BucketName", "R2:AccessKeyId", "R2:SecretAccessKey"], new R2Settings().Missing());
        Assert.Equal(["R2:SecretAccessKey"], new R2Settings
        {
            Endpoint = FakeR2.Endpoint,
            BucketName = FakeR2.Bucket,
            AccessKeyId = FakeR2.AccessKeyId,
            SecretAccessKey = " ",
        }.Missing());
    }

    private R2ImageStorage Storage() => new(_r2, Options.Create(new R2Settings { BucketName = FakeR2.Bucket }), TimeProvider.System);
}
