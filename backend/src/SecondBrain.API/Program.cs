using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SecondBrain.API.Extensions;
using SecondBrain.API.Middleware;
using SecondBrain.API.Serialization;
using SecondBrain.API.Telemetry;
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
        { "COHERE_API_KEY", "AIProviders__Cohere__ApiKey" },
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
    // BUT only if POSTGRES_HOST or POSTGRES_PORT is explicitly set, to avoid overwriting
    // a connection string already passed via environment (e.g., from Tauri desktop app)
    var existingConnString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
    var pgHostEnv = Environment.GetEnvironmentVariable("POSTGRES_HOST");
    var pgPortEnv = Environment.GetEnvironmentVariable("POSTGRES_PORT");

    // Only build connection string from individual vars if at least one is set,
    // or if no connection string was provided
    if (!string.IsNullOrEmpty(pgHostEnv) || !string.IsNullOrEmpty(pgPortEnv) || string.IsNullOrEmpty(existingConnString))
    {
        var pgHost = pgHostEnv ?? "localhost";
        var pgPort = pgPortEnv ?? "5432";
        var pgDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "secondbrain";
        var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
        var pgPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";

        var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPassword}";
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", connectionString);
    }

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

    // Git Integration
    var gitAllowedRoots = Environment.GetEnvironmentVariable("GIT_ALLOWED_REPOSITORY_ROOTS");
    if (!string.IsNullOrEmpty(gitAllowedRoots))
    {
        // Support comma-separated list of paths
        var roots = gitAllowedRoots.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        for (var i = 0; i < roots.Length; i++)
        {
            Environment.SetEnvironmentVariable($"Git__AllowedRepositoryRoots__{i}", roots[i]);
        }
    }

    var gitRequireUserScoped = Environment.GetEnvironmentVariable("GIT_REQUIRE_USER_SCOPED_ROOT");
    if (!string.IsNullOrEmpty(gitRequireUserScoped)) Environment.SetEnvironmentVariable("Git__RequireUserScopedRoot", gitRequireUserScoped);

    // GitHub Integration
    var githubToken = Environment.GetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN");
    if (!string.IsNullOrEmpty(githubToken)) Environment.SetEnvironmentVariable("GitHub__PersonalAccessToken", githubToken);

    var githubOwner = Environment.GetEnvironmentVariable("GITHUB_DEFAULT_OWNER");
    if (!string.IsNullOrEmpty(githubOwner)) Environment.SetEnvironmentVariable("GitHub__DefaultOwner", githubOwner);

    var githubRepo = Environment.GetEnvironmentVariable("GITHUB_DEFAULT_REPO");
    if (!string.IsNullOrEmpty(githubRepo)) Environment.SetEnvironmentVariable("GitHub__DefaultRepo", githubRepo);

    // Voice Services (ElevenLabs and Deepgram)
    var elevenLabsKey = Environment.GetEnvironmentVariable("ELEVEN_LABS_API_KEY");
    if (!string.IsNullOrEmpty(elevenLabsKey)) Environment.SetEnvironmentVariable("Voice__ElevenLabs__ApiKey", elevenLabsKey);

    var deepgramKey = Environment.GetEnvironmentVariable("ELEVEN_LABS_DEEPGRAM_API_KEY");
    if (!string.IsNullOrEmpty(deepgramKey)) Environment.SetEnvironmentVariable("Voice__Deepgram__ApiKey", deepgramKey);
}

Console.WriteLine();
Console.WriteLine("╔══════════════════════════════════════════════════════════╗");
Console.WriteLine("║           Second Brain API - Starting...                 ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════╝");
Console.WriteLine();

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog for structured logging
// Determine the appropriate logs directory based on the runtime environment
var logsPath = GetLogsDirectory();
Directory.CreateDirectory(logsPath);

// Helper function to get the appropriate logs directory
// macOS app bundles are read-only after code signing, so logs must go to Application Support
static string GetLogsDirectory()
{
    var baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

    // Check if running inside a macOS .app bundle
    // App bundles have paths like: /Applications/Second Brain.app/Contents/MacOS/
    if (baseDirectory.Contains(".app/Contents/", StringComparison.OrdinalIgnoreCase) &&
        OperatingSystem.IsMacOS())
    {
        // Use ~/Library/Application Support/com.secondbrain.desktop/logs
        var appSupportPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        if (string.IsNullOrEmpty(appSupportPath))
        {
            // Fallback: construct path manually
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            appSupportPath = Path.Combine(home, "Library", "Application Support");
        }
        return Path.Combine(appSupportPath, "com.secondbrain.desktop", "logs");
    }

    // For development, Docker, or non-macOS deployments, use the base directory
    return Path.Combine(baseDirectory, "logs");
}

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", TelemetryConfiguration.ServiceName)
        .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
        .Enrich.WithMachineName()
        // Add trace context from OpenTelemetry Activity
        .Enrich.With(new TraceIdEnricher())
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
            outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{TraceId}:{SpanId}] {Message:lj}{NewLine}{Exception}");

    // Set minimum level based on environment
    if (context.HostingEnvironment.IsDevelopment())
    {
        configuration.MinimumLevel.Debug()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .MinimumLevel.Override("OpenTelemetry", LogEventLevel.Warning);
    }
    else
    {
        configuration.MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .MinimumLevel.Override("OpenTelemetry", LogEventLevel.Warning);
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
        // Use source-generated JSON context for better performance
        options.JsonSerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        // Use camelCase for JSON serialization to match JavaScript/TypeScript conventions
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Don't ignore null values - include them in responses for consistency
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// Core configuration and infrastructure
builder.Services.AddAppConfiguration(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddAIServices(builder.Configuration);
builder.Services.AddRagServices(builder.Configuration);
builder.Services.AddVoiceServices(builder.Configuration);
builder.Services.AddValidators();

// Performance and observability
builder.Services.AddOpenTelemetryServices(builder.Configuration, builder.Environment);
builder.Services.AddHybridCacheServices(builder.Configuration);
builder.Services.AddResponseCompressionServices();
builder.Services.AddOutputCachingServices();

// API infrastructure
builder.Services.AddCustomCors(builder.Configuration);
builder.Services.AddSwaggerDocumentation();
builder.Services.AddCustomHealthChecks();
builder.Services.AddRateLimiting();
builder.Services.AddApiVersioningConfig();

// Problem Details for RFC 9457 compliant error responses
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance = context.HttpContext.Request.Path;
        context.ProblemDetails.Extensions["traceId"] =
            System.Diagnostics.Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
        context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
    };
});

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
    // 6. AddPerformanceIndexes - adds rag_query_logs, generated_images, search_vector, etc.
    // 7. AddSoftDeleteSupport - adds soft delete columns
    // 8. AddEmbeddingFieldsToIndexingJobs - adds embedding_provider and embedding_model to indexing_jobs
    // 9. AddRerankingProviderToUserPreferences - adds reranking_provider to user_preferences
    // 10. AddNoteSummarySettings - adds summary to notes, note_summary_* columns to user_preferences
    // 11. AddRagFeatureToggles - adds rag_enable_* columns to user_preferences

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
        
        // === AddPerformanceIndexes migration ===
        // Add search_vector column to note_embeddings
        "ALTER TABLE note_embeddings ADD COLUMN IF NOT EXISTS search_vector tsvector",
        
        // Add rag_feedback column to chat_messages
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS rag_feedback character varying(20)",
        
        // Add agent_rag_enabled and image_generation_enabled columns to chat_conversations
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS agent_rag_enabled boolean NOT NULL DEFAULT FALSE",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS image_generation_enabled boolean NOT NULL DEFAULT FALSE",
        
        // Create generated_images table
        @"CREATE TABLE IF NOT EXISTS generated_images (
            id text NOT NULL,
            message_id character varying(128) NOT NULL,
            base64_data text,
            url character varying(2048),
            revised_prompt text,
            media_type character varying(100) NOT NULL,
            width integer,
            height integer,
            CONSTRAINT ""PK_generated_images"" PRIMARY KEY (id),
            CONSTRAINT ""FK_generated_images_chat_messages_message_id"" FOREIGN KEY (message_id) 
                REFERENCES chat_messages(id) ON DELETE CASCADE
        )",
        "CREATE INDEX IF NOT EXISTS ix_generated_images_message_id ON generated_images (message_id)",
        
        // Create rag_query_logs table for RAG analytics
        @"CREATE TABLE IF NOT EXISTS rag_query_logs (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            user_id character varying(255) NOT NULL,
            conversation_id character varying(255),
            query text NOT NULL,
            query_embedding_time_ms integer,
            vector_search_time_ms integer,
            bm25_search_time_ms integer,
            rerank_time_ms integer,
            total_time_ms integer,
            retrieved_count integer,
            final_count integer,
            avg_cosine_score real,
            avg_bm25_score real,
            avg_rerank_score real,
            top_cosine_score real,
            top_rerank_score real,
            hybrid_search_enabled boolean NOT NULL DEFAULT FALSE,
            hyde_enabled boolean NOT NULL DEFAULT FALSE,
            multi_query_enabled boolean NOT NULL DEFAULT FALSE,
            reranking_enabled boolean NOT NULL DEFAULT FALSE,
            user_feedback character varying(20),
            feedback_category character varying(50),
            feedback_comment text,
            created_at timestamp with time zone NOT NULL DEFAULT NOW(),
            topic_cluster integer,
            topic_label character varying(100),
            query_embedding text,
            CONSTRAINT ""PK_rag_query_logs"" PRIMARY KEY (id)
        )",
        "CREATE INDEX IF NOT EXISTS ix_rag_query_logs_user_id ON rag_query_logs (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_rag_query_logs_created_at ON rag_query_logs (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_rag_query_logs_conversation ON rag_query_logs (conversation_id)",
        "CREATE INDEX IF NOT EXISTS ix_rag_logs_user_created ON rag_query_logs (user_id, created_at DESC)",
        
        // === AddSoftDeleteSupport migration ===
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS deleted_by character varying(128)",
        "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE",
        "CREATE INDEX IF NOT EXISTS ix_notes_user_deleted ON notes (user_id, is_deleted)",
        "CREATE INDEX IF NOT EXISTS ix_conversations_user_deleted ON chat_conversations (user_id, is_deleted)",
        
        // === AddEmbeddingFieldsToIndexingJobs migration ===
        "ALTER TABLE indexing_jobs ADD COLUMN IF NOT EXISTS embedding_provider character varying(50) NOT NULL DEFAULT ''",
        "ALTER TABLE indexing_jobs ADD COLUMN IF NOT EXISTS embedding_model character varying(100) NOT NULL DEFAULT ''",
        
        // === AddRerankingProviderToUserPreferences ===
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS reranking_provider character varying(50)",
        
        // === AddNoteSummarySettings ===
        // Add summary column to notes table
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary text",
        
        // Add note summary user preference columns
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_enabled boolean NOT NULL DEFAULT TRUE",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_provider character varying(50) DEFAULT 'OpenAI'",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS note_summary_model character varying(100) DEFAULT 'gpt-4o-mini'",
        
        // === AddNoteSummaryToEmbeddings ===
        // Add note_summary column to note_embeddings for improved RAG context
        "ALTER TABLE note_embeddings ADD COLUMN IF NOT EXISTS note_summary text",
        
        // === AddPreToolTextToToolCalls ===
        // Add pre_tool_text column to tool_calls for interleaved timeline persistence
        "ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS pre_tool_text text",

        // === AddRagFeatureToggles ===
        // Add RAG feature toggle columns to user_preferences
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_hyde boolean NOT NULL DEFAULT TRUE",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_query_expansion boolean NOT NULL DEFAULT TRUE",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_hybrid_search boolean NOT NULL DEFAULT TRUE",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_reranking boolean NOT NULL DEFAULT TRUE",
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_enable_analytics boolean NOT NULL DEFAULT TRUE"
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
            // If the error indicates the table/relation doesn't exist, this is a critical failure
            // (not just a "column already exists" type error)
            // PostgreSQL errors look like: relation "table_name" does not exist
            if ((ex.Message.Contains("table", StringComparison.OrdinalIgnoreCase) ||
                 ex.Message.Contains("relation", StringComparison.OrdinalIgnoreCase)) &&
                ex.Message.Contains("does not exist", StringComparison.OrdinalIgnoreCase))
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

// Response compression (before routing for maximum effectiveness)
app.UseResponseCompression();

app.UseCors("AllowFrontend");

// Enable WebSockets for voice agent
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

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

// Output caching (after authentication so cache can vary by user)
app.UseOutputCache();

// Map controllers
app.MapControllers();

// Map health check endpoints with detailed JSON responses
app.MapHealthChecks("/api/health", new HealthCheckOptions
{
    ResponseWriter = WriteDetailedHealthCheckResponse
});

app.MapHealthChecks("/api/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteDetailedHealthCheckResponse
});

app.MapHealthChecks("/api/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live"),
    ResponseWriter = WriteDetailedHealthCheckResponse
});

// Health check response writer
static async Task WriteDetailedHealthCheckResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var response = new HealthCheckResponse
    {
        Status = report.Status.ToString(),
        Duration = report.TotalDuration.TotalMilliseconds,
        Checks = report.Entries.Select(e => new HealthCheckEntry
        {
            Name = e.Key,
            Status = e.Value.Status.ToString(),
            Duration = e.Value.Duration.TotalMilliseconds,
            Description = e.Value.Description,
            Data = e.Value.Data?.ToDictionary(d => d.Key, d => d.Value),
            Exception = e.Value.Exception?.Message
        }).ToList()
    };

    var options = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
}

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
