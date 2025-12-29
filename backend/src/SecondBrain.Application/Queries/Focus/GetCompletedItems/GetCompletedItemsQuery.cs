using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Focus.GetCompletedItems;

/// <summary>
/// Query to retrieve completed focus items within a date range.
/// </summary>
/// <param name="UserId">The user ID to get completed items for</param>
/// <param name="StartDate">Start of the date range (inclusive)</param>
/// <param name="EndDate">End of the date range (inclusive)</param>
public record GetCompletedItemsQuery(
    string UserId,
    DateTime StartDate,
    DateTime EndDate) : IRequest<Result<CompletedItemsResponse>>;
