using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.DeleteFocusItem;

/// <summary>
/// Command to delete (soft delete) a focus item.
/// </summary>
public record DeleteFocusItemCommand(
    string Id,
    string UserId
) : IRequest<Result>;
