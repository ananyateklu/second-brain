using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.PauseFocusItem;

/// <summary>
/// Handler for PauseFocusItemCommand - pauses the current focus timer.
/// Saves elapsed time to AccumulatedMinutes and clears focus without completing.
/// </summary>
public class PauseFocusItemCommandHandler : IRequestHandler<PauseFocusItemCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<PauseFocusItemCommandHandler> _logger;

    public PauseFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<PauseFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        PauseFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Pausing focus timer for item {FocusItemId} for user {UserId}",
            request.FocusItemId,
            request.UserId);

        // Retrieve the focus item
        var focusItem = await _focusItemRepository.GetByIdAsync(request.FocusItemId, cancellationToken);

        if (focusItem is null)
        {
            _logger.LogWarning("Focus item {FocusItemId} not found", request.FocusItemId);
            return Result<FocusItemResponse>.Failure(Error.NotFound("FocusItem", request.FocusItemId));
        }

        // Verify ownership
        if (focusItem.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to pause focus item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.FocusItemId,
                focusItem.UserId);
            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("You don't have permission to modify this focus item"));
        }

        // Can only pause an item that is currently focused
        if (!focusItem.IsCurrentFocus)
        {
            _logger.LogWarning(
                "Cannot pause focus item {FocusItemId} - it is not the current focus",
                request.FocusItemId);
            return Result<FocusItemResponse>.Failure(
                Error.Validation("Can only pause the current focus item"));
        }

        // Calculate elapsed time from current session
        var elapsedMinutes = 0;
        if (focusItem.FocusStartedAt.HasValue)
        {
            var elapsed = DateTime.UtcNow - focusItem.FocusStartedAt.Value;
            // Round up partial minutes so any focus time is counted
            elapsedMinutes = (int)Math.Ceiling(elapsed.TotalMinutes);
        }

        _logger.LogDebug(
            "Saving {ElapsedMinutes} minutes to accumulated time for item {FocusItemId}",
            elapsedMinutes,
            request.FocusItemId);

        // Update the focus item - pause but keep in_progress status
        focusItem.AccumulatedMinutes += elapsedMinutes;
        focusItem.FocusStartedAt = null;
        focusItem.IsCurrentFocus = false;
        // Keep status as in_progress - task is still being worked on, just paused
        focusItem.Status = "in_progress";
        focusItem.UpdatedAt = DateTime.UtcNow;

        var updatedItem = await _focusItemRepository.UpdateAsync(focusItem, cancellationToken);

        if (updatedItem is null)
        {
            _logger.LogError("Failed to pause focus item {FocusItemId}", request.FocusItemId);
            return Result<FocusItemResponse>.Failure(Error.Internal("Failed to pause focus item"));
        }

        _logger.LogInformation(
            "Paused focus item {FocusItemId} for user {UserId}. Accumulated minutes: {AccumulatedMinutes}",
            updatedItem.Id,
            request.UserId,
            updatedItem.AccumulatedMinutes);

        return Result<FocusItemResponse>.Success(MapToResponse(updatedItem));
    }

    private static FocusItemResponse MapToResponse(FocusItem item) => new()
    {
        Id = item.Id,
        UserId = item.UserId,
        NoteId = item.NoteId,
        Title = item.Title,
        Description = item.Description,
        IsCurrentFocus = item.IsCurrentFocus,
        Priority = item.Priority,
        Status = item.Status,
        ScheduledDate = item.ScheduledDate,
        EstimatedMinutes = item.EstimatedMinutes,
        ActualMinutes = item.ActualMinutes,
        CompletedAt = item.CompletedAt,
        DeferredTo = item.DeferredTo,
        AiSuggested = item.AiSuggested,
        AiSuggestionReason = item.AiSuggestionReason,
        AiConfidence = item.AiConfidence,
        SortOrder = item.SortOrder,
        FocusStartedAt = item.FocusStartedAt,
        AccumulatedMinutes = item.AccumulatedMinutes,
        CreatedAt = item.CreatedAt,
        UpdatedAt = item.UpdatedAt
    };
}
