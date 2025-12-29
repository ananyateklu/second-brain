using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Focus.GetFocusItemById;

/// <summary>
/// Query to retrieve a specific focus item by ID.
/// Verifies ownership before returning the item.
/// </summary>
/// <param name="Id">The focus item ID</param>
/// <param name="UserId">The user ID (for ownership verification)</param>
public record GetFocusItemByIdQuery(
    string Id,
    string UserId) : IRequest<Result<FocusItemResponse>>;
