using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Auth.Register;

/// <summary>
/// Command to register a new user with email and password
/// </summary>
public record RegisterCommand(
    string Email,
    string Password,
    string? Username = null,
    string? DisplayName = null
) : IRequest<Result<AuthResponse>>;
