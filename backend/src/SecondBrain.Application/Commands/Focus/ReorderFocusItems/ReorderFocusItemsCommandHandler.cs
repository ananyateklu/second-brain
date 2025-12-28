using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.ReorderFocusItems;

/// <summary>
/// Handler for ReorderFocusItemsCommand - updates sort order for multiple focus items.
/// </summary>
public class ReorderFocusItemsCommandHandler : IRequestHandler<ReorderFocusItemsCommand, Result>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<ReorderFocusItemsCommandHandler> _logger;

    public ReorderFocusItemsCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<ReorderFocusItemsCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result> Handle(
        ReorderFocusItemsCommand request,
        CancellationToken cancellationToken)
    {
        var itemsList = request.Items.ToList();

        _logger.LogDebug(
            "Reordering {Count} focus items for user {UserId}",
            itemsList.Count,
            request.UserId);

        if (itemsList.Count == 0)
        {
            _logger.LogDebug("No items to reorder");
            return Result.Success();
        }

        // Verify all items belong to the user
        var itemIds = itemsList.Select(i => i.Id).ToList();
        var userItems = await _focusItemRepository.GetAllByUserIdAsync(request.UserId, cancellationToken);
        var userItemIds = userItems.Select(i => i.Id).ToHashSet();

        var invalidIds = itemIds.Where(id => !userItemIds.Contains(id)).ToList();
        if (invalidIds.Count > 0)
        {
            _logger.LogWarning(
                "User {UserId} attempted to reorder focus items they don't own: {InvalidIds}",
                request.UserId,
                string.Join(", ", invalidIds));
            return Result.Failure(
                Error.Forbidden("You don't have permission to reorder some of the specified items"));
        }

        // Convert to repository format and perform reorder
        var orders = itemsList.Select(i => (i.Id, i.SortOrder));

        await _focusItemRepository.ReorderAsync(request.UserId, orders, cancellationToken);

        _logger.LogInformation(
            "Reordered {Count} focus items for user {UserId}",
            itemsList.Count,
            request.UserId);

        return Result.Success();
    }
}
