using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.UserPreferences.GetPreferences;

/// <summary>
/// Handler for GetPreferencesQuery
/// </summary>
public class GetPreferencesQueryHandler : IRequestHandler<GetPreferencesQuery, Result<UserPreferencesResponse>>
{
    private readonly IUserPreferencesService _preferencesService;
    private readonly ILogger<GetPreferencesQueryHandler> _logger;

    public GetPreferencesQueryHandler(
        IUserPreferencesService preferencesService,
        ILogger<GetPreferencesQueryHandler> logger)
    {
        _preferencesService = preferencesService;
        _logger = logger;
    }

    public async Task<Result<UserPreferencesResponse>> Handle(
        GetPreferencesQuery request,
        CancellationToken cancellationToken)
    {
        try
        {
            var preferences = await _preferencesService.GetPreferencesAsync(request.UserId);
            return Result<UserPreferencesResponse>.Success(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting preferences for user {UserId}", request.UserId);
            return Result<UserPreferencesResponse>.Failure(Error.Internal(ex.Message));
        }
    }
}
