// SecondBrain.Api/Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using SecondBrain.Data;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using SecondBrain.Api.Configuration;
using Microsoft.Extensions.Options;
using System.Text.Json;
using SecondBrain.Services.Gamification;
using SecondBrain.Api.Gamification;  // Updated namespace

var builder = WebApplication.CreateBuilder(args);

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
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

// Register TokenService
builder.Services.AddScoped<ITokenService, TokenService>();

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

// Define CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") 
                  .AllowAnyHeader()
                  .AllowAnyMethod()
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
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
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
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "SecondBrain API v1"));
}

app.UseHttpsRedirection();
// Use the CORS policy
app.UseCors("AllowFrontend");
app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();

await app.RunAsync();
