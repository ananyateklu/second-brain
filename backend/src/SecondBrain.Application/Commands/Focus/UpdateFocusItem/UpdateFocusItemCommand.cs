using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.UpdateFocusItem;

/// <summary>
/// Command to update an existing focus item.
/// All fields except Id and UserId are optional - only provided fields will be updated.
/// </summary>
public record UpdateFocusItemCommand(
    string Id,
    string? Title,
    string? Description,
    int? Priority,
    DateOnly? ScheduledDate,
    int? EstimatedMinutes,
    string UserId,
    bool UpdateDescription = false,
    bool UpdateScheduledDate = false,
    bool UpdateEstimatedMinutes = false,
    bool? IsCurrentFocus = null,
    string? Status = null
) : IRequest<Result<FocusItemResponse>>;
