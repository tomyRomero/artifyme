using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <summary>
    /// New passwords are hashed with PBKDF2, which embeds its own salt, so the separate Salt column
    /// is only kept for accounts that have not logged in since the upgrade.
    /// </summary>
    public partial class MakeLegacyPasswordSaltOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Salt",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }

        /// <summary>
        /// Rolling back is safe for the schema, but accounts already upgraded to PBKDF2 get an empty salt
        /// and can only be verified by code that understands PBKDF2 hashes.
        /// </summary>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Salt",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
