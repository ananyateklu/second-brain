using System.IO.Compression;
using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using SecondBrain.API.Configuration;
using SecondBrain.API.HealthChecks;
using SecondBrain.API.Middleware;
using SecondBrain.API.Serialization;
using SecondBrain.API.Services;
using SecondBrain.API.Telemetry;
using SecondBrain.Application.Behaviors;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.CircuitBreaker;
using SecondBrain.Application.Services.AI.FunctionCalling;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Providers;
using SecondBrain.Application.Services.AI.Caching;
using SecondBrain.Application.Services.AI.Search;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Providers;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Application.Validators;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Infrastructure.VectorStore;
using SecondBrain.API.Caching;
using SecondBrain.API.Controllers;

namespace SecondBrain.API.Extensions;

/// <summary>
/// Service key constants for vector stores
/// </summary>
public static class VectorStoreKeys
{
    public const string PostgreSQL = "PostgreSQL";
    public const string Pinecone = "Pinecone";
}

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

        // Register TimeProvider for testable time-dependent services
        services.AddSingleton(TimeProvider.System);

        // Register MediatR with pipeline behaviors
        services.AddMediatR(cfg =>
        {
            // Register all handlers from the Application assembly
            cfg.RegisterServicesFromAssembly(typeof(CreateNoteCommand).Assembly);

            // Add pipeline behaviors (order matters - they execute in registration order)
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // Keep existing services for backward compatibility during migration
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IChatConversationService, ChatConversationService>();
        services.AddScoped<INotesImportService, NotesImportService>();
        services.AddScoped<IUserPreferencesService, UserPreferencesService>();
        services.AddScoped<IStatsService, StatsService>();

        // Tool call analytics service (PostgreSQL 18 JSON_TABLE)
        services.AddScoped<IToolCallAnalyticsService, ToolCallAnalyticsService>();

        // PostgreSQL 18 Temporal Features - Version History and Session Tracking
        services.AddScoped<INoteVersionService, NoteVersionService>();
        services.AddScoped<IChatSessionService, ChatSessionService>();

        // AI-powered note summary service for list endpoint optimization
        services.AddScoped<INoteSummaryService, NoteSummaryService>();

        // Background summary generation service
        services.AddScoped<ISummaryGenerationBackgroundService, SummaryGenerationBackgroundService>();

        // Git authorization + integration services
        services.AddScoped<IGitAuthorizationService, GitAuthorizationService>();
        // Git integration service
        services.AddScoped<IGitService, GitService>();

        // GitHub API integration service
        services.AddScoped<IGitHubService, GitHubService>();

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
        services.AddSingleton<AIProviderCircuitBreaker>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<AIProviderCircuitBreaker>>();
            var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<CircuitBreakerSettings>>();
            var timeProvider = sp.GetRequiredService<TimeProvider>();
            return new AIProviderCircuitBreaker(logger, settings, timeProvider);
        });

        // Register the circuit breaker factory decorator as the IAIProviderFactory
        services.AddSingleton<IAIProviderFactory>(sp =>
        {
            var innerFactory = sp.GetRequiredService<AIProviderFactory>();
            var circuitBreaker = sp.GetRequiredService<AIProviderCircuitBreaker>();
            var logger = sp.GetRequiredService<ILogger<CircuitBreakerAIProviderFactory>>();
            var timeProvider = sp.GetRequiredService<TimeProvider>();
            return new CircuitBreakerAIProviderFactory(innerFactory, circuitBreaker, logger, timeProvider);
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

        // Register Gemini function registry for native function calling
        // The registry collects all IGeminiFunctionHandler implementations and provides them to the GeminiProvider
        services.AddScoped<IGeminiFunctionRegistry, GeminiFunctionRegistry>();

        // Register Gemini function handlers
        // These handlers wrap plugin functionality for Gemini's native function calling
        services.AddScoped<SecondBrain.Application.Services.AI.FunctionCalling.Handlers.NotesGeminiFunctionHandler>();
        services.AddScoped<IGeminiFunctionHandler>(sp =>
            sp.GetRequiredService<SecondBrain.Application.Services.AI.FunctionCalling.Handlers.NotesGeminiFunctionHandler>());

        // Register Ollama function registry for native function calling
        // The registry collects all IOllamaFunctionHandler implementations and provides them to the OllamaProvider
        services.AddScoped<IOllamaFunctionRegistry, OllamaFunctionRegistry>();

        // Register Ollama function handlers (similar pattern to Gemini)
        // Note: Ollama uses the same plugin infrastructure but with OllamaSharp Tool format

        // Register OpenAI function registry for native function calling
        // The registry collects all IOpenAIFunctionHandler implementations and provides them to the OpenAIProvider
        services.AddScoped<IOpenAIFunctionRegistry, OpenAIFunctionRegistry>();

        // Register OpenAI function handlers (similar pattern to Gemini and Ollama)
        // Note: OpenAI uses the same plugin infrastructure but with OpenAI ChatTool format

        // Register Grok function registry for native function calling
        // Grok uses OpenAI-compatible API, so patterns are similar to OpenAI
        services.AddScoped<IGrokFunctionRegistry, GrokFunctionRegistry>();

        // Register Grok search tools (Live Search and DeepSearch)
        services.AddScoped<GrokSearchTool>();
        services.AddScoped<GrokDeepSearchTool>();

        // Register Gemini Structured Output service for type-safe JSON generation (legacy interface)
        services.AddSingleton<IGeminiStructuredOutputService, GeminiStructuredOutputService>();

        // Register Gemini Context Cache service for reducing latency/costs with large contexts
        services.AddScoped<IGeminiCacheService, GeminiCacheService>();

        // Register Agent service helpers
        services.AddScoped<IToolExecutor, ToolExecutor>();
        services.AddSingleton<IThinkingExtractor, ThinkingExtractor>();
        services.AddScoped<IRagContextInjector, RagContextInjector>();
        services.AddScoped<IPluginToolBuilder, PluginToolBuilder>();
        services.AddSingleton<IAgentRetryPolicy, AgentRetryPolicy>(); // Unified retry policy with exponential backoff

        // Register Agent streaming strategies
        services.AddScoped<IAgentStreamingStrategy, AnthropicStreamingStrategy>();
        services.AddScoped<IAgentStreamingStrategy, GeminiStreamingStrategy>();
        services.AddScoped<IAgentStreamingStrategy, OpenAIStreamingStrategy>();
        services.AddScoped<IAgentStreamingStrategy, OllamaStreamingStrategy>();
        services.AddScoped<IAgentStreamingStrategy, GrokStreamingStrategy>();
        services.AddScoped<SemanticKernelStreamingStrategy>(); // Explicit fallback registration

        // Register Agent strategy factory
        services.AddScoped<IAgentStreamingStrategyFactory, AgentStreamingStrategyFactory>();

        // Register Agent service for agent mode functionality
        services.AddScoped<IAgentService, AgentService>();

        // Register unified structured output services (cross-provider)
        services.AddStructuredOutputServices(configuration);

        return services;
    }

    /// <summary>
    /// Registers unified structured output services for all AI providers.
    /// These services enable type-safe JSON generation across OpenAI, Claude, Gemini, Grok, and Ollama.
    /// </summary>
    public static IServiceCollection AddStructuredOutputServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure structured output settings
        services.Configure<StructuredOutputSettings>(configuration.GetSection(StructuredOutputSettings.SectionName));

        // Register provider-specific structured output services
        // Each implements IProviderStructuredOutputService for the unified factory
        services.AddSingleton<IProviderStructuredOutputService, OpenAIStructuredOutputService>();
        services.AddSingleton<IProviderStructuredOutputService, GrokStructuredOutputService>();
        services.AddSingleton<IProviderStructuredOutputService, GeminiStructuredOutputProviderService>();
        services.AddSingleton<IProviderStructuredOutputService, ClaudeStructuredOutputService>();
        services.AddSingleton<IProviderStructuredOutputService, OllamaStructuredOutputService>();

        // Register the unified structured output service
        // This resolves the appropriate provider based on configuration or explicit request
        services.AddSingleton<IStructuredOutputService, StructuredOutputService>();

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

            // Suppress PendingModelChangesWarning for desktop app (Tauri) scenarios
            // The desktop app uses ApplyAllMigrationSchemaIfMissing() for manual schema management
            // and may have model changes that haven't been captured in a formal migration yet
            options.ConfigureWarnings(warnings =>
                warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        });

        // Register DbContextFactory for parallel operations (thread-safe DbContext creation)
        // This allows creating isolated DbContext instances for concurrent database operations
        services.AddDbContextFactory<ApplicationDbContext>(options =>
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

            // Suppress PendingModelChangesWarning (same as AddDbContext above)
            options.ConfigureWarnings(warnings =>
                warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        });

        // Register repositories
        services.AddScoped<INoteRepository, SqlNoteRepository>();
        services.AddScoped<IUserRepository, SqlUserRepository>();
        services.AddScoped<IChatRepository, SqlChatRepository>();
        services.AddScoped<INoteEmbeddingRepository, SqlNoteEmbeddingRepository>();
        services.AddScoped<IIndexingJobRepository, SqlIndexingJobRepository>();
        services.AddScoped<ISummaryJobRepository, SqlSummaryJobRepository>();

        // Parallel-safe repository using DbContextFactory for concurrent operations
        // This enables safe parallel tool execution in agent mode
        services.AddScoped<IParallelNoteRepository, ParallelNoteRepository>();

        // Tool call analytics repository (PostgreSQL 18 JSON_TABLE)
        services.AddScoped<IToolCallAnalyticsRepository, SqlToolCallAnalyticsRepository>();

        // PostgreSQL 18 Temporal Features - Version History and Session Tracking Repositories
        services.AddScoped<INoteVersionRepository, SqlNoteVersionRepository>();
        services.AddScoped<IChatSessionRepository, SqlChatSessionRepository>();

        // Gemini Context Caching repository
        services.AddScoped<IGeminiCacheRepository, SqlGeminiCacheRepository>();

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
    /// Registers health checks for database, AI providers, vector store, and memory
    /// </summary>
    public static IServiceCollection AddCustomHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            // Database health check
            .AddCheck<PostgresHealthCheck>("postgresql",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                tags: new[] { "db", "ready" })
            // AI provider health check
            .AddCheck<AIProviderHealthCheck>("ai-providers",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                tags: new[] { "ai", "ready" })
            // Vector store health check
            .AddCheck<VectorStoreHealthCheck>("vector-store",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                tags: new[] { "vectorstore", "ready" })
            // Memory pressure health check
            .AddCheck<MemoryHealthCheck>("memory",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                tags: new[] { "memory", "live" });

        // Register health check publisher for metrics/alerting
        // Publishes health check results to OpenTelemetry metrics and logs
        services.Configure<HealthCheckPublisherOptions>(options =>
        {
            options.Delay = TimeSpan.FromSeconds(5);   // Initial delay before first publish
            options.Period = TimeSpan.FromSeconds(30); // Publish interval
        });
        services.AddSingleton<IHealthCheckPublisher, HealthCheckPublisher>();

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
        // Note: The custom ApiKeyAuthenticationMiddleware stores user ID in context.Items["UserId"]
        var userId = context.Items["UserId"]?.ToString();
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
        services.Configure<NoteSummarySettings>(configuration.GetSection(NoteSummarySettings.SectionName));
        services.Configure<GitSettings>(configuration.GetSection(GitSettings.SectionName));
        services.Configure<GitHubSettings>(configuration.GetSection(GitHubSettings.SectionName));

        return services;
    }

    /// <summary>
    /// Configures OpenTelemetry for distributed tracing and metrics
    /// </summary>
    public static IServiceCollection AddOpenTelemetryServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var otlpEndpoint = configuration["OpenTelemetry:OtlpEndpoint"] ?? "http://localhost:4317";
        var exportToConsole = configuration.GetValue<bool>("OpenTelemetry:ExportToConsole", environment.IsDevelopment());

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(
                    serviceName: TelemetryConfiguration.ServiceName,
                    serviceVersion: TelemetryConfiguration.ServiceVersion)
                .AddAttributes(new Dictionary<string, object>
                {
                    ["deployment.environment"] = environment.EnvironmentName
                }))
            .WithTracing(tracing =>
            {
                // Auto-instrumentation
                tracing.AddAspNetCoreInstrumentation(options =>
                {
                    options.RecordException = true;
                    options.Filter = httpContext =>
                    {
                        // Don't trace health check endpoints
                        var path = httpContext.Request.Path.Value;
                        return path != null && !path.StartsWith("/health") && !path.StartsWith("/api/health");
                    };
                })
                .AddHttpClientInstrumentation(options =>
                {
                    options.RecordException = true;
                    // Enrich with AI provider info
                    options.EnrichWithHttpRequestMessage = (activity, request) =>
                    {
                        if (request.RequestUri?.Host.Contains("openai") == true)
                            activity.SetTag("ai.provider", "OpenAI");
                        else if (request.RequestUri?.Host.Contains("anthropic") == true)
                            activity.SetTag("ai.provider", "Anthropic");
                        else if (request.RequestUri?.Host.Contains("googleapis") == true)
                            activity.SetTag("ai.provider", "Gemini");
                        else if (request.RequestUri?.Host.Contains("x.ai") == true)
                            activity.SetTag("ai.provider", "Grok");
                    };
                })
                .AddEntityFrameworkCoreInstrumentation(options =>
                {
                    options.SetDbStatementForText = true;
                })
                // Custom activity sources
                .AddSource(TelemetryConfiguration.AIProviderSource.Name)
                .AddSource(TelemetryConfiguration.RAGPipelineSource.Name)
                .AddSource(TelemetryConfiguration.AgentSource.Name)
                .AddSource(TelemetryConfiguration.EmbeddingSource.Name)
                .AddSource(TelemetryConfiguration.ChatSource.Name);

                // Exporters
                if (exportToConsole)
                {
                    tracing.AddConsoleExporter();
                }

                tracing.AddOtlpExporter(options =>
                {
                    options.Endpoint = new Uri(otlpEndpoint);
                });
            })
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddMeter(TelemetryConfiguration.AIMetrics.Name)
                .AddMeter(TelemetryConfiguration.RAGMetrics.Name)
                .AddMeter(TelemetryConfiguration.CacheMetrics.Name)
                .AddOtlpExporter());

        return services;
    }

    /// <summary>
    /// Configures HybridCache for two-tier caching with stampede protection
    /// </summary>
    public static IServiceCollection AddHybridCacheServices(this IServiceCollection services, IConfiguration configuration)
    {
#pragma warning disable EXTEXP0018 // HybridCache is experimental in .NET 9
        services.AddHybridCache(options =>
        {
            options.MaximumPayloadBytes = 1024 * 1024; // 1MB max item size
            options.MaximumKeyLength = 256;
            options.DefaultEntryOptions = new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(30),
                LocalCacheExpiration = TimeSpan.FromMinutes(5)
            };
        });
#pragma warning restore EXTEXP0018

        return services;
    }

    /// <summary>
    /// Configures response compression (Brotli and GZip)
    /// </summary>
    public static IServiceCollection AddResponseCompressionServices(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();

            // MIME types to compress
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
            {
                "application/json",
                "text/plain",
                "text/event-stream", // SSE responses
                "application/javascript",
                "text/css"
            });
        });

        services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest; // Balance speed vs. ratio
        });

        services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });

        return services;
    }

    /// <summary>
    /// Configures output caching for read endpoints
    /// </summary>
    public static IServiceCollection AddOutputCachingServices(this IServiceCollection services)
    {
        services.AddOutputCache(options =>
        {
            // Default policy
            options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(1)));

            // AI Health check caching - short duration since status can change
            options.AddPolicy("AIHealth", builder =>
                builder.Expire(TimeSpan.FromSeconds(30))
                       .SetVaryByQuery("ollamaBaseUrl", "useRemoteOllama")
                       .SetVaryByRouteValue("provider")
                       .Tag("ai-health"));

            // Stats caching - short duration for frequently polled endpoints
            // Varies by X-User-Id header (set by auth middleware from HttpContext.Items["UserId"])
            options.AddPolicy("Stats", builder =>
                builder.Expire(TimeSpan.FromMinutes(2))
                       .SetVaryByHeader("X-User-Id")
                       .SetVaryByQuery("daysBack", "startDate", "endDate", "toolName", "topN")
                       .Tag("stats"));

            // User notes caching - varies by query parameters
            options.AddPolicy("UserNotes", builder =>
                builder.Expire(TimeSpan.FromMinutes(2))
                       .SetVaryByQuery("folder", "includeArchived", "search")
                       .Tag("notes"));

            // RAG analytics caching - longer duration
            options.AddPolicy("RagAnalytics", builder =>
                builder.Expire(TimeSpan.FromMinutes(10))
                       .Tag("rag-analytics"));

            // Indexing stats caching
            options.AddPolicy("IndexingStats", builder =>
                builder.Expire(TimeSpan.FromMinutes(5))
                       .SetVaryByQuery("userId")
                       .Tag("indexing"));
        });

        // Register cache invalidator service
        services.AddScoped<ICacheInvalidator, OutputCacheInvalidator>();

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
            // Set size limit in bytes (matching the Size set by CachedEmbeddingProvider)
            // CachedEmbeddingProvider sets Size = embedding.Count * sizeof(double) + text.Length
            // For 1536-dimension embeddings, each entry is ~12KB (1536 * 8 bytes + text)
            // 100MB can store approximately 8,500 embeddings
            options.SizeLimit = cacheSettings.MaxMemorySizeMB * 1024L * 1024L;
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
        // This decorates the base factory with HybridCache for two-tier caching with stampede protection
        services.AddSingleton<IEmbeddingProviderFactory>(sp =>
        {
            var innerFactory = sp.GetRequiredService<EmbeddingProviderFactory>();
            var cache = sp.GetRequiredService<Microsoft.Extensions.Caching.Hybrid.HybridCache>();
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

        // Register BM25 search services
        // Original in-memory BM25 service (fallback for non-PG18 environments)
        services.AddScoped<BM25SearchService>();
        services.AddScoped<IBM25SearchService, BM25SearchService>();

        // Native PostgreSQL 18 BM25 service using ts_rank_cd (better performance for large datasets)
        services.AddScoped<INativeBM25SearchService, NativeBM25SearchService>();

        // Register hybrid search service (combines vector + BM25 with RRF fusion)
        services.AddScoped<IHybridSearchService, HybridSearchService>();

        // Register native hybrid search service (PostgreSQL 18 optimized - single-query RRF)
        services.AddScoped<INativeHybridSearchService, NativeHybridSearchService>();

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
        // Note: ApiKeyAuthenticationMiddleware is registered separately in Program.cs
        // before rate limiting so that user-based rate limiting works correctly

        return app;
    }
}
