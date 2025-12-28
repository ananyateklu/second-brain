using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.CompleteFocusItem;

/// <summary>
/// Command to mark a focus item as completed.
/// Sets status to completed, records completion time, and clears current focus if applicable.
/// </summary>
public record CompleteFocusItemCommand(
    string Id,
    int? ActualMinutes,
    string UserId
) : IRequest<Result<FocusItemResponse>>;
