using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtifyMe.Migrations
{
    /// <summary>
    /// Moves drawing strokes from the PathData table into a JSON column on Artworks.
    /// Existing strokes are copied across in drawing order before the old table is dropped.
    /// </summary>
    public partial class StoreStrokesAsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Paths",
                table: "Artworks",
                type: "nvarchar(max)",
                nullable: true);

            // PathData.Paths already holds a JSON array of points, so JSON_QUERY embeds it as an array, not a string
            migrationBuilder.Sql("""
                UPDATE a SET Paths = COALESCE((
                    SELECT p.Color AS Color, JSON_QUERY(p.Paths) AS Path, p.Size AS Size
                    FROM PathData p
                    WHERE p.ArtworkId = a.Id
                    ORDER BY p.Id
                    FOR JSON PATH), '[]')
                FROM Artworks a;
                """);

            migrationBuilder.DropTable(
                name: "PathData");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PathData",
                columns: table => new
                {
                    ArtworkId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Color = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Paths = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Size = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathData", x => new { x.ArtworkId, x.Id });
                    table.ForeignKey(
                        name: "FK_PathData_Artworks_ArtworkId",
                        column: x => x.ArtworkId,
                        principalTable: "Artworks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Identity values follow the ORDER BY, which keeps strokes in drawing order
            migrationBuilder.Sql("""
                INSERT INTO PathData (ArtworkId, Color, Paths, Size)
                SELECT a.Id, JSON_VALUE(s.value, '$.Color'), JSON_QUERY(s.value, '$.Path'), CAST(JSON_VALUE(s.value, '$.Size') AS int)
                FROM Artworks a
                CROSS APPLY OPENJSON(a.Paths) s
                WHERE a.Paths IS NOT NULL
                ORDER BY a.Id, CAST(s.[key] AS int);
                """);

            migrationBuilder.DropColumn(
                name: "Paths",
                table: "Artworks");
        }
    }
}
