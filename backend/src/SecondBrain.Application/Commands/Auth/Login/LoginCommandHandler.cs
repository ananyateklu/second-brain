using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Auth.Login;

/// <summary>
/// Handler for LoginCommand
/// </summary>
public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IPasswordService _passwordService;
    private readonly ILogger<LoginCommandHandler> _logger;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IJwtService jwtService,
        IPasswordService passwordService,
        ILogger<LoginCommandHandler> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _passwordService = passwordService;
        _logger = logger;
    }

    public async Task<Result<AuthResponse>> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(Error.Validation("Email/Username and password are required"));
        }

        try
        {
            var identifier = request.Identifier.Trim();

            // Check if identifier is an email or username
            var user = identifier.Contains("@")
                ? await _userRepository.GetByEmailAsync(identifier.ToLowerInvariant())
                : await _userRepository.GetByUsernameAsync(identifier);

            if (user == null)
            {
                _logger.LogWarning("Login attempted with non-existent identifier: {Identifier}", request.Identifier);
                return Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "Invalid credentials"));
            }

            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                _logger.LogWarning("User has no password set. UserId: {UserId}", user.Id);
                return Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "Invalid credentials"));
            }

            // Verify password
            if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password attempt for user. UserId: {UserId}", user.Id);
                return Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "Invalid credentials"));
            }

            if (!user.IsActive)
            {
                _logger.LogWarning("Inactive user attempted login. UserId: {UserId}", user.Id);
                return Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "User account is inactive"));
            }

            // Generate JWT token
            var token = _jwtService.GenerateToken(user);

            _logger.LogInformation("User logged in. UserId: {UserId}, Email: {Email}",
                user.Id, user.Email);

            return Result<AuthResponse>.Success(new AuthResponse
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
            return Result<AuthResponse>.Failure(Error.Internal("Login failed"));
        }
    }
}
