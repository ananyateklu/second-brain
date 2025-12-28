using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Focus.GetCompletedItems;

/// <summary>
/// Handler for GetCompletedItemsQuery - retrieves completed focus items within a date range.
/// Items are ordered by completion date (most recent first).
/// </summary>
public class GetCompletedItemsQueryHandler : IRequestHandler<GetCompletedItemsQuery, Result<CompletedItemsResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<GetCompletedItemsQueryHandler> _logger;

    public GetCompletedItemsQueryHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<GetCompletedItemsQueryHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<CompletedItemsResponse>> Handle(
        GetCompletedItemsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Retrieving completed items. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
            request.UserId, request.StartDate, request.EndDate);

        // Validate date range
        if (request.EndDate < request.StartDate)
        {
            return Result<CompletedItemsResponse>.Failure(
                Error.Validation("EndDate must be greater than or equal to StartDate"));
        }

        var completedItems = await _focusItemRepository.GetCompletedInRangeAsync(
            request.UserId,
            request.StartDate,
            request.EndDate,
            cancellationToken);

        var itemsList = completedItems.ToList();

        // Calculate total actual minutes
        var totalActualMinutes = itemsList.Sum(i => i.ActualMinutes ?? 0);

        var response = new CompletedItemsResponse
        {
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Items = itemsList
                .OrderByDescending(i => i.CompletedAt)
                .Select(i => i.ToResponse())
                .ToList(),
            TotalCount = itemsList.Count,
            TotalActualMinutes = totalActualMinutes
        };

        _logger.LogDebug(
            "Retrieved completed items. UserId: {UserId}, Count: {Count}, TotalMinutes: {TotalMinutes}",
            request.UserId, response.TotalCount, totalActualMinutes);

        return Result<CompletedItemsResponse>.Success(response);
    }
}
