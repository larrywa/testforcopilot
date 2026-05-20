# Use the official .NET 9 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the solution file (if present) and project files
COPY WeatherApp/*.csproj ./WeatherApp/

# Restore dependencies
RUN dotnet restore

# Copy the rest of the source code
COPY WeatherApp/. ./WeatherApp/

WORKDIR /src/WeatherApp
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WeatherApp.dll"]