using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.AI.CircuitBreaker;
using ValidationException = SecondBrain.Application.Exceptions.ValidationException;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Global exception handling middleware using RFC 9457 Problem Details.
/// Uses IProblemDetailsService for standardized error responses.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;
    private readonly IProblemDetailsService _problemDetailsService;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment,
        IProblemDetailsService problemDetailsService)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
        _problemDetailsService = problemDetailsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // Log with full request context for easier debugging
            var userId = context.Items.TryGetValue("UserId", out var uid) ? uid?.ToString() : "anonymous";
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

            // Determine log level based on exception type
            var logLevel = GetLogLevelForException(ex);

            _logger.Log(logLevel, ex,
                "Unhandled exception. UserId: {UserId}, Method: {Method}, Path: {Path}, " +
                "QueryString: {QueryString}, TraceId: {TraceId}, ExceptionType: {ExceptionType}",
                userId,
                context.Request.Method,
                context.Request.Path.Value,
                context.Request.QueryString.Value,
                traceId,
                ex.GetType().Name);

            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Determines the appropriate log level based on exception type.
    /// Client errors (4xx) use Warning, server errors (5xx) use Error.
    /// Note: TaskCanceledException must come before OperationCanceledException since it's a subclass.
    /// </summary>
    private static LogLevel GetLogLevelForException(Exception ex) => ex switch
    {
        NotFoundException => LogLevel.Warning,
        UnauthorizedException => LogLevel.Warning,
        ValidationException => LogLevel.Warning,
        ArgumentException => LogLevel.Warning,
        // TaskCanceledException is subclass of OperationCanceledException - check it first
        TaskCanceledException tce when tce.CancellationToken.IsCancellationRequested => LogLevel.Information,
        TaskCanceledException => LogLevel.Warning, // HTTP timeout - worth noting
        OperationCanceledException => LogLevel.Information, // Client cancelled - not an error
        TimeoutException => LogLevel.Warning,
        CircuitBreakerOpenException => LogLevel.Warning,
        DbUpdateConcurrencyException => LogLevel.Warning,
        DbUpdateException => LogLevel.Error,
        ObjectDisposedException => LogLevel.Error,
        _ => LogLevel.Error
    };

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // Map exception to status code and problem details
        var (statusCode, problemDetails) = MapExceptionToProblemDetails(context, exception);

        context.Response.StatusCode = statusCode;

        // Set Retry-After header for circuit breaker exceptions
        if (exception is CircuitBreakerOpenException cbEx && cbEx.RetryAfter.HasValue)
        {
            context.Response.Headers.RetryAfter = ((int)cbEx.RetryAfter.Value.TotalSeconds).ToString();
        }

        // Add trace context
        problemDetails.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow;

        // Add exception details in development
        if (_environment.IsDevelopment() && exception.StackTrace != null)
        {
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
            problemDetails.Extensions["exceptionType"] = exception.GetType().FullName;
        }

        // Use ProblemDetailsService to write the response
        var problemDetailsContext = new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problemDetails,
            Exception = exception
        };

        // Try to write using the problem details service
        if (await _problemDetailsService.TryWriteAsync(problemDetailsContext))
        {
            return;
        }

        // Fallback to manual JSON response if service doesn't handle it
        context.Response.ContentType = "application/problem+json; charset=utf-8";

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        // For ValidationProblemDetails, we need to serialize it properly
        if (problemDetails is ValidationProblemDetails validationProblem)
        {
            await JsonSerializer.SerializeAsync(context.Response.Body, validationProblem, jsonOptions);
        }
        else
        {
            await JsonSerializer.SerializeAsync(context.Response.Body, problemDetails, jsonOptions);
        }
    }

    private (int StatusCode, ProblemDetails ProblemDetails) MapExceptionToProblemDetails(
        HttpContext context,
        Exception exception)
    {
        return exception switch
        {
            NotFoundException notFoundEx => (
                StatusCodes.Status404NotFound,
                new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.5",
                    Title = "Resource Not Found",
                    Detail = notFoundEx.Message,
                    Instance = context.Request.Path
                }
            ),

            UnauthorizedException unauthorizedEx => (
                StatusCodes.Status401Unauthorized,
                new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.2",
                    Title = "Unauthorized",
                    Detail = unauthorizedEx.Message,
                    Instance = context.Request.Path
                }
            ),

            ValidationException validationEx => CreateValidationProblemDetails(context, validationEx),

            CircuitBreakerOpenException circuitBreakerEx => (
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Status = StatusCodes.Status503ServiceUnavailable,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.4",
                    Title = "Service Unavailable",
                    Detail = circuitBreakerEx.Message,
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["provider"] = circuitBreakerEx.ProviderName,
                        ["retryAfterSeconds"] = circuitBreakerEx.RetryAfter?.TotalSeconds
                    }
                }
            ),

            ArgumentException argEx => (
                StatusCodes.Status400BadRequest,
                new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                    Title = "Bad Request",
                    Detail = argEx.Message,
                    Instance = context.Request.Path
                }
            ),

            // TaskCanceledException from HTTP timeouts (not user cancellation)
            TaskCanceledException tce when !tce.CancellationToken.IsCancellationRequested => (
                StatusCodes.Status408RequestTimeout,
                new ProblemDetails
                {
                    Status = StatusCodes.Status408RequestTimeout,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.9",
                    Title = "Request Timeout",
                    Detail = "The request timed out. Please try again with a smaller request or contact support if the issue persists.",
                    Instance = context.Request.Path
                }
            ),

            // TimeoutException from internal operations (e.g., database, external APIs)
            TimeoutException timeoutEx => (
                StatusCodes.Status504GatewayTimeout,
                new ProblemDetails
                {
                    Status = StatusCodes.Status504GatewayTimeout,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.5",
                    Title = "Gateway Timeout",
                    Detail = _environment.IsDevelopment()
                        ? $"An upstream service timed out: {timeoutEx.Message}"
                        : "An upstream service did not respond in time. Please try again later.",
                    Instance = context.Request.Path
                }
            ),

            // DbUpdateConcurrencyException - optimistic concurrency conflict
            DbUpdateConcurrencyException concurrencyEx => (
                StatusCodes.Status409Conflict,
                new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10",
                    Title = "Conflict",
                    Detail = "The resource was modified by another request. Please refresh and try again.",
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = "CONCURRENCY_CONFLICT",
                        ["suggestion"] = "Reload the resource and retry your operation"
                    }
                }
            ),

            // DbUpdateException - database constraint violations, etc.
            DbUpdateException dbEx => MapDbUpdateException(context, dbEx),

            // ObjectDisposedException - indicates a bug or race condition
            ObjectDisposedException disposedEx => (
                StatusCodes.Status500InternalServerError,
                new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                    Title = "Internal Server Error",
                    Detail = _environment.IsDevelopment()
                        ? $"A disposed object was accessed: {disposedEx.ObjectName}"
                        : "A server error occurred. Please try again.",
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = "RESOURCE_DISPOSED",
                        ["suggestion"] = "If this persists, please contact support"
                    }
                }
            ),

            // OperationCanceledException - client closed the request
            OperationCanceledException => (
                499, // Non-standard status code used by nginx
                new ProblemDetails
                {
                    Status = 499,
                    Type = "https://httpstatuses.com/499",
                    Title = "Client Closed Request",
                    Detail = "The client closed the request before the server could respond.",
                    Instance = context.Request.Path
                }
            ),

            _ => (
                StatusCodes.Status500InternalServerError,
                new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                    Title = "Internal Server Error",
                    Detail = _environment.IsDevelopment()
                        ? exception.Message
                        : "An unexpected error occurred. Please try again later.",
                    Instance = context.Request.Path
                }
            )
        };
    }

    /// <summary>
    /// Maps DbUpdateException to appropriate status code based on the inner exception.
    /// </summary>
    private (int StatusCode, ProblemDetails ProblemDetails) MapDbUpdateException(
        HttpContext context,
        DbUpdateException dbEx)
    {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;

        if (innerMessage.Contains("23505") || innerMessage.Contains("unique constraint", StringComparison.OrdinalIgnoreCase))
        {
            return (
                StatusCodes.Status409Conflict,
                new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10",
                    Title = "Conflict",
                    Detail = "A resource with the same identifier already exists.",
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = "DUPLICATE_RESOURCE"
                    }
                }
            );
        }

        // Check for foreign key violation (PostgreSQL error code 23503)
        if (innerMessage.Contains("23503") || innerMessage.Contains("foreign key constraint", StringComparison.OrdinalIgnoreCase))
        {
            return (
                StatusCodes.Status400BadRequest,
                new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                    Title = "Bad Request",
                    Detail = "The request references a resource that does not exist.",
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = "INVALID_REFERENCE"
                    }
                }
            );
        }

        // Generic database error
        return (
            StatusCodes.Status500InternalServerError,
            new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
                Title = "Database Error",
                Detail = _environment.IsDevelopment()
                    ? $"Database operation failed: {innerMessage}"
                    : "A database error occurred. Please try again later.",
                Instance = context.Request.Path,
                Extensions =
                {
                    ["errorCode"] = "DATABASE_ERROR"
                }
            }
        );
    }

    private (int StatusCode, ProblemDetails ProblemDetails) CreateValidationProblemDetails(
        HttpContext context,
        ValidationException validationEx)
    {
        var problemDetails = new ValidationProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            Title = "Validation Failed",
            Detail = validationEx.Message,
            Instance = context.Request.Path
        };

        // Add validation errors in the standard format
        if (validationEx.Errors != null)
        {
            foreach (var error in validationEx.Errors)
            {
                if (problemDetails.Errors.ContainsKey(error.Key))
                {
                    var existing = problemDetails.Errors[error.Key].ToList();
                    existing.AddRange(error.Value);
                    problemDetails.Errors[error.Key] = existing.ToArray();
                }
                else
                {
                    problemDetails.Errors[error.Key] = error.Value.ToArray();
                }
            }
        }

        return (StatusCodes.Status400BadRequest, problemDetails);
    }
}
