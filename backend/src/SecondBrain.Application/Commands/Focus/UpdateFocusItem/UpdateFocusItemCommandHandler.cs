using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.UpdateFocusItem;

/// <summary>
/// Handler for UpdateFocusItemCommand - updates an existing focus item with ownership verification.
/// </summary>
public class UpdateFocusItemCommandHandler : IRequestHandler<UpdateFocusItemCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<UpdateFocusItemCommandHandler> _logger;

    public UpdateFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<UpdateFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        UpdateFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Updating focus item {FocusItemId} for user {UserId}",
            request.Id,
            request.UserId);

        // Retrieve the existing item
        var existingItem = await _focusItemRepository.GetByIdAsync(request.Id, cancellationToken);

        if (existingItem is null)
        {
            _logger.LogWarning("Focus item {FocusItemId} not found", request.Id);
            return Result<FocusItemResponse>.Failure(Error.NotFound("FocusItem", request.Id));
        }

        // Verify ownership
        if (existingItem.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to update focus item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.Id,
                existingItem.UserId);
            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("You don't have permission to update this focus item"));
        }

        // Validate priority if provided
        if (request.Priority.HasValue && (request.Priority.Value < 1 || request.Priority.Value > 3))
        {
            return Result<FocusItemResponse>.Failure(
                Error.Validation("Priority must be between 1 (P1 High) and 3 (P3 Low)"));
        }

        // Apply updates
        if (request.Title is not null)
        {
            existingItem.Title = request.Title;
        }

        if (request.UpdateDescription)
        {
            existingItem.Description = request.Description;
        }

        if (request.Priority.HasValue)
        {
            existingItem.Priority = request.Priority.Value;
        }

        if (request.UpdateScheduledDate)
        {
            existingItem.ScheduledDate = request.ScheduledDate;
        }

        if (request.UpdateEstimatedMinutes)
        {
            existingItem.EstimatedMinutes = request.EstimatedMinutes;
        }

        // Handle IsCurrentFocus update
        if (request.IsCurrentFocus.HasValue)
        {
            // If setting as current focus, clear any existing current focus first
            if (request.IsCurrentFocus.Value)
            {
                await _focusItemRepository.ClearCurrentFocusAsync(request.UserId, cancellationToken);
                existingItem.Status = "in_progress";
            }
            existingItem.IsCurrentFocus = request.IsCurrentFocus.Value;
        }

        // Handle Status update
        if (!string.IsNullOrEmpty(request.Status))
        {
            var validStatuses = new[] { "pending", "in_progress", "completed", "deferred" };
            if (!validStatuses.Contains(request.Status))
            {
                return Result<FocusItemResponse>.Failure(
                    Error.Validation($"Invalid status. Must be one of: {string.Join(", ", validStatuses)}"));
            }
            existingItem.Status = request.Status;

            // If setting to pending/in_progress, clear completion timestamp
            if (request.Status is "pending" or "in_progress")
            {
                existingItem.CompletedAt = null;
            }
            // If setting to completed, set completion timestamp
            else if (request.Status == "completed")
            {
                existingItem.CompletedAt = DateTime.UtcNow;
                existingItem.IsCurrentFocus = false;
            }
        }

        existingItem.UpdatedAt = DateTime.UtcNow;

        var updatedItem = await _focusItemRepository.UpdateAsync(existingItem, cancellationToken);

        if (updatedItem is null)
        {
            _logger.LogError("Failed to update focus item {FocusItemId}", request.Id);
            return Result<FocusItemResponse>.Failure(Error.Internal("Failed to update focus item"));
        }

        _logger.LogInformation(
            "Updated focus item {FocusItemId} for user {UserId}",
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
