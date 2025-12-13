using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.UserPreferences.UpdatePreferences;

/// <summary>
/// Handler for UpdatePreferencesCommand
/// </summary>
public class UpdatePreferencesCommandHandler : IRequestHandler<UpdatePreferencesCommand, Result<UserPreferencesResponse>>
{
    private readonly IUserPreferencesService _preferencesService;
    private readonly ILogger<UpdatePreferencesCommandHandler> _logger;

    public UpdatePreferencesCommandHandler(
        IUserPreferencesService preferencesService,
        ILogger<UpdatePreferencesCommandHandler> logger)
    {
        _preferencesService = preferencesService;
        _logger = logger;
    }

    public async Task<Result<UserPreferencesResponse>> Handle(
        UpdatePreferencesCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var preferences = await _preferencesService.UpdatePreferencesAsync(request.UserId, request.Request);
            return Result<UserPreferencesResponse>.Success(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating preferences for user {UserId}", request.UserId);
            return Result<UserPreferencesResponse>.Failure(Error.Internal(ex.Message));
        }
    }
}
