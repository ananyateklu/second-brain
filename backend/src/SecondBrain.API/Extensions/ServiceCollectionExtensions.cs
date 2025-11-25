using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SecondBrain.API.Configuration;
using SecondBrain.API.HealthChecks;
using SecondBrain.API.Middleware;
using SecondBrain.API.Services;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
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

        // Register AI providers as singletons (they maintain their own state)
        services.AddSingleton<OpenAIProvider>();
        services.AddSingleton<ClaudeProvider>();
        services.AddSingleton<GeminiProvider>();
        services.AddSingleton<OllamaProvider>();
        services.AddSingleton<GrokProvider>();

        // Register the factory
        services.AddSingleton<IAIProviderFactory, AIProviderFactory>();

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
    /// Registers health checks
    /// </summary>
    public static IServiceCollection AddCustomHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck<PostgresHealthCheck>("postgresql");

        return services;
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

        // Register the embedding provider factory
        services.AddSingleton<IEmbeddingProviderFactory, EmbeddingProviderFactory>();

        // Register vector stores
        services.AddScoped<PostgresVectorStore>();
        services.AddScoped<PineconeVectorStore>();

        // Register CompositeVectorStore as the default IVectorStore
        services.AddScoped<IVectorStore>(sp =>
        {
            var postgresStore = sp.GetRequiredService<PostgresVectorStore>();
            var pineconeStore = sp.GetRequiredService<PineconeVectorStore>();
            var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<RagSettings>>();
            var logger = sp.GetRequiredService<ILogger<CompositeVectorStore>>();
            return new CompositeVectorStore(postgresStore, pineconeStore, settings, logger);
        });

        // Register RAG services
        services.AddScoped<ChunkingService>();
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
