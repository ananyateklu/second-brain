using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.ReorderFocusItems;

/// <summary>
/// Command to reorder focus items by updating their sort order.
/// </summary>
public record ReorderFocusItemsCommand(
    IEnumerable<FocusItemOrder> Items,
    string UserId
) : IRequest<Result>;

/// <summary>
/// Represents the new sort order for a focus item.
/// </summary>
public record FocusItemOrder(string Id, int SortOrder);
