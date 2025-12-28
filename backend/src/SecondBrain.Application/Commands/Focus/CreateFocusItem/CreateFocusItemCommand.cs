using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.CreateFocusItem;

/// <summary>
/// Command to create a new focus item for a user.
/// </summary>
public record CreateFocusItemCommand(
    string Title,
    string? Description,
    string? NoteId,
    int Priority,
    DateOnly? ScheduledDate,
    int? EstimatedMinutes,
    string UserId
) : IRequest<Result<FocusItemResponse>>;
