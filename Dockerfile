# Use the official .NET 9 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY *.sln ./
COPY WeatherApp/*.csproj ./WeatherApp/
RUN dotnet restore

# Copy the rest of the source code and build
COPY WeatherApp/. ./WeatherApp/
WORKDIR /src/WeatherApp
RUN dotnet publish -c Release -o /app/publish --no-restore

# Use the official .NET 9 runtime image for the final container
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Set ASP.NET Core to listen on port 8080
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "WeatherApp.dll"]