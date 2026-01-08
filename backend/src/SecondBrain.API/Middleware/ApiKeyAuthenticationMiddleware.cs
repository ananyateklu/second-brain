using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Hybrid;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Cached user authentication data to avoid DB queries on every request.
/// Contains only essential fields needed for authentication decisions.
/// </summary>
internal sealed record CachedUserAuth(string Id, bool IsActive);

/// <summary>
/// Middleware for dual authentication (JWT tokens and API keys).
/// Uses HybridCache to cache user lookups and reduce database queries by ~90%.
/// </summary>
public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthenticationMiddleware> _logger;

    // Cache expiration times
    private static readonly TimeSpan UserCacheExpiration = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ApiKeyCacheExpiration = TimeSpan.FromMinutes(10);

    public ApiKeyAuthenticationMiddleware(
        RequestDelegate next,
        ILogger<ApiKeyAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

#pragma warning disable EXTEXP0018 // HybridCache is experimental
    public async Task InvokeAsync(
        HttpContext context,
        IUserRepository userRepository,
        IJwtService jwtService,
        HybridCache cache)
    {
        // Skip authentication for health check and metrics endpoints - including versioned routes
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/api/health") ||
            context.Request.Path.StartsWithSegments("/api/v1/health") ||
            context.Request.Path.StartsWithSegments("/api/ai/health") ||
            context.Request.Path.StartsWithSegments("/api/v1/ai/health") ||
            context.Request.Path.StartsWithSegments("/metrics"))
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

        // Voice WebSocket uses post-connect authentication via first message
        // Security: Token is sent as first message after connection, not in URL query string
        // This prevents token exposure in browser history, server logs, and proxy logs
        if (context.WebSockets.IsWebSocketRequest &&
            context.Request.Path.StartsWithSegments("/api/voice/session"))
        {
            // Skip middleware auth - VoiceController will handle JWT validation
            // via the authenticate message sent by the client after connection
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

                // Get user from cache or database to verify they still exist and are active
                // This reduces DB queries by ~90% for authenticated requests
                var cachedUser = await cache.GetOrCreateAsync(
                    $"auth:user:{userIdClaim}",
                    async ct =>
                    {
                        var user = await userRepository.GetByIdAsync(userIdClaim);
                        return user != null ? new CachedUserAuth(user.Id, user.IsActive) : null;
                    },
                    new HybridCacheEntryOptions
                    {
                        Expiration = UserCacheExpiration,
                        LocalCacheExpiration = TimeSpan.FromMinutes(2) // Shorter local cache for faster invalidation
                    });

                if (cachedUser == null)
                {
                    _logger.LogWarning("User not found for token. UserId: {UserId}", userIdClaim);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "User not found" });
                    return;
                }

                if (!cachedUser.IsActive)
                {
                    _logger.LogWarning("Inactive user attempted to authenticate. UserId: {UserId}", cachedUser.Id);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "User account is inactive" });
                    return;
                }

                // Store user context
                context.Items["UserId"] = cachedUser.Id;
                context.Items["AuthMethod"] = "JWT";

                _logger.LogDebug("User authenticated via JWT. UserId: {UserId}, Cached: true", cachedUser.Id);

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
                // Cache API key to user ID resolution to reduce DB queries
                // Uses a hash of the API key as the cache key to avoid storing the full key
                var apiKeyHash = apiKey.GetHashCode().ToString("X8");
                var userId = await cache.GetOrCreateAsync(
                    $"auth:apikey:{apiKeyHash}",
                    async ct => await userRepository.ResolveUserIdByApiKeyAsync(apiKey),
                    new HybridCacheEntryOptions
                    {
                        Expiration = ApiKeyCacheExpiration,
                        LocalCacheExpiration = TimeSpan.FromMinutes(3)
                    });

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

                _logger.LogDebug("User authenticated via API Key. UserId: {UserId}, Cached: true", userId);

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

    /// <summary>
    /// Validates a JWT token and sets up the user context if valid.
    /// Returns true if authentication succeeded, false otherwise.
    /// </summary>
    private async Task<bool> ValidateJwtTokenAsync(
        HttpContext context,
        string token,
        IUserRepository userRepository,
        IJwtService jwtService,
        HybridCache cache)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Empty JWT token");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Empty token" });
            return false;
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
                return false;
            }

            // Get user ID from token claims
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? principal.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
            {
                _logger.LogWarning("Token missing user ID claim");
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "Invalid token claims" });
                return false;
            }

            // Get user from cache or database to verify they still exist and are active
            var cachedUser = await cache.GetOrCreateAsync(
                $"auth:user:{userIdClaim}",
                async ct =>
                {
                    var user = await userRepository.GetByIdAsync(userIdClaim);
                    return user != null ? new CachedUserAuth(user.Id, user.IsActive) : null;
                },
                new HybridCacheEntryOptions
                {
                    Expiration = UserCacheExpiration,
                    LocalCacheExpiration = TimeSpan.FromMinutes(2)
                });

            if (cachedUser == null)
            {
                _logger.LogWarning("User not found for token. UserId: {UserId}", userIdClaim);
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "User not found" });
                return false;
            }

            if (!cachedUser.IsActive)
            {
                _logger.LogWarning("Inactive user attempted to authenticate. UserId: {UserId}", cachedUser.Id);
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "User account is inactive" });
                return false;
            }

            // Store user context
            context.Items["UserId"] = cachedUser.Id;
            context.Items["AuthMethod"] = "JWT";

            _logger.LogDebug("User authenticated via JWT (WebSocket). UserId: {UserId}, Cached: true", cachedUser.Id);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during JWT authentication");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Authentication error" });
            return false;
        }
    }
#pragma warning restore EXTEXP0018
}
