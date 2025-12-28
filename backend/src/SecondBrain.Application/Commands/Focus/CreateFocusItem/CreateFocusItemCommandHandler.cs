using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.CreateFocusItem;

/// <summary>
/// Handler for CreateFocusItemCommand - creates a new focus item for a user.
/// </summary>
public class CreateFocusItemCommandHandler : IRequestHandler<CreateFocusItemCommand, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<CreateFocusItemCommandHandler> _logger;

    public CreateFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<CreateFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        CreateFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Creating focus item for user {UserId}. Title: {Title}, Priority: {Priority}",
            request.UserId,
            request.Title,
            request.Priority);

        // Validate priority
        if (request.Priority < 1 || request.Priority > 3)
        {
            return Result<FocusItemResponse>.Failure(
                Error.Validation("Priority must be between 1 (P1 High) and 3 (P3 Low)"));
        }

        // Create the focus item entity
        var focusItem = new FocusItem
        {
            Id = Guid.NewGuid().ToString(),
            UserId = request.UserId,
            Title = request.Title,
            Description = request.Description,
            NoteId = request.NoteId,
            Priority = request.Priority,
            ScheduledDate = request.ScheduledDate,
            EstimatedMinutes = request.EstimatedMinutes,
            Status = "pending",
            IsCurrentFocus = false,
            SortOrder = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createdItem = await _focusItemRepository.CreateAsync(focusItem, cancellationToken);

        _logger.LogInformation(
            "Created focus item {FocusItemId} for user {UserId}",
            createdItem.Id,
            request.UserId);

        return Result<FocusItemResponse>.Success(MapToResponse(createdItem));
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
