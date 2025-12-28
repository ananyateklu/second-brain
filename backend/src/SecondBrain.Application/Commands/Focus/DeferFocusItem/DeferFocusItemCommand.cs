using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.DeferFocusItem;

/// <summary>
/// Command to defer a focus item to another date.
/// Sets status to deferred, records the deferred date, and clears current focus if applicable.
/// </summary>
public record DeferFocusItemCommand(
    string Id,
    DateOnly DeferToDate,
    string UserId
) : IRequest<Result<FocusItemResponse>>;
