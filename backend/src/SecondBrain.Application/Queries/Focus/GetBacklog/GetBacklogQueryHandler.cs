using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Focus.GetBacklog;

/// <summary>
/// Handler for GetBacklogQuery - retrieves non-scheduled, non-completed focus items.
/// Items are ordered by priority (P1 first) then by sort order.
/// </summary>
public class GetBacklogQueryHandler : IRequestHandler<GetBacklogQuery, Result<BacklogResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<GetBacklogQueryHandler> _logger;

    public GetBacklogQueryHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<GetBacklogQueryHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<BacklogResponse>> Handle(
        GetBacklogQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "Retrieving backlog. UserId: {UserId}, PriorityFilter: {Priority}",
            request.UserId, request.Priority);

        var backlogItems = await _focusItemRepository.GetBacklogAsync(
            request.UserId, request.Priority, cancellationToken);

        var itemsList = backlogItems.ToList();

        // Calculate priority counts
        var countByPriority = itemsList
            .GroupBy(i => i.Priority)
            .ToDictionary(g => g.Key, g => g.Count());

        var response = new BacklogResponse
        {
            Items = itemsList
                .OrderBy(i => i.Priority)     // P1 (1) first, then P2 (2), then P3 (3)
                .ThenBy(i => i.SortOrder)
                .Select(i => i.ToResponse())
                .ToList(),
            TotalCount = itemsList.Count,
            CountByPriority = countByPriority
        };

        _logger.LogDebug(
            "Retrieved backlog. UserId: {UserId}, TotalCount: {TotalCount}, P1: {P1Count}, P2: {P2Count}, P3: {P3Count}",
            request.UserId,
            response.TotalCount,
            countByPriority.GetValueOrDefault(1, 0),
            countByPriority.GetValueOrDefault(2, 0),
            countByPriority.GetValueOrDefault(3, 0));

        return Result<BacklogResponse>.Success(response);
    }
}
