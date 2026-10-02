#!/usr/bin/env bash
# Applies every EF Core migration to a real SQL Server and checks that moving strokes to JSON
# keeps existing drawings, both when migrating forward and when rolling back.
#
# In CI, SQL Server runs as the "mssql" container on port 1433. To run it locally against the
# compose database, after `dotnet build backend`:
#   MSSQL_CONTAINER=artifyme-sqlserver-1 MSSQL_PORT=14331 SA_PASSWORD=<from .env> .github/scripts/check-migrations.sh
# It works in its own artifyme_ci database, which it recreates at the start and drops at the end.
set -euo pipefail

: "${SA_PASSWORD:?SA_PASSWORD must be set}"
MSSQL_CONTAINER="${MSSQL_CONTAINER:-mssql}"
MSSQL_PORT="${MSSQL_PORT:-1433}"
export ConnectionStrings__DefaultConnection="Server=localhost,${MSSQL_PORT};Database=artifyme_ci;User ID=sa;Password=${SA_PASSWORD};TrustServerCertificate=True"
BEFORE_JSON=20240906161010_artworkadditon

sqlcmd() {
  docker exec "$MSSQL_CONTAINER" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$SA_PASSWORD" "$@"
}
sql() {
  sqlcmd -d artifyme_ci -h -1 -W -b -Q "SET NOCOUNT ON; $1" | tr -d '\r' | sed 's/[[:space:]]*$//'
}
ef() { dotnet ef "$@" --project backend --no-build; }

echo "Starting from an empty artifyme_ci database"
sqlcmd -b -Q "DROP DATABASE IF EXISTS artifyme_ci;"

echo "Checking the model and migrations are in sync"
ef migrations has-pending-model-changes

echo "Creating the schema as it was before strokes moved to JSON, with one user and one drawing"
ef database update "$BEFORE_JSON"
sql "INSERT INTO Users (FirstName, LastName, Email, PasswordHash, Salt, CreatedAt)
     VALUES ('CI', 'User', 'CI@Example.com', 'legacy-hash', 'legacy-salt', SYSUTCDATETIME());
     INSERT INTO Artworks (Id, UserEmail, Title, CreationDateTime) VALUES ('ci-art', 'ci@example.com', 'CI', SYSUTCDATETIME());
     INSERT INTO PathData (ArtworkId, Color, Paths, Size)
     VALUES ('ci-art', '#000', '[\"M1,1 \",\"2,2 \"]', 2), ('ci-art', '#f00', '[\"M5,5 \"]', 6);"

echo "Applying the remaining migrations"
ef database update
expected='[{"Color":"#000","Path":["M1,1 ","2,2 "],"Size":2},{"Color":"#f00","Path":["M5,5 "],"Size":6}]'
actual=$(sql "SELECT Paths FROM Artworks WHERE Id = 'ci-art';")
if [ "$actual" != "$expected" ]; then
  echo "Strokes were not copied correctly. Expected: $expected Actual: $actual"
  exit 1
fi

owner=$(sql "SELECT u.Email FROM Artworks a JOIN Users u ON u.UserId = a.UserId WHERE a.Id = 'ci-art';")
if [ "$owner" != "ci@example.com" ]; then
  echo "Expected the artwork to be linked to ci@example.com (emails lowercased), got: $owner"
  exit 1
fi

echo "Rolling back and checking the owner email and strokes return in order"
ef database update "$BEFORE_JSON"
colors=$(sql "SELECT STRING_AGG(Color, ',') WITHIN GROUP (ORDER BY Id) FROM PathData WHERE ArtworkId = 'ci-art';")
if [ "$colors" != "#000,#f00" ]; then
  echo "Expected strokes #000,#f00 after rollback, got: $colors"
  exit 1
fi

restored_owner=$(sql "SELECT UserEmail FROM Artworks WHERE Id = 'ci-art';")
if [ "$restored_owner" != "ci@example.com" ]; then
  echo "Expected UserEmail ci@example.com after rollback, got: $restored_owner"
  exit 1
fi

sqlcmd -b -Q "ALTER DATABASE artifyme_ci SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE artifyme_ci;"
echo "Migrations OK"
