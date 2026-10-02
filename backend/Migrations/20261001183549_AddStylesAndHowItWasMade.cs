using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <inheritdoc />
    public partial class AddStylesAndHowItWasMade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Prompt",
                table: "Generations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Generations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            // Until now the prompt was the description
            migrationBuilder.Sql("UPDATE Generations SET Description = Prompt");

            migrationBuilder.AddColumn<string>(
                name: "Device",
                table: "Generations",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "Generations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "Preview",
                table: "Generations",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Generations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Style",
                table: "Generations",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Making",
                table: "Artworks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OutlineImage",
                table: "Artworks",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Style",
                table: "Artworks",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Generations SET Prompt = Description");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "Device",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "Preview",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "Style",
                table: "Generations");

            migrationBuilder.DropColumn(
                name: "Making",
                table: "Artworks");

            migrationBuilder.DropColumn(
                name: "OutlineImage",
                table: "Artworks");

            migrationBuilder.DropColumn(
                name: "Style",
                table: "Artworks");

            migrationBuilder.AlterColumn<string>(
                name: "Prompt",
                table: "Generations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);
        }
    }
}
