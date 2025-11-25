using System.Net;
using System.Text.Json;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using ValidationException = SecondBrain.Application.Exceptions.ValidationException;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Global exception handling middleware
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
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
        context.Response.ContentType = "application/json";

        var errorResponse = exception switch
        {
            NotFoundException notFoundEx => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.NotFound,
                Message = notFoundEx.Message,
                Details = _environment.IsDevelopment() ? notFoundEx.StackTrace : null,
                Timestamp = DateTime.UtcNow,
                TraceId = context.TraceIdentifier
            },
            UnauthorizedException unauthorizedEx => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.Unauthorized,
                Message = unauthorizedEx.Message,
                Details = _environment.IsDevelopment() ? unauthorizedEx.StackTrace : null,
                Timestamp = DateTime.UtcNow,
                TraceId = context.TraceIdentifier
            },
            ValidationException validationEx => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Message = validationEx.Message,
                ValidationErrors = validationEx.Errors,
                Details = _environment.IsDevelopment() ? validationEx.StackTrace : null,
                Timestamp = DateTime.UtcNow,
                TraceId = context.TraceIdentifier
            },
            _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.InternalServerError,
                Message = _environment.IsDevelopment() 
                    ? exception.Message 
                    : "An internal server error occurred.",
                Details = _environment.IsDevelopment() ? exception.StackTrace : null,
                Timestamp = DateTime.UtcNow,
                TraceId = context.TraceIdentifier
            }
        };

        context.Response.StatusCode = errorResponse.StatusCode;

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        var json = JsonSerializer.Serialize(errorResponse, options);
        await context.Response.WriteAsync(json);
    }
}

