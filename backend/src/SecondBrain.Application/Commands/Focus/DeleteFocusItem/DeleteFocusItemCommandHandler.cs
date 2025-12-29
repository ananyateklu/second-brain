using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Focus.DeleteFocusItem;

/// <summary>
/// Handler for DeleteFocusItemCommand - soft deletes a focus item with ownership verification.
/// </summary>
public class DeleteFocusItemCommandHandler : IRequestHandler<DeleteFocusItemCommand, Result>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<DeleteFocusItemCommandHandler> _logger;

    public DeleteFocusItemCommandHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<DeleteFocusItemCommandHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result> Handle(
        DeleteFocusItemCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Deleting focus item {FocusItemId} for user {UserId}",
            request.Id,
            request.UserId);

        // Retrieve the focus item to verify ownership
        var focusItem = await _focusItemRepository.GetByIdAsync(request.Id, cancellationToken);

        if (focusItem is null)
        {
            _logger.LogWarning("Focus item {FocusItemId} not found", request.Id);
            return Result.Failure(Error.NotFound("FocusItem", request.Id));
        }

        // Verify ownership
        if (focusItem.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to delete focus item {FocusItemId} owned by {OwnerId}",
                request.UserId,
                request.Id,
                focusItem.UserId);
            return Result.Failure(
                Error.Forbidden("You don't have permission to delete this focus item"));
        }

        // Perform soft delete
        var deleted = await _focusItemRepository.SoftDeleteAsync(
            request.Id,
            request.UserId,
            cancellationToken);

        if (!deleted)
        {
            _logger.LogError("Failed to delete focus item {FocusItemId}", request.Id);
            return Result.Failure(Error.Internal("Failed to delete focus item"));
        }

        _logger.LogInformation(
            "Deleted focus item {FocusItemId} for user {UserId}",
            request.Id,
            request.UserId);

        return Result.Success();
    }
}
