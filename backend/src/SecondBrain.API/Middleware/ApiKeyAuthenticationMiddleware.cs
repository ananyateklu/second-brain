using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SecondBrain.API.Services;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Middleware for dual authentication (JWT tokens and API keys)
/// </summary>
public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthenticationMiddleware> _logger;

    public ApiKeyAuthenticationMiddleware(
        RequestDelegate next,
        ILogger<ApiKeyAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IUserRepository userRepository,
        IJwtService jwtService)
    {
        // Skip authentication for health check endpoints - including versioned routes
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/api/health") ||
            context.Request.Path.StartsWithSegments("/api/v1/health") ||
            context.Request.Path.StartsWithSegments("/api/ai/health") ||
            context.Request.Path.StartsWithSegments("/api/v1/ai/health"))
        {
            await _next(context);
            return;
        }

        // Skip authentication for Swagger/OpenAPI endpoints
        if (context.Request.Path.StartsWithSegments("/swagger") ||
            context.Request.Path.StartsWithSegments("/openapi") ||
            context.Request.Path.StartsWithSegments("/api/docs") ||
            context.Request.Path.StartsWithSegments("/scalar"))
        {
            await _next(context);
            return;
        }

        // Skip authentication for auth endpoints (login, register) - including versioned routes
        if (context.Request.Path.StartsWithSegments("/auth/login") ||
            context.Request.Path.StartsWithSegments("/auth/register") ||
            context.Request.Path.StartsWithSegments("/api/auth/login") ||
            context.Request.Path.StartsWithSegments("/api/auth/register") ||
            context.Request.Path.StartsWithSegments("/api/v1/auth/login") ||
            context.Request.Path.StartsWithSegments("/api/v1/auth/register"))
        {
            await _next(context);
            return;
        }

        // Require authentication for all other endpoints
        if (!context.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            _logger.LogWarning("Missing Authorization header");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Missing Authorization header" });
            return;
        }

        var header = authHeader.ToString();

        // Try JWT token authentication (Bearer <jwt_token>)
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = header.Substring("Bearer ".Length).Trim();

            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("Empty Bearer token");
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Empty Bearer token" });
                return;
            }

            try
            {
                // Validate JWT token
                var principal = jwtService.ValidateToken(token);

                if (principal == null)
                {
                    _logger.LogWarning("Invalid JWT token");
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "Invalid or expired token" });
                    return;
                }

                // Get user ID from token claims
                // Note: JWT "sub" claim gets mapped to ClaimTypes.NameIdentifier by .NET's JWT handler
                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? principal.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(userIdClaim))
                {
                    _logger.LogWarning("Token missing user ID claim");
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "Invalid token claims" });
                    return;
                }

                // Get user from database to verify they still exist and are active
                var user = await userRepository.GetByIdAsync(userIdClaim);

                if (user == null)
                {
                    _logger.LogWarning("User not found for token. UserId: {UserId}", userIdClaim);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "User not found" });
                    return;
                }

                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user attempted to authenticate. UserId: {UserId}", user.Id);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "User account is inactive" });
                    return;
                }

                // Store user context
                context.Items["UserId"] = user.Id;
                context.Items["User"] = user;
                context.Items["AuthMethod"] = "JWT";

                _logger.LogDebug("User authenticated via JWT. UserId: {UserId}", user.Id);

                await _next(context);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during JWT authentication");
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Authentication error" });
                return;
            }
        }
        // Try API key authentication (ApiKey <api_key>)
        else if (header.StartsWith("ApiKey ", StringComparison.OrdinalIgnoreCase))
        {
            var apiKey = header.Substring("ApiKey ".Length).Trim();

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Empty API key");
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Empty API key" });
                return;
            }

            try
            {
                var userId = await userRepository.ResolveUserIdByApiKeyAsync(apiKey);

                if (userId is null)
                {
                    _logger.LogWarning("Invalid API key");
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
                    return;
                }

                // Store user context
                context.Items["UserId"] = userId;
                context.Items["ApiKey"] = apiKey;
                context.Items["AuthMethod"] = "ApiKey";

                _logger.LogDebug("User authenticated via API Key. UserId: {UserId}", userId);

                await _next(context);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during API key authentication");
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { error = "Authentication error" });
                return;
            }
        }
        else
        {
            _logger.LogWarning("Invalid Authorization header format. Expected 'Bearer <token>' or 'ApiKey <key>'");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid Authorization header format. Use 'Bearer <token>' or 'ApiKey <key>'" });
            return;
        }
    }
}
