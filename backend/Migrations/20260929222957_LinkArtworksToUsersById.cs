using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <summary>
    /// Links artworks to their owner by UserId instead of by email, makes emails unique, and adds the
    /// index the gallery query uses. Existing data is carried across; if it can't be matched safely,
    /// the migration stops (and rolls back) with instructions instead of deleting anything.
    /// </summary>
    public partial class LinkArtworksToUsersById : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Emails are now stored lowercase (EmailNormalizer); bring existing accounts in line
            migrationBuilder.Sql("UPDATE Users SET Email = LOWER(LTRIM(RTRIM(Email)));");
            migrationBuilder.Sql("""
                IF EXISTS (SELECT Email FROM Users GROUP BY Email HAVING COUNT(*) > 1)
                    THROW 50001, 'Some accounts share an email address when case is ignored. Merge or rename them before migrating: SELECT LOWER(Email), COUNT(*) FROM Users GROUP BY LOWER(Email) HAVING COUNT(*) > 1', 1;
                """);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Artworks",
                type: "int",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE a SET UserId = u.UserId
                FROM Artworks a
                JOIN Users u ON u.Email = LOWER(LTRIM(RTRIM(a.UserEmail)));
                """);
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM Artworks WHERE UserId IS NULL)
                    THROW 50002, 'Some artworks belong to an email with no account. Reassign or remove them before migrating: SELECT Id, UserEmail FROM Artworks WHERE UserId IS NULL', 1;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "Artworks",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "UserEmail",
                table: "Artworks");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Artworks_UserId_CreationDateTime",
                table: "Artworks",
                columns: new[] { "UserId", "CreationDateTime" },
                descending: new[] { false, true });

            migrationBuilder.AddForeignKey(
                name: "FK_Artworks_Users_UserId",
                table: "Artworks",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Artworks_Users_UserId",
                table: "Artworks");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Artworks_UserId_CreationDateTime",
                table: "Artworks");

            migrationBuilder.AddColumn<string>(
                name: "UserEmail",
                table: "Artworks",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE a SET UserEmail = u.Email
                FROM Artworks a
                JOIN Users u ON u.UserId = a.UserId;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "UserEmail",
                table: "Artworks",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Artworks");
        }
    }
}
