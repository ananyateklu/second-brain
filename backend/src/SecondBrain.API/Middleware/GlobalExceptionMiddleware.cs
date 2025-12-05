using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
            _logger.LogError(ex, "Unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

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
