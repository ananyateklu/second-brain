using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.DeferFocusItem;

/// <summary>
/// Handler for DeferFocusItemCommand - defers a focus item to another date.
/// </summary>
public class DeferFocusItemCommandHandler : IRequestHandler<DeferFocusItemCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<DeferFocusItemCommandHandler> _logger;

    public DeferFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<DeferFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        DeferFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Deferring focus item {FocusItemId} to {DeferToDate} for user {UserId}",
            request.Id,
            request.DeferToDate,
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
                "User {UserId} attempted to defer focus item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.Id,
                focusItem.UserId);
            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("You don't have permission to defer this focus item"));
        }

        // Cannot defer completed items
        if (focusItem.Status == "completed")
        {
            _logger.LogWarning(
                "Cannot defer focus item {FocusItemId} - item is already completed",
                request.Id);
            return Result<FocusItemResponse>.Failure(
                Error.Validation("Cannot defer a completed item"));
        }

        // Validate defer date is in the future
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (request.DeferToDate <= today)
        {
            _logger.LogWarning(
                "Cannot defer focus item {FocusItemId} to date {DeferToDate} - must be in the future",
                request.Id,
                request.DeferToDate);
            return Result<FocusItemResponse>.Failure(
                Error.Validation("Defer date must be in the future"));
        }

        // Set status to deferred
        focusItem.Status = "deferred";
        focusItem.DeferredTo = request.DeferToDate;
        focusItem.IsCurrentFocus = false;
        focusItem.UpdatedAt = DateTime.UtcNow;

        var updatedItem = await _focusItemRepository.UpdateAsync(focusItem, cancellationToken);

        if (updatedItem is null)
        {
            _logger.LogError("Failed to defer focus item {FocusItemId}", request.Id);
            return Result<FocusItemResponse>.Failure(Error.Internal("Failed to defer focus item"));
        }

        _logger.LogInformation(
            "Deferred focus item {FocusItemId} to {DeferToDate} for user {UserId}",
            updatedItem.Id,
            request.DeferToDate,
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
