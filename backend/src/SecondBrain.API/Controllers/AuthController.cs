using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.Commands.Auth.GenerateApiKey;
using SecondBrain.Application.Commands.Auth.Login;
using SecondBrain.Application.Commands.Auth.Register;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Auth.GetCurrentUser;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Authentication endpoints for email/password authentication
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Register a new user with email and password
    /// </summary>
    /// <param name="request">Registration details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>User information and JWT token</returns>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new RegisterCommand(
            request.Email,
            request.Password,
            request.Username,
            request.DisplayName);

        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<AuthResponse>>(
            onSuccess: response => Ok(response),
            onFailure: error => error.Code switch
            {
                "Validation" or "ValidationFailed" => BadRequest(new { error = error.Message }),
                "Conflict" => Conflict(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    /// <param name="request">Login credentials</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>User information and JWT token</returns>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new LoginCommand(request.Identifier, request.Password);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<AuthResponse>>(
            onSuccess: response => Ok(response),
            onFailure: error => error.Code switch
            {
                "Validation" or "ValidationFailed" => BadRequest(new { error = error.Message }),
                "Unauthorized" => Unauthorized(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Get current authenticated user information
    /// Requires authentication
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>User information</returns>
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> GetCurrentUser(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetCurrentUserQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.Match<ActionResult<AuthResponse>>(
            onSuccess: response => Ok(response),
            onFailure: error => error.Code switch
            {
                "NotFound" => Unauthorized(new { error = "User not found" }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Generate or regenerate API key for authenticated user (for iOS/external access)
    /// Requires authentication
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>New API key</returns>
    [HttpPost("generate-api-key")]
    [ProducesResponseType(typeof(ApiKeyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyResponse>> GenerateApiKey(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new GenerateApiKeyCommand(userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<ApiKeyResponse>>(
            onSuccess: response => Ok(response),
            onFailure: error => error.Code switch
            {
                "NotFound" => Unauthorized(new { error = "User not found" }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }
}

// DTOs for authentication requests
public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [RegularExpression(@"^[a-zA-Z0-9_-]{3,20}$", ErrorMessage = "Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens")]
    public string? Username { get; set; }

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? DisplayName { get; set; }
}

public class LoginRequest
{
    [Required]
    public string Identifier { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
