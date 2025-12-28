using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Focus.GetFocusItemById;

/// <summary>
/// Handler for GetFocusItemByIdQuery - retrieves a specific focus item with ownership verification.
/// </summary>
public class GetFocusItemByIdQueryHandler : IRequestHandler<GetFocusItemByIdQuery, Result<FocusItemResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<GetFocusItemByIdQueryHandler> _logger;

    public GetFocusItemByIdQueryHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<GetFocusItemByIdQueryHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<FocusItemResponse>> Handle(
        GetFocusItemByIdQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Retrieving focus item. Id: {Id}, UserId: {UserId}",
            request.Id, request.UserId);

        var focusItem = await _focusItemRepository.GetByIdAsync(
            request.Id, cancellationToken);

        if (focusItem == null)
        {
            return Result<FocusItemResponse>.Failure(
                Error.NotFound("FocusItem", request.Id));
        }

        // Verify ownership
        if (focusItem.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User attempted to access focus item belonging to another user. " +
                "UserId: {UserId}, FocusItemId: {FocusItemId}, FocusItemUserId: {FocusItemUserId}",
                request.UserId, request.Id, focusItem.UserId);

            return Result<FocusItemResponse>.Failure(
                Error.Forbidden("Access denied to this focus item"));
        }

        _logger.LogDebug(
            "Retrieved focus item. Id: {Id}, Title: {Title}, Status: {Status}",
            focusItem.Id, focusItem.Title, focusItem.Status);

        return Result<FocusItemResponse>.Success(focusItem.ToResponse());
    }
}
