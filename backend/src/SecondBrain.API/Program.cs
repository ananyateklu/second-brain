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
                    // Check if core tables actually exist (EnsureCreated scenario)
                    var tablesExist = await DoCoreTablesExist(dbContext);

                    if (tablesExist)
                    {
                        // Database was created with EnsureCreated - tables exist, apply schema updates
                        logger.LogInformation("Detected database with existing tables but no migration history. Applying all migration schema updates...");
                        var schemaUpdatesSucceeded = await ApplyAllMigrationSchemaIfMissing(dbContext, logger);

                        if (schemaUpdatesSucceeded)
                        {
                            // Only mark migrations as applied if schema updates succeeded
                            foreach (var migration in pendingMigrations)
                            {
                                await dbContext.Database.ExecuteSqlRawAsync(
                                    "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({0}, {1}) ON CONFLICT DO NOTHING",
                                    migration, "10.0.0");
                            }
                            logger.LogInformation("Schema updates applied and {Count} migration(s) marked as applied.", pendingMigrations.Count);
                        }
                        else
                        {
                            // Schema updates failed - tables might not exist as expected, run full migrations
                            logger.LogWarning("Schema updates failed. Running full migration to ensure database consistency...");
                            await dbContext.Database.MigrateAsync();
                            logger.LogInformation("Database migrations applied successfully.");
                        }
                    }
                    else
                    {
                        // Database exists but is empty - run full migrations
                        logger.LogInformation("Database exists but core tables are missing. Running migrations to create schema...");
                        await dbContext.Database.MigrateAsync();
                        logger.LogInformation("Database schema created successfully via migrations.");
                    }
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
                // Migrations history table doesn't exist - check if tables were created with EnsureCreated
                logger.LogInformation("Migrations history table not found. Checking database state...");

                var tablesExist = await DoCoreTablesExist(dbContext);

                if (tablesExist)
                {
                    // Tables exist but no migration history - database was created with EnsureCreated
                    logger.LogInformation("Core tables found. Applying all migration schema updates and creating migration history...");
                    var schemaUpdatesSucceeded = await ApplyAllMigrationSchemaIfMissing(dbContext, logger);

                    if (schemaUpdatesSucceeded)
                    {
                        // Create the migrations history table manually
                        await dbContext.Database.ExecuteSqlRawAsync(@"
                            CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                                ""MigrationId"" character varying(150) NOT NULL,
                                ""ProductVersion"" character varying(32) NOT NULL,
                                CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                            )");

                        // Mark all migrations as applied since tables already exist
                        var allMigrations = dbContext.Database.GetMigrations().ToList();
                        foreach (var migration in allMigrations)
                        {
                            await dbContext.Database.ExecuteSqlRawAsync(
                                "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({0}, {1}) ON CONFLICT DO NOTHING",
                                migration, "10.0.0");
                        }
                        logger.LogInformation("Migrations history table created and {Count} migration(s) marked as applied.", allMigrations.Count);
                    }
                    else
                    {
                        // Schema updates failed - run full migrations for consistency
                        logger.LogWarning("Schema updates failed. Running full migration...");
                        await dbContext.Database.MigrateAsync();
                        logger.LogInformation("Database migrations applied successfully.");
                    }
                }
                else
                {
                    // Database is empty - run full migrations to create all tables
                    logger.LogInformation("Database is empty. Running migrations to create schema...");
                    await dbContext.Database.MigrateAsync();
                    logger.LogInformation("Database schema created successfully via migrations.");
                }
            }
        }

        // Ensure performance indexes exist for all deployment modes
        // This is safe to call on every startup - uses IF NOT EXISTS for all indexes
        var indexInitializer = new DatabaseIndexInitializer(
            dbContext,
            scope.ServiceProvider.GetRequiredService<ILogger<DatabaseIndexInitializer>>());
        await indexInitializer.EnsureIndexesAsync();
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database initialization failed. Error: {Message}", ex.Message);
    }
}

// Helper method to check if core tables exist in the database
static async Task<bool> DoCoreTablesExist(ApplicationDbContext dbContext)
{
    try
    {
        // Check if the 'notes' and 'users' tables exist (core tables that should always exist)
        var tableCheckSql = @"
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('notes', 'users', 'chat_conversations')";

        // GetDbConnection() returns EF Core's managed connection - do NOT dispose it
        var connection = dbContext.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;

        if (!wasOpen)
        {
            await connection.OpenAsync();
        }

        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = tableCheckSql;
            var result = await command.ExecuteScalarAsync();

            // We expect at least 3 core tables to exist
            return result != null && Convert.ToInt32(result) >= 3;
        }
        finally
        {
            // Restore connection to its original state if we opened it
            if (!wasOpen && connection.State == System.Data.ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }
    catch
    {
        return false;
    }
}

// Helper method to apply ALL schema changes from migrations if they don't exist
// This ensures databases created with EnsureCreated() have all columns/tables before marking migrations as applied
// Returns true if all commands succeeded, false if any critical command failed
static async Task<bool> ApplyAllMigrationSchemaIfMissing(ApplicationDbContext dbContext, ILogger<Program> logger)
{
    // Schema changes from all migrations (in order):
    // 1. InitialCreate - creates core tables (handled by EnsureCreated)
    // 2. AddPasswordAuth - adds password_hash, drops firebase_uid
    // 3. AddMessageImages - creates message_images table
    // 4. AddOllamaRemoteSettings - adds ollama remote columns to user_preferences
    // 5. AddRagLogIdToMessages - adds rag_log_id to chat_messages
    // 6. AddPerformanceIndexes - adds performance indexes (handled by DatabaseIndexInitializer)
    // 7. AddSoftDeleteSupport - adds soft delete columns

    var commands = new[]
    {
        // === AddPasswordAuth migration ===
        // Add password_hash column to users (if missing)
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash character varying(256)",
        // Note: We don't drop firebase_uid if it exists - schema may have been created without it
        
        // === AddMessageImages migration ===
        // Create message_images table if it doesn't exist
        @"CREATE TABLE IF NOT EXISTS message_images (
            id text NOT NULL,
            message_id character varying(128) NOT NULL,
            base64_data text NOT NULL,
            media_type character varying(100) NOT NULL,
            file_name character varying(255),
            CONSTRAINT ""PK_message_images"" PRIMARY KEY (id),
            CONSTRAINT ""FK_message_images_chat_messages_message_id"" FOREIGN KEY (message_id) 
                REFERENCES chat_messages(id) ON DELETE CASCADE
        )",
        "CREATE INDEX IF NOT EXISTS ix_message_images_message_id ON message_images (message_id)",
        
        // === AddOllamaRemoteSettings migration ===
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ollama_remote_url character varying(256)",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS use_remote_ollama boolean NOT NULL DEFAULT FALSE",
        
        // === AddRagLogIdToMessages migration ===
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS rag_log_id character varying(128)",
        
        // === AddSoftDeleteSupport migration ===
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "CREATE INDEX IF NOT EXISTS ix_notes_user_deleted ON notes (user_id, is_deleted)",
        "CREATE INDEX IF NOT EXISTS ix_conversations_user_deleted ON chat_conversations (user_id, is_deleted)"
    };

    var allSucceeded = true;
    foreach (var command in commands)
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(command);
        }
        catch (Exception ex)
        {
            // If the error indicates the table doesn't exist, this is a critical failure
            // (not just a "column already exists" type error)
            if (ex.Message.Contains("does not exist", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("relation") && ex.Message.Contains("does not exist", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("Schema update failed - table may not exist: {Command}. Error: {Error}", command, ex.Message);
                allSucceeded = false;
            }
            else
            {
                logger.LogDebug("Command skipped (may already exist): {Command}. Error: {Error}", command, ex.Message);
            }
        }
    }

    return allSucceeded;
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
