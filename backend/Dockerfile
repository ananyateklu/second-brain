# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["src/SecondBrain.API/SecondBrain.API.csproj", "SecondBrain.API/"]
COPY ["src/SecondBrain.Application/SecondBrain.Application.csproj", "SecondBrain.Application/"]
COPY ["src/SecondBrain.Core/SecondBrain.Core.csproj", "SecondBrain.Core/"]
COPY ["src/SecondBrain.Infrastructure/SecondBrain.Infrastructure.csproj", "SecondBrain.Infrastructure/"]

RUN dotnet restore "SecondBrain.API/SecondBrain.API.csproj"

# Copy everything else and build
COPY src/ .
WORKDIR "/src/SecondBrain.API"
RUN dotnet build "SecondBrain.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "SecondBrain.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

COPY --from=publish /app/publish .

# Set correct permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DatabaseProvider=Firestore

ENTRYPOINT ["dotnet", "SecondBrain.API.dll"]
