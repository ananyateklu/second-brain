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

        // Get status counts for scheduled items on this day
        var statusCounts = await _focusItemRepository.GetStatusCountsAsync(
            request.UserId, date, cancellationToken);

        // Get count of items completed ON this date (for "X done" badge)
        // This counts by completed_at, not scheduled_date
        var completedOnDateCount = await _focusItemRepository.GetCompletedOnDateCountAsync(
            request.UserId, date, cancellationToken);

        // Calculate totals - exclude current focus from scheduled items to avoid duplicates
        var scheduledList = scheduledItems
            .Where(i => currentFocus == null || i.Id != currentFocus.Id)
            .ToList();
        var totalEstimatedMinutes = scheduledList
            .Where(i => i.Status != "completed")
            .Sum(i => i.EstimatedMinutes ?? 0);

        // Count overdue items (scheduled before today's date)
        var overdueCount = scheduledList.Count(i => i.ScheduledDate < date);

        var response = new TodaysPlanResponse
        {
            Date = date,
            CurrentFocus = currentFocus?.ToResponse(),
            ScheduledItems = scheduledList
                .OrderBy(i => i.ScheduledDate) // Overdue items first
                .ThenBy(i => i.SortOrder)
                .Select(i => i.ToResponse())
                .ToList(),
            CompletedTodayCount = completedOnDateCount,
            TotalEstimatedMinutes = totalEstimatedMinutes,
            StatusCounts = statusCounts,
            OverdueCount = overdueCount
        };

        _logger.LogDebug(
            "Retrieved today's plan. UserId: {UserId}, Date: {Date}, ScheduledCount: {ScheduledCount}, CompletedOnDate: {CompletedOnDate}",
            request.UserId, date, response.ScheduledItems.Count, completedOnDateCount);

        return Result<TodaysPlanResponse>.Success(response);
    }
}
