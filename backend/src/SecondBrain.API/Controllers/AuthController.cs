using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Services;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

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
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IPasswordService _passwordService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IUserRepository userRepository,
        IJwtService jwtService,
        IPasswordService passwordService,
        ILogger<AuthController> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _passwordService = passwordService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user with email and password
    /// </summary>
    /// <param name="request">Registration details</param>
    /// <returns>User information and JWT token</returns>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { error = "Email and password are required" });
        }

        if (!IsValidEmail(request.Email))
        {
            return BadRequest(new { error = "Invalid email format" });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { error = "Password must be at least 6 characters" });
        }

        try
        {
            // Check if user already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);

            if (existingUser != null)
            {
                _logger.LogWarning("Registration attempted with existing email: {Email}", request.Email);
                return Conflict(new { error = "An account with this email already exists" });
            }

            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                var existingUsername = await _userRepository.GetByUsernameAsync(request.Username);
                if (existingUsername != null)
                {
                    _logger.LogWarning("Registration attempted with existing username: {Username}", request.Username);
                    return Conflict(new { error = "Username is already taken" });
                }
            }

            // Create new user with hashed password
            var newUser = new User
            {
                Email = request.Email.ToLowerInvariant().Trim(),
                Username = request.Username?.Trim(),
                PasswordHash = _passwordService.HashPassword(request.Password),
                DisplayName = !string.IsNullOrWhiteSpace(request.DisplayName)
                    ? request.DisplayName.Trim()
                    : request.Email.Split('@')[0],
                IsActive = true
            };

            var createdUser = await _userRepository.CreateAsync(newUser);

            // Generate JWT token
            var token = _jwtService.GenerateToken(createdUser);

            _logger.LogInformation("New user registered. UserId: {UserId}, Email: {Email}",
                createdUser.Id, createdUser.Email);

            return Ok(new AuthResponse
            {
                UserId = createdUser.Id,
                Email = createdUser.Email,
                Username = createdUser.Username,
                DisplayName = createdUser.DisplayName,
                ApiKey = createdUser.ApiKey,
                Token = token,
                IsNewUser = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration");
            return StatusCode(500, new { error = "Registration failed" });
        }
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    /// <param name="request">Login credentials</param>
    /// <returns>User information and JWT token</returns>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { error = "Email/Username and password are required" });
        }

        try
        {
            User? user;
            var identifier = request.Identifier.Trim();

            // Check if identifier is an email
            if (identifier.Contains("@"))
            {
                 user = await _userRepository.GetByEmailAsync(identifier.ToLowerInvariant());
            }
            else
            {
                 user = await _userRepository.GetByUsernameAsync(identifier);
            }

            if (user == null)
            {
                _logger.LogWarning("Login attempted with non-existent identifier: {Identifier}", request.Identifier);
                return Unauthorized(new { error = "Invalid credentials" });
            }

            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                _logger.LogWarning("User has no password set. UserId: {UserId}", user.Id);
                return Unauthorized(new { error = "Invalid credentials" });
            }

            // Verify password
            if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password attempt for user. UserId: {UserId}", user.Id);
                return Unauthorized(new { error = "Invalid credentials" });
            }

            if (!user.IsActive)
            {
                _logger.LogWarning("Inactive user attempted login. UserId: {UserId}", user.Id);
                return Unauthorized(new { error = "User account is inactive" });
            }

            // Generate JWT token
            var token = _jwtService.GenerateToken(user);

            _logger.LogInformation("User logged in. UserId: {UserId}, Email: {Email}",
                user.Id, user.Email);

            return Ok(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Username = user.Username,
                DisplayName = user.DisplayName,
                ApiKey = user.ApiKey,
                Token = token,
                IsNewUser = false
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login");
            return StatusCode(500, new { error = "Login failed" });
        }
    }

    /// <summary>
    /// Get current authenticated user information
    /// Requires authentication
    /// </summary>
    /// <returns>User information</returns>
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> GetCurrentUser()
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null)
            {
                return Unauthorized(new { error = "User not found" });
            }

            return Ok(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Username = user.Username,
                DisplayName = user.DisplayName,
                ApiKey = user.ApiKey,
                IsNewUser = false
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving current user. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to retrieve user information" });
        }
    }

    /// <summary>
    /// Generate or regenerate API key for authenticated user (for iOS/external access)
    /// Requires authentication
    /// </summary>
    /// <returns>New API key</returns>
    [HttpPost("generate-api-key")]
    [ProducesResponseType(typeof(ApiKeyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyResponse>> GenerateApiKey()
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null)
            {
                return Unauthorized(new { error = "User not found" });
            }

            // Generate new API key
            user.ApiKey = Guid.NewGuid().ToString("N"); // 32-character hex string
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(userId, user);

            _logger.LogInformation("API key generated for user. UserId: {UserId}", userId);

            return Ok(new ApiKeyResponse
            {
                ApiKey = user.ApiKey,
                GeneratedAt = user.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating API key. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to generate API key" });
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}

// DTOs for authentication
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

public class AuthResponse
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public string? Token { get; set; }
    public bool IsNewUser { get; set; }
}

public class ApiKeyResponse
{
    public string ApiKey { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
