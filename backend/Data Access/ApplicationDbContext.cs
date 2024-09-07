using Microsoft.EntityFrameworkCore;
using ArtifyMe.Models.DTOs;

namespace ArtifyMe.Models;

    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }

        public DbSet<Artwork> Artworks { get; set; }
      
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configurations for User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.Property(e => e.Salt).IsRequired(); //Make Salt required
            });

        // Configure Artwork entity properties
        modelBuilder.Entity<Artwork>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedOnAdd();
            
            // Configure the ownership of PathData within Artwork
            entity.OwnsMany(a => a.Paths, p =>
            {
                p.WithOwner(); // Establishes ownership of PathData by Artwork
                p.Property(pd => pd.Color).HasMaxLength(100);
                p.Property(pd => pd.Size);
                p.Property(pd => pd.Path).HasColumnName("Paths");
            });
        });

        } 
    }

