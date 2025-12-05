using SecondBrain.API.Extensions;
using SecondBrain.API.Middleware;
using SecondBrain.Infrastructure.Data;
using Scalar.AspNetCore;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

// Load .env file from the root of the project if it exists
// This allows running locally with the same environment variables as Docker
string rootDir = Directory.GetParent(Directory.GetCurrentDirectory())?.Parent?.Parent?.FullName ?? Directory.GetCurrentDirectory();
string envPath = Path.Combine(rootDir, ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);

    // Map Docker environment variables to ASP.NET Core configuration keys
    var mappings = new Dictionary<string, string>
    {
        // PostgreSQL
        { "POSTGRES_HOST", "ConnectionStrings__DefaultConnection" },
        
        // JWT Authentication
        { "JWT_SECRET_KEY", "Jwt__SecretKey" },
        { "JWT_ISSUER", "Jwt__Issuer" },
        { "JWT_AUDIENCE", "Jwt__Audience" },
        { "JWT_EXPIRY_MINUTES", "Jwt__ExpiryMinutes" },
        
        // AI Providers
        { "OPENAI_API_KEY", "AIProviders__OpenAI__ApiKey" },
        { "GEMINI_API_KEY", "AIProviders__Gemini__ApiKey" },
        { "ANTHROPIC_API_KEY", "AIProviders__Anthropic__ApiKey" },
        { "XAI_API_KEY", "AIProviders__XAI__ApiKey" },
        { "OLLAMA_BASE_URL", "AIProviders__Ollama__BaseUrl" },
    };

    foreach (var mapping in mappings)
    {
        var value = Environment.GetEnvironmentVariable(mapping.Key);
        if (!string.IsNullOrEmpty(value))
        {
            Environment.SetEnvironmentVariable(mapping.Value, value);
        }
    }

    // Build PostgreSQL connection string from individual env vars if provided
    var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var pgDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "secondbrain";
    var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    var pgPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";

    var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPassword}";
    Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", connectionString);

    // Special handling for reused keys (embedding providers use same API keys as AI providers)
    var openAiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    if (!string.IsNullOrEmpty(openAiKey))
    {
        Environment.SetEnvironmentVariable("EmbeddingProviders__OpenAI__ApiKey", openAiKey);
    }

    var geminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    if (!string.IsNullOrEmpty(geminiKey))
    {
        Environment.SetEnvironmentVariable("EmbeddingProviders__Gemini__ApiKey", geminiKey);
    }

    // Pinecone
    var pineconeKey = Environment.GetEnvironmentVariable("PINECONE_API_KEY");
    if (!string.IsNullOrEmpty(pineconeKey)) Environment.SetEnvironmentVariable("Pinecone__ApiKey", pineconeKey);

    var pineconeEnv = Environment.GetEnvironmentVariable("PINECONE_ENVIRONMENT");
    if (!string.IsNullOrEmpty(pineconeEnv)) Environment.SetEnvironmentVariable("Pinecone__Environment", pineconeEnv);

    var pineconeIndex = Environment.GetEnvironmentVariable("PINECONE_INDEX_NAME");
    if (!string.IsNullOrEmpty(pineconeIndex)) Environment.SetEnvironmentVariable("Pinecone__IndexName", pineconeIndex);

    // CORS
    var allowedOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
    if (!string.IsNullOrEmpty(allowedOrigins)) Environment.SetEnvironmentVariable("Cors__AllowedOrigins__0", allowedOrigins);

    var allowLocal = Environment.GetEnvironmentVariable("CORS_ALLOW_LOCAL_NETWORK");
    if (!string.IsNullOrEmpty(allowLocal)) Environment.SetEnvironmentVariable("Cors__AllowLocalNetworkIps", allowLocal);
}

Console.WriteLine();
Console.WriteLine("╔══════════════════════════════════════════════════════════╗");
Console.WriteLine("║           Second Brain API - Starting...                 ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════╝");
Console.WriteLine();

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog for structured logging
var logsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
Directory.CreateDirectory(logsPath);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "SecondBrain.API")
        .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
        .Enrich.WithMachineName()
        .WriteTo.Console(
            outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}",
            restrictedToMinimumLevel: LogEventLevel.Information)
        .WriteTo.File(
            new CompactJsonFormatter(),
            Path.Combine(logsPath, "secondbrain-.json"),
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            restrictedToMinimumLevel: LogEventLevel.Information)
        .WriteTo.File(
            Path.Combine(logsPath, "secondbrain-errors-.txt"),
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            restrictedToMinimumLevel: LogEventLevel.Error,
            outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] {Message:lj}{NewLine}{Exception}");

    // Set minimum level based on environment
    if (context.HostingEnvironment.IsDevelopment())
    {
        configuration.MinimumLevel.Debug()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning);
    }
    else
    {
        configuration.MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning);
    }
});

// Configure Kestrel limits
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10MB
    serverOptions.Limits.MaxRequestHeadersTotalSize = 32 * 1024; // 32KB
    serverOptions.Limits.MaxRequestLineSize = 8 * 1024; // 8KB
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
});

// Configure services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for JSON serialization to match JavaScript/TypeScript conventions
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Don't ignore null values - include them in responses for consistency
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });
builder.Services.AddAppConfiguration(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddAIServices(builder.Configuration);
builder.Services.AddRagServices(builder.Configuration);
builder.Services.AddValidators();
builder.Services.AddCustomCors(builder.Configuration);
builder.Services.AddSwaggerDocumentation();
builder.Services.AddCustomHealthChecks();
builder.Services.AddRateLimiting();
builder.Services.AddApiVersioningConfig();

var app = builder.Build();

// Apply database schema on startup
var isDesktopMode = Environment.GetEnvironmentVariable("SecondBrain__DesktopMode") == "true";
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        logger.LogInformation("Checking database status...");

        var canConnect = await dbContext.Database.CanConnectAsync();
        if (!canConnect)
        {
            // Database doesn't exist - create it with migrations
            logger.LogInformation("Database does not exist. Creating with migrations...");
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Database created successfully.");
        }
        else
        {
            // Database exists - check if it was created with EnsureCreated (no migrations history)
            // or if it needs migration updates
            try
            {
                var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();
                var appliedMigrations = (await dbContext.Database.GetAppliedMigrationsAsync()).ToList();

                if (appliedMigrations.Count == 0 && pendingMigrations.Count > 0)
                {
                    // Database was likely created with EnsureCreated - need to apply schema updates manually
                    logger.LogInformation("Detected database without migration history. Applying schema updates...");
                    await ApplySoftDeleteColumnsIfMissing(dbContext, logger);

                    // Mark all migrations as applied since the schema should now be current
                    foreach (var migration in pendingMigrations)
                    {
                        await dbContext.Database.ExecuteSqlRawAsync(
                            "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({0}, {1}) ON CONFLICT DO NOTHING",
                            migration, "10.0.0");
                    }
                    logger.LogInformation("Schema updates applied successfully.");
                }
                else if (pendingMigrations.Count > 0)
                {
                    // Normal migration path
                    logger.LogInformation("Applying {Count} pending migration(s): {Migrations}",
                        pendingMigrations.Count, string.Join(", ", pendingMigrations));
                    await dbContext.Database.MigrateAsync();
                    logger.LogInformation("Database migrations applied successfully.");
                }
                else
                {
                    logger.LogInformation("Database is up-to-date. No pending migrations.");
                }
            }
            catch (Exception ex) when (ex.Message.Contains("__EFMigrationsHistory"))
            {
                // Migrations history table doesn't exist - database was created with EnsureCreated
                logger.LogInformation("Migrations history table not found. Creating migrations history table and applying schema updates...");
                await ApplySoftDeleteColumnsIfMissing(dbContext, logger);

                // Create the migrations history table manually
                await dbContext.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                        ""MigrationId"" character varying(150) NOT NULL,
                        ""ProductVersion"" character varying(32) NOT NULL,
                        CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                    )");

                // Get all migrations from the assembly and mark them as applied
                // (since the schema was created with EnsureCreated, all tables already exist)
                var allMigrations = dbContext.Database.GetMigrations().ToList();
                foreach (var migration in allMigrations)
                {
                    await dbContext.Database.ExecuteSqlRawAsync(
                        "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({0}, {1}) ON CONFLICT DO NOTHING",
                        migration, "10.0.0");
                }
                logger.LogInformation("Migrations history table created and {Count} migration(s) marked as applied.", allMigrations.Count);
            }
        }

        if (isDesktopMode)
        {
            // Desktop mode: also ensure performance indexes exist
            var indexInitializer = new DatabaseIndexInitializer(
                dbContext,
                scope.ServiceProvider.GetRequiredService<ILogger<DatabaseIndexInitializer>>());
            await indexInitializer.EnsureIndexesAsync();
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database initialization failed. Error: {Message}", ex.Message);
    }
}

// Helper method to apply soft delete columns if they don't exist
static async Task ApplySoftDeleteColumnsIfMissing(ApplicationDbContext dbContext, ILogger<Program> logger)
{
    var commands = new[]
    {
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "CREATE INDEX IF NOT EXISTS ix_notes_user_deleted ON notes (user_id, is_deleted)",
        "CREATE INDEX IF NOT EXISTS ix_conversations_user_deleted ON chat_conversations (user_id, is_deleted)"
    };

    foreach (var command in commands)
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(command);
        }
        catch (Exception ex)
        {
            logger.LogDebug("Command skipped (may already exist): {Command}. Error: {Error}", command, ex.Message);
        }
    }
}

// Configure middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Only use HTTPS redirection when HTTPS port is configured
var httpsPort = builder.Configuration.GetValue<int?>("ASPNETCORE_HTTPS_PORT")
    ?? builder.Configuration.GetValue<int?>("Https:Port");
if (httpsPort.HasValue)
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

// Serilog request logging with enriched diagnostics
app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
        diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        // Add user ID if authenticated
        var userId = httpContext.Items["UserId"]?.ToString();
        if (!string.IsNullOrEmpty(userId))
        {
            diagnosticContext.Set("UserId", userId);
        }
    };
});

// Security headers
app.UseSecurityHeaders();

// Authentication must run before rate limiting so user-based rate limiting works
// (GetRateLimitPartitionKey checks context.Items["UserId"] set by ApiKeyAuthenticationMiddleware)
app.UseMiddleware<ApiKeyAuthenticationMiddleware>();

// Rate limiting (using built-in ASP.NET Core rate limiter)
app.UseRateLimiter();

// Custom middleware (logging, error handling)
app.UseCustomMiddleware();

// Map controllers and health checks
app.MapControllers();
app.MapHealthChecks("/api/health");

// Display startup banner when server is ready
app.Lifetime.ApplicationStarted.Register(() =>
{
    var urls = app.Urls;
    var logger = app.Services.GetRequiredService<ILogger<Program>>();

    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════════════╗");
    Console.WriteLine("║           Second Brain API - Running!                    ║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════╣");
    foreach (var url in urls)
    {
        var paddedUrl = $"  {url}".PadRight(58);
        Console.WriteLine($"║{paddedUrl}║");
    }
    Console.WriteLine("╠══════════════════════════════════════════════════════════╣");
    Console.WriteLine("║  API Docs:  /scalar/v1                                   ║");
    Console.WriteLine("║  Health:    /api/health                                  ║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════╣");
    Console.WriteLine("║  Press Ctrl+C to shut down                               ║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════╝");
    Console.WriteLine();

    logger.LogInformation("Second Brain API started successfully on {Urls}", string.Join(", ", urls));
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    Console.WriteLine();
    Console.WriteLine("Second Brain API shutting down...");
});

app.Run();
