using SecondBrain.API.Extensions;
using SecondBrain.API.Middleware;
using SecondBrain.Infrastructure.Data;
using Scalar.AspNetCore;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;

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

var builder = WebApplication.CreateBuilder(args);

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

var app = builder.Build();

// Apply database migrations on startup (development only)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        await dbContext.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Database migration failed. Database may not exist yet.");
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

// Security headers
app.UseSecurityHeaders();

// Rate limiting
app.UseRateLimiting();

// Custom middleware (logging, error handling, authentication)
app.UseCustomMiddleware();

// Map controllers and health checks
app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();
