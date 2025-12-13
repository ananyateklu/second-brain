using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Auth.Login;

/// <summary>
/// Command to login with email/username and password
/// </summary>
public record LoginCommand(
    string Identifier,
    string Password
) : IRequest<Result<AuthResponse>>;
