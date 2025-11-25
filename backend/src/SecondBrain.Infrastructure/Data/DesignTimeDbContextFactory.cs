using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace SecondBrain.Infrastructure.Data;

/// <summary>
/// Factory for creating DbContext at design-time for EF Core migrations
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        
        // Build configuration from appsettings files
        // Try multiple possible paths to find appsettings.json
        var currentDir = Directory.GetCurrentDirectory();
        var possiblePaths = new[]
        {
            Path.Combine(currentDir, "..", "SecondBrain.API"), // From Infrastructure directory
            Path.Combine(currentDir, "src", "SecondBrain.API"), // From backend directory
            Path.Combine(currentDir, "SecondBrain.API"), // From src directory
            currentDir // Current directory (if running from API directory)
        };

        string? basePath = null;
        foreach (var path in possiblePaths)
        {
            var appsettingsPath = Path.Combine(path, "appsettings.json");
            if (File.Exists(appsettingsPath))
            {
                basePath = path;
                break;
            }
        }

        var configurationBuilder = new ConfigurationBuilder();
        if (basePath != null)
        {
            configurationBuilder.SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true);
        }
        configurationBuilder.AddEnvironmentVariables();
        
        var configuration = configurationBuilder.Build();
        
        // Get connection string from configuration (same way the app does)
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=secondbrain;Username=postgres;Password=postgres";

        optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.UseVector();
        });

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}

