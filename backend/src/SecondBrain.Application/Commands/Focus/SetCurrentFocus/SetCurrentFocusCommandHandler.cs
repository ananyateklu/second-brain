using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.SetCurrentFocus;

/// <summary>
/// Handler for SetCurrentFocusCommand - sets a focus item as the user's current focus.
/// Ensures only one item can be the current focus at a time.
/// </summary>
public class SetCurrentFocusCommandHandler : IRequestHandler<SetCurrentFocusCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<SetCurrentFocusCommandHandler> _logger;

    public SetCurrentFocusCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<SetCurrentFocusCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        SetCurrentFocusCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Setting current focus to item {FocusItemId} for user {UserId}",
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
                "User {UserId} attempted to set current focus on item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.FocusItemId,
                focusItem.UserId);
            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("You don't have permission to modify this focus item"));
        }

        // Cannot set completed or deferred items as current focus
        if (focusItem.Status == "completed" || focusItem.Status == "deferred")
        {
            _logger.LogWarning(
                "Cannot set focus item {FocusItemId} as current focus - status is {Status}",
                request.FocusItemId,
                focusItem.Status);
            return Result<FocusItemResponse>.Failure(
                Error.Validation($"Cannot set a {focusItem.Status} item as current focus"));
        }

        // Clear existing current focus for this user
        await _focusItemRepository.ClearCurrentFocusAsync(request.UserId, cancellationToken);

        // Set the new item as current focus and update status to in_progress
        focusItem.IsCurrentFocus = true;
        focusItem.Status = "in_progress";
        focusItem.FocusStartedAt = DateTime.UtcNow; // Start the timer
        focusItem.UpdatedAt = DateTime.UtcNow;

        var updatedItem = await _focusItemRepository.UpdateAsync(focusItem, cancellationToken);

        if (updatedItem is null)
        {
            _logger.LogError("Failed to set current focus for item {FocusItemId}", request.FocusItemId);
            return Result<FocusItemResponse>.Failure(Error.Internal("Failed to set current focus"));
        }

        _logger.LogInformation(
            "Set focus item {FocusItemId} as current focus for user {UserId}",
            updatedItem.Id,
            request.UserId);

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
