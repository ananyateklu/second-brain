using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.PauseFocusItem;

/// <summary>
/// Command to pause the current focus timer.
/// Saves elapsed time to AccumulatedMinutes without completing the task.
/// The item remains in 'in_progress' status but is no longer the current focus.
/// </summary>
public record PauseFocusItemCommand(
    string FocusItemId,
    string UserId
) : IRequest<Result<FocusItemResponse>>;
