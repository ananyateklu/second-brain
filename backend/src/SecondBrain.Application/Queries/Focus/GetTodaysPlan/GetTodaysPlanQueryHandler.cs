using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Focus.GetTodaysPlan;

/// <summary>
/// Handler for GetTodaysPlanQuery - retrieves the focus plan for a specific date.
/// Returns current focus, scheduled items, and completion statistics.
/// </summary>
public class GetTodaysPlanQueryHandler : IRequestHandler<GetTodaysPlanQuery, Result<TodaysPlanResponse>>
{
    private readonly IFocusItemRepository _focusItemRepository;
    private readonly ILogger<GetTodaysPlanQueryHandler> _logger;

    public GetTodaysPlanQueryHandler(
        IFocusItemRepository focusItemRepository,
        ILogger<GetTodaysPlanQueryHandler> logger)
    {
        _focusItemRepository = focusItemRepository;
        _logger = logger;
    }

    public async Task<Result<TodaysPlanResponse>> Handle(
        GetTodaysPlanQuery request,
        CancellationToken cancellationToken)
    {
        var date = request.EffectiveDate;

        _logger.LogDebug(
            "Retrieving today's plan. UserId: {UserId}, Date: {Date}",
            request.UserId, date);

        // Get current focus item
        var currentFocus = await _focusItemRepository.GetCurrentFocusAsync(
            request.UserId, cancellationToken);

        // Get scheduled items for the date
        var scheduledItems = await _focusItemRepository.GetByScheduledDateAsync(
            request.UserId, date, cancellationToken);

        // Get status counts for the day
        var statusCounts = await _focusItemRepository.GetStatusCountsAsync(
            request.UserId, date, cancellationToken);

        // Calculate totals - exclude current focus from scheduled items to avoid duplicates
        var scheduledList = scheduledItems
            .Where(i => currentFocus == null || i.Id != currentFocus.Id)
            .ToList();
        var completedCount = statusCounts.GetValueOrDefault("completed", 0);
        var totalEstimatedMinutes = scheduledList
            .Where(i => i.Status != "completed")
            .Sum(i => i.EstimatedMinutes ?? 0);

        var response = new TodaysPlanResponse
        {
            Date = date,
            CurrentFocus = currentFocus?.ToResponse(),
            ScheduledItems = scheduledList
                .OrderBy(i => i.SortOrder)
                .Select(i => i.ToResponse())
                .ToList(),
            CompletedTodayCount = completedCount,
            TotalEstimatedMinutes = totalEstimatedMinutes,
            StatusCounts = statusCounts
        };

        _logger.LogDebug(
            "Retrieved today's plan. UserId: {UserId}, Date: {Date}, ScheduledCount: {ScheduledCount}, CompletedCount: {CompletedCount}",
            request.UserId, date, response.ScheduledItems.Count, completedCount);

        return Result<TodaysPlanResponse>.Success(response);
    }
}
