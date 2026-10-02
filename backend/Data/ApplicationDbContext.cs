using ArtifyMe.Artworks;
using ArtifyMe.Auth;
using ArtifyMe.Generations;
using ArtifyMe.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ArtifyMe.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    public DbSet<Artwork> Artworks { get; set; }

    public DbSet<Generation> Generations { get; set; }

    public DbSet<Session> Sessions { get; set; }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    // SQL Server doesn't keep DateTimeKind, so mark values read back as UTC
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<ReadAsUtc>();
    }

    private sealed class ReadAsUtc() : ValueConverter<DateTime, DateTime>(
        time => time,
        time => DateTime.SpecifyKind(time, DateTimeKind.Utc));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.Email).IsRequired();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Artwork>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedOnAdd();

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Matches the gallery's order, tie-break included, so a page is read straight off the index
            entity.HasIndex(a => new { a.UserId, a.CreationDateTime, a.Id })
                .IsDescending(false, true, true);

            entity.OwnsMany(a => a.Paths, p =>
            {
                p.ToJson("Paths");
                p.Property(pd => pd.Color).HasMaxLength(100);
            });

            entity.OwnsOne(a => a.Making, m => m.ToJson("Making"));
        });

        modelBuilder.Entity<Generation>(entity =>
        {
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(g => g.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(g => g.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(g => g.Error).HasConversion<string>().HasMaxLength(30);

            entity.Property(g => g.Version).IsConcurrencyToken();

            // At most one generation in progress per user, enforced by the database
            entity.HasIndex(g => g.UserId)
                .IsUnique()
                .HasFilter("[Status] IN ('Queued', 'Running')");

            entity.HasIndex(g => g.Status);

            entity.OwnsMany(g => g.Paths, p =>
            {
                p.ToJson("Paths");
                p.Property(pd => pd.Color).HasMaxLength(100);
            });
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // One active session per install
            entity.HasIndex(s => new { s.UserId, s.InstallId })
                .IsUnique()
                .HasFilter("[RevokedAt] IS NULL");

            entity.HasIndex(s => s.PushToken)
                .HasFilter("[PushToken] IS NOT NULL");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasOne(t => t.Session)
                .WithMany()
                .HasForeignKey(t => t.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // SQL Server doesn't allow cascades on a self-reference
            entity.HasOne(t => t.ReplacedBy)
                .WithMany()
                .HasForeignKey(t => t.ReplacedById)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(t => t.TokenHash).IsUnique();
        });
    }
}

