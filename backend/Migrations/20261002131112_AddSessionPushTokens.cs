using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionPushTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PushToken",
                table: "Sessions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_PushToken",
                table: "Sessions",
                column: "PushToken",
                filter: "[PushToken] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sessions_PushToken",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "PushToken",
                table: "Sessions");
        }
    }
}
