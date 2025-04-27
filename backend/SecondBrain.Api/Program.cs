// SecondBrain.Api/Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using SecondBrain.Data;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using SecondBrain.Api.Services.Interfaces;
using SecondBrain.Api.Configuration;
using System.Text.Json;
using SecondBrain.Api.Gamification;
using SecondBrain.Api.Hubs;

const string BEARER_SCHEME = "Bearer";
const string CORS_POLICY = "AllowFrontend";

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel from appsettings.json
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Configure(builder.Configuration.GetSection("Kestrel"));
});

// Bind JwtSettings from configuration
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Authentication:Jwt"));

// Retrieve JwtSettings for immediate use
var jwtSettings = builder.Configuration.GetSection("Authentication:Jwt").Get<JwtSettings>();

if (jwtSettings == null || string.IsNullOrEmpty(jwtSettings.Secret))
{
    throw new InvalidOperationException("JWT Secret Key is not configured. Please check your appsettings.json.");
}

var key = Encoding.UTF8.GetBytes(jwtSettings.Secret);

// Add Authentication services
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };

    // Add these lines for SignalR support
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/toolHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Register TokenService
builder.Services.AddScoped<ITokenService, TokenService>();

//Register TickTick
builder.Services.AddScoped<IIntegrationService, IntegrationService>();

// Add Authorization services
builder.Services.AddAuthorization();

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Accept property names in camelCase (e.g., 'title' instead of 'Title')
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;

    // Make property name matching case-insensitive
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});

// Register AnthropicService
builder.Services.AddHttpClient<IAnthropicService, AnthropicService>();

// Register PerplexityService
builder.Services.AddHttpClient<IPerplexityService, PerplexityService>();

// Define CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy(CORS_POLICY, policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Warning: In production, be more specific
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure EF Core with SQL Server
builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Swagger for API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SecondBrain API", Version = "v1" });

    // Define the BearerAuth scheme
    c.AddSecurityDefinition(BEARER_SCHEME, new OpenApiSecurityScheme
    {
        Description = $"JWT Authorization header using the {BEARER_SCHEME} scheme. Example: \"Authorization: {BEARER_SCHEME} {{token}}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = BEARER_SCHEME
    });

    // Apply the BearerAuth scheme globally
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = BEARER_SCHEME
                },
                Scheme = "oauth2",
                Name = BEARER_SCHEME,
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

// Register your LlamaService here
builder.Services.AddScoped<ILlamaService, LlamaService>();

// Add these before building the app
builder.Services.AddScoped<IXPService, XPService>();
builder.Services.AddScoped<IAchievementService, AchievementService>();

// Add these before building the app
builder.Services.AddScoped<INoteToolService, NoteToolService>();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();

// Add SignalR services
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
});

// Register OpenAIService
builder.Services.AddHttpClient<IOpenAIService, OpenAIService>();

// Register GeminiService
builder.Services.AddHttpClient<IGeminiService, GeminiService>();

// Register RAGService
builder.Services.AddScoped<RagService>();

// Add HttpClient
builder.Services.AddHttpClient();

// Add ChatContextService to the service collection
builder.Services.AddScoped<IChatContextService, ChatContextService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "SecondBrain API v1"));
}

// Correct middleware order
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles(); // Add this if you serve static files
app.UseAuthentication();
app.UseRouting();
app.UseCors(CORS_POLICY);
app.UseAuthorization();
app.UseWebSockets();

// Update the route mappings
app.MapControllers()
   .RequireCors(CORS_POLICY);

app.MapHub<ToolHub>("/toolHub")
   .RequireCors(CORS_POLICY);

// Add this after building the app
using (var scope = app.Services.CreateScope())
{
    var achievementService = scope.ServiceProvider.GetRequiredService<IAchievementService>();
    await achievementService.InitializeAchievementsAsync();
}

await app.RunAsync();
