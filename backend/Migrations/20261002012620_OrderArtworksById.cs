using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <inheritdoc />
    public partial class OrderArtworksById : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Artworks_UserId_CreationDateTime",
                table: "Artworks");

            migrationBuilder.CreateIndex(
                name: "IX_Artworks_UserId_CreationDateTime_Id",
                table: "Artworks",
                columns: new[] { "UserId", "CreationDateTime", "Id" },
                descending: new[] { false, true, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Artworks_UserId_CreationDateTime_Id",
                table: "Artworks");

            migrationBuilder.CreateIndex(
                name: "IX_Artworks_UserId_CreationDateTime",
                table: "Artworks",
                columns: new[] { "UserId", "CreationDateTime" },
                descending: new[] { false, true });
        }
    }
}
