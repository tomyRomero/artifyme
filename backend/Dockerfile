# The API: built with the .NET SDK, then run on the smaller ASP.NET runtime as a non-root user.
# Built by compose.yaml (docker compose --profile app up --build), or: docker build backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# The packages are restored before the code is copied, so a code change reuses the restored layer
COPY ArtifyMe.Api.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish --configuration Release --no-restore --output /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
# The local image folder, writable by the non-root user so a volume mounted here works
RUN mkdir storage && chown "$APP_UID" storage
USER $APP_UID
# ASP.NET's default port in containers
EXPOSE 8080
ENTRYPOINT ["dotnet", "ArtifyMe.Api.dll"]
