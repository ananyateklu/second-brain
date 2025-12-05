using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SecondBrain.API.Configuration;
using SecondBrain.API.HealthChecks;
using SecondBrain.API.Middleware;
using SecondBrain.API.Services;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.CircuitBreaker;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Providers;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Application.Validators;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Infrastructure.VectorStore;
using SecondBrain.API.Controllers;

namespace SecondBrain.API.Extensions;

/// <summary>
/// Extension methods for configuring services in the DI container
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers application services
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddHttpClient();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IChatConversationService, ChatConversationService>();
        services.AddScoped<INotesImportService, NotesImportService>();
        services.AddScoped<IUserPreferencesService, UserPreferencesService>();
        services.AddScoped<IStatsService, StatsService>();
        return services;
    }

    /// <summary>
    /// Registers JWT authentication services
    /// </summary>
    public static IServiceCollection AddJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure JWT settings
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));

        var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
            ?? new JwtSettings();

        // Validate JWT secret key
        if (string.IsNullOrEmpty(jwtSettings.SecretKey) || jwtSettings.SecretKey.Length < 32)
        {
            throw new InvalidOperationException("JWT SecretKey must be at least 32 characters long. Configure it in appsettings.json under Jwt:SecretKey");
        }

        // Add Authentication
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        // Register auth services
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IPasswordService, PasswordService>();

        return services;
    }

    /// <summary>
    /// Registers AI provider services
    /// </summary>
    public static IServiceCollection AddAIServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure AI provider settings
        services.Configure<AIProvidersSettings>(configuration.GetSection(AIProvidersSettings.SectionName));
        services.Configure<CircuitBreakerSettings>(configuration.GetSection(CircuitBreakerSettings.SectionName));

        // Register client factories for testability
        services.AddSingleton<IAnthropicClientFactory, AnthropicClientFactory>();
        services.AddSingleton<IOpenAIClientFactory, OpenAIClientFactory>();

        // Register AI providers as singletons (they maintain their own state)
        services.AddSingleton<OpenAIProvider>();
        services.AddSingleton<ClaudeProvider>();
        services.AddSingleton<GeminiProvider>();
        services.AddSingleton<OllamaProvider>();
        services.AddSingleton<GrokProvider>();

        // Register the base AI provider factory
        services.AddSingleton<AIProviderFactory>();

        // Register the circuit breaker as singleton (maintains state across requests)
        services.AddSingleton<AIProviderCircuitBreaker>();

        // Register the circuit breaker factory decorator as the IAIProviderFactory
        services.AddSingleton<IAIProviderFactory>(sp =>
        {
            var innerFactory = sp.GetRequiredService<AIProviderFactory>();
            var circuitBreaker = sp.GetRequiredService<AIProviderCircuitBreaker>();
            var logger = sp.GetRequiredService<ILogger<CircuitBreakerAIProviderFactory>>();
            return new CircuitBreakerAIProviderFactory(innerFactory, circuitBreaker, logger);
        });

        // Register image generation providers
        services.AddSingleton<OpenAIImageProvider>();
        services.AddSingleton<GeminiImageProvider>();
        services.AddSingleton<GrokImageProvider>();

        // Register image generation providers in the collection for factory
        services.AddSingleton<IImageGenerationProvider, OpenAIImageProvider>(sp => sp.GetRequiredService<OpenAIImageProvider>());
        services.AddSingleton<IImageGenerationProvider, GeminiImageProvider>(sp => sp.GetRequiredService<GeminiImageProvider>());
        services.AddSingleton<IImageGenerationProvider, GrokImageProvider>(sp => sp.GetRequiredService<GrokImageProvider>());

        // Register image generation factory
        services.AddSingleton<IImageGenerationProviderFactory, ImageGenerationProviderFactory>();

        // Register Agent service for agent mode functionality
        services.AddScoped<IAgentService, AgentService>();

        return services;
    }

    /// <summary>
    /// Registers infrastructure services (repositories, database)
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Get PostgreSQL connection string
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("PostgreSQL connection string 'DefaultConnection' is missing");

        // Register ApplicationDbContext with PostgreSQL
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.UseVector();
                npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
            });
        });

        // Register repositories
        services.AddScoped<INoteRepository, SqlNoteRepository>();
        services.AddScoped<IUserRepository, SqlUserRepository>();
        services.AddScoped<IChatRepository, SqlChatRepository>();
        services.AddScoped<INoteEmbeddingRepository, SqlNoteEmbeddingRepository>();
        services.AddScoped<IIndexingJobRepository, SqlIndexingJobRepository>();

        return services;
    }

    /// <summary>
    /// Registers FluentValidation validators
    /// </summary>
    public static IServiceCollection AddValidators(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<CreateNoteRequestValidator>();
        return services;
    }

    /// <summary>
    /// Configures CORS policy
    /// </summary>
    public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
    {
        var corsSettings = configuration.GetSection("Cors").Get<CorsSettings>() ?? new CorsSettings();

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrEmpty(origin))
                        return false;

                    // Check configured allowed origins
                    if (corsSettings.AllowedOrigins.Any(allowed =>
                        origin.Equals(allowed, StringComparison.OrdinalIgnoreCase)))
                        return true;

                    // Check if local network IPs are allowed
                    if (corsSettings.AllowLocalNetworkIps && CorsHelper.IsLocalNetworkOrigin(origin))
                        return true;

                    return false;
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            });
        });

        return services;
    }

    /// <summary>
    /// Configures Swagger/OpenAPI documentation
    /// </summary>
    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        // Using built-in OpenAPI support in .NET 10
        services.AddOpenApi();

        return services;
    }

    /// <summary>
    /// Configures API versioning with URL segment and header support
    /// </summary>
    public static IServiceCollection AddApiVersioningConfig(this IServiceCollection services)
    {
        services.AddApiVersioning(options =>
        {
            // Default to version 1.0 when not specified
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;

            // Report supported versions in response headers
            options.ReportApiVersions = true;

            // Support multiple version readers
            options.ApiVersionReader = ApiVersionReader.Combine(
                // URL segment: /api/v1/notes
                new UrlSegmentApiVersionReader(),
                // Header: X-Api-Version: 1.0
                new HeaderApiVersionReader("X-Api-Version"),
                // Query string: ?api-version=1.0
                new QueryStringApiVersionReader("api-version")
            );
        })
        .AddApiExplorer(options =>
        {
            // Format the version as 'v'major[.minor]
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

        return services;
    }

    /// <summary>
    /// Registers health checks
    /// </summary>
    public static IServiceCollection AddCustomHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck<PostgresHealthCheck>("postgresql");

        return services;
    }

    /// <summary>
    /// Configures rate limiting policies
    /// </summary>
    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // Global rate limiter - applies to all endpoints
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetRateLimitPartitionKey(context),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            // AI-specific rate limiter - more restrictive for expensive AI operations
            options.AddPolicy("ai-requests", context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: GetRateLimitPartitionKey(context),
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 4,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 2
                    }));

            // Image generation rate limiter - even more restrictive
            options.AddPolicy("image-generation", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetRateLimitPartitionKey(context),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            // Configure rejection response
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.Headers.RetryAfter = "60";

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                }

                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    error = "Rate limit exceeded",
                    message = "Too many requests. Please try again later.",
                    retryAfter = context.HttpContext.Response.Headers.RetryAfter.ToString()
                }, cancellationToken);
            };
        });

        return services;
    }

    private static string GetRateLimitPartitionKey(HttpContext context)
    {
        // Prefer authenticated user ID over IP address
        var userId = context.User?.Identity?.Name;
        if (!string.IsNullOrEmpty(userId))
        {
            return $"user:{userId}";
        }

        // Fall back to IP address for unauthenticated requests
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return $"ip:{forwardedFor.Split(',')[0].Trim()}";
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return $"ip:{realIp}";
        }

        return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

    /// <summary>
    /// Registers configuration settings
    /// </summary>
    public static IServiceCollection AddAppConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<CorsSettings>(configuration.GetSection("Cors"));
        services.Configure<ApiSettings>(configuration);
        services.Configure<AIProvidersSettings>(configuration.GetSection(AIProvidersSettings.SectionName));
        services.Configure<EmbeddingProvidersSettings>(configuration.GetSection(EmbeddingProvidersSettings.SectionName));
        services.Configure<RagSettings>(configuration.GetSection(RagSettings.SectionName));
        services.Configure<PineconeSettings>(configuration.GetSection(PineconeSettings.SectionName));

        return services;
    }

    /// <summary>
    /// Registers RAG (Retrieval-Augmented Generation) services
    /// </summary>
    public static IServiceCollection AddRagServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure RAG settings
        services.Configure<EmbeddingProvidersSettings>(configuration.GetSection(EmbeddingProvidersSettings.SectionName));
        services.Configure<RagSettings>(configuration.GetSection(RagSettings.SectionName));
        services.Configure<CachedEmbeddingSettings>(configuration.GetSection(CachedEmbeddingSettings.SectionName));

        // Configure memory cache for embedding caching
        var cacheSettings = configuration.GetSection(CachedEmbeddingSettings.SectionName).Get<CachedEmbeddingSettings>()
            ?? new CachedEmbeddingSettings();

        services.AddMemoryCache(options =>
        {
            // Set size limit based on configuration (convert MB to approximate entry count)
            // Each embedding is ~6KB (1536 dimensions * 8 bytes), so 100MB = ~17000 entries
            options.SizeLimit = cacheSettings.MaxMemorySizeMB * 1024 * 1024 / 6000;
            options.CompactionPercentage = 0.25; // Remove 25% when limit reached
        });

        // Register embedding client factories for testability
        services.AddSingleton<SecondBrain.Application.Services.Embeddings.Interfaces.IOpenAIEmbeddingClientFactory,
                              SecondBrain.Application.Services.Embeddings.Interfaces.OpenAIEmbeddingClientFactory>();

        // Register embedding providers as singletons
        services.AddSingleton<OpenAIEmbeddingProvider>();
        services.AddSingleton<GeminiEmbeddingProvider>();
        services.AddSingleton<OllamaEmbeddingProvider>();
        services.AddSingleton<PineconeEmbeddingProvider>();

        // Register embedding providers in the collection for factory
        services.AddSingleton<IEmbeddingProvider, OpenAIEmbeddingProvider>(sp => sp.GetRequiredService<OpenAIEmbeddingProvider>());
        services.AddSingleton<IEmbeddingProvider, GeminiEmbeddingProvider>(sp => sp.GetRequiredService<GeminiEmbeddingProvider>());
        services.AddSingleton<IEmbeddingProvider, OllamaEmbeddingProvider>(sp => sp.GetRequiredService<OllamaEmbeddingProvider>());
        services.AddSingleton<IEmbeddingProvider, PineconeEmbeddingProvider>(sp => sp.GetRequiredService<PineconeEmbeddingProvider>());

        // Register the base embedding provider factory
        services.AddSingleton<EmbeddingProviderFactory>();

        // Register the cached embedding provider factory as the IEmbeddingProviderFactory
        // This decorates the base factory with caching capabilities
        services.AddSingleton<IEmbeddingProviderFactory>(sp =>
        {
            var innerFactory = sp.GetRequiredService<EmbeddingProviderFactory>();
            var cache = sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
            var logger = sp.GetRequiredService<ILogger<CachedEmbeddingProvider>>();
            var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<CachedEmbeddingSettings>>();
            return new CachedEmbeddingProviderFactory(innerFactory, cache, logger, settings);
        });

        // Register vector stores as concrete types (needed for CompositeVectorStore)
        services.AddScoped<PostgresVectorStore>();
        services.AddScoped<PineconeVectorStore>();

        // Register vector stores as keyed services for testable dependency injection
        services.AddKeyedScoped<IVectorStore, PostgresVectorStore>(VectorStoreKeys.PostgreSQL);
        services.AddKeyedScoped<IVectorStore, PineconeVectorStore>(VectorStoreKeys.Pinecone);

        // Register CompositeVectorStore as the default IVectorStore
        services.AddScoped<IVectorStore>(sp =>
        {
            var postgresStore = sp.GetRequiredService<PostgresVectorStore>();
            var pineconeStore = sp.GetRequiredService<PineconeVectorStore>();
            var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<RagSettings>>();
            var logger = sp.GetRequiredService<ILogger<CompositeVectorStore>>();
            return new CompositeVectorStore(postgresStore, pineconeStore, settings, logger);
        });

        // Register note embedding search repository for BM25 search
        services.AddScoped<INoteEmbeddingSearchRepository, SqlNoteEmbeddingSearchRepository>();

        // Register BM25 search service for hybrid search
        services.AddScoped<IBM25SearchService, BM25SearchService>();

        // Register hybrid search service (combines vector + BM25 with RRF fusion)
        services.AddScoped<IHybridSearchService, HybridSearchService>();

        // Register query expansion service (HyDE + multi-query)
        services.AddScoped<IQueryExpansionService, QueryExpansionService>();

        // Register reranking service (LLM-based relevance scoring)
        services.AddScoped<IRerankerService, RerankerService>();

        // Register RAG query log repository
        services.AddScoped<IRagQueryLogRepository, SqlRagQueryLogRepository>();

        // Register RAG analytics service for observability
        services.AddScoped<IRagAnalyticsService, RagAnalyticsService>();

        // Register topic clustering service for query analysis
        services.AddScoped<ITopicClusteringService, TopicClusteringService>();

        // Register core RAG services
        services.AddScoped<IChunkingService, ChunkingService>();
        services.AddScoped<IIndexingService, IndexingService>();
        services.AddScoped<IRagService, RagService>();

        return services;
    }
}

/// <summary>
/// Extension methods for configuring the application middleware pipeline
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Adds custom middleware to the pipeline
    /// </summary>
    public static IApplicationBuilder UseCustomMiddleware(this IApplicationBuilder app)
    {
        app.UseMiddleware<RequestLoggingMiddleware>();
        app.UseMiddleware<GlobalExceptionMiddleware>();
        app.UseMiddleware<ApiKeyAuthenticationMiddleware>();

        return app;
    }
}
