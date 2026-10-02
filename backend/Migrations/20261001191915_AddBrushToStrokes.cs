using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <inheritdoc />
    public partial class AddBrushToStrokes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Strokes are stored as JSON, so the brush needs no new column
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
