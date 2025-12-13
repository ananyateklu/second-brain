using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Auth.Register;

/// <summary>
/// Handler for RegisterCommand
/// </summary>
public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IPasswordService _passwordService;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IJwtService jwtService,
        IPasswordService passwordService,
        ILogger<RegisterCommandHandler> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _passwordService = passwordService;
        _logger = logger;
    }

    public async Task<Result<AuthResponse>> Handle(
        RegisterCommand request,
        CancellationToken cancellationToken)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(Error.Validation("Email and password are required"));
        }

        if (!IsValidEmail(request.Email))
        {
            return Result<AuthResponse>.Failure(Error.Validation("Invalid email format"));
        }

        if (request.Password.Length < 6)
        {
            return Result<AuthResponse>.Failure(Error.Validation("Password must be at least 6 characters"));
        }

        try
        {
            // Check if user already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Registration attempted with existing email: {Email}", request.Email);
                return Result<AuthResponse>.Failure(Error.Custom("Conflict", "An account with this email already exists"));
            }

            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                var existingUsername = await _userRepository.GetByUsernameAsync(request.Username);
                if (existingUsername != null)
                {
                    _logger.LogWarning("Registration attempted with existing username: {Username}", request.Username);
                    return Result<AuthResponse>.Failure(Error.Custom("Conflict", "Username is already taken"));
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

            return Result<AuthResponse>.Success(new AuthResponse
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
            return Result<AuthResponse>.Failure(Error.Internal("Registration failed"));
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
