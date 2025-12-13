using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Auth.GetCurrentUser;

/// <summary>
/// Query to get the current authenticated user's information
/// </summary>
public record GetCurrentUserQuery(
    string UserId
) : IRequest<Result<AuthResponse>>;
