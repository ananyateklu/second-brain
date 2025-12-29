using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.CompleteFocusItem;

/// <summary>
/// Handler for CompleteFocusItemCommand - marks a focus item as completed.
/// </summary>
public class CompleteFocusItemCommandHandler : IRequestHandler<CompleteFocusItemCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<CompleteFocusItemCommandHandler> _logger;

    public CompleteFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<CompleteFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        CompleteFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Completing focus item {FocusItemId} for user {UserId}",
            request.Id,
            request.UserId);

        // Retrieve the focus item
        var focusItem = await _focusItemRepository.GetByIdAsync(request.Id, cancellationToken);

        if (focusItem is null)
        {
            _logger.LogWarning("Focus item {FocusItemId} not found", request.Id);
            return Result<FocusItemResponse>.Failure(Error.NotFound("FocusItem", request.Id));
        }

        // Verify ownership
        if (focusItem.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to complete focus item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.Id,
                focusItem.UserId);
            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("You don't have permission to complete this focus item"));
        }

        // Check if already completed
        if (focusItem.Status == "completed")
        {
            _logger.LogDebug("Focus item {FocusItemId} is already completed", request.Id);
            return Result<FocusItemResponse>.Success(MapToResponse(focusItem));
        }

        // Calculate total time spent (accumulated + current session)
        // Round up partial minutes so any focus time is counted
        var currentSessionMinutes = 0;
        if (focusItem.FocusStartedAt.HasValue)
        {
            var elapsed = DateTime.UtcNow - focusItem.FocusStartedAt.Value;
            currentSessionMinutes = (int)Math.Ceiling(elapsed.TotalMinutes);
        }
        var totalMinutes = focusItem.AccumulatedMinutes + currentSessionMinutes;

        // Mark as completed
        focusItem.Status = "completed";
        focusItem.CompletedAt = DateTime.UtcNow;
        focusItem.IsCurrentFocus = false;
        focusItem.FocusStartedAt = null; // Clear the timer
        focusItem.UpdatedAt = DateTime.UtcNow;

        // Use calculated time or allow manual override
        // Always set ActualMinutes - user-provided takes precedence, else use tracked time
        if (request.ActualMinutes.HasValue)
        {
            focusItem.ActualMinutes = request.ActualMinutes.Value;
        }
        else
        {
            // Set to tracked time (may be 0 if item was never set as current focus)
            focusItem.ActualMinutes = totalMinutes;
        }

        var updatedItem = await _focusItemRepository.UpdateAsync(focusItem, cancellationToken);

        if (updatedItem is null)
        {
            _logger.LogError("Failed to complete focus item {FocusItemId}", request.Id);
            return Result<FocusItemResponse>.Failure(Error.Internal("Failed to complete focus item"));
        }

        _logger.LogInformation(
            "Completed focus item {FocusItemId} for user {UserId}. ActualMinutes: {ActualMinutes}",
            updatedItem.Id,
            request.UserId,
            updatedItem.ActualMinutes);

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
