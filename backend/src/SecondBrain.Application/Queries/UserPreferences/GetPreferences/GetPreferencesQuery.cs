using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.UserPreferences.GetPreferences;

/// <summary>
/// Query to get user preferences
/// </summary>
public record GetPreferencesQuery(
    string UserId
) : IRequest<Result<UserPreferencesResponse>>;
