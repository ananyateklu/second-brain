using MediatR;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.UserPreferences.UpdatePreferences;

/// <summary>
/// Command to update user preferences
/// </summary>
public record UpdatePreferencesCommand(
    string UserId,
    UpdateUserPreferencesRequest Request
) : IRequest<Result<UserPreferencesResponse>>;
