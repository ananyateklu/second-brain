using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.UserPreferences.UpdatePreferences;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.UserPreferences.GetPreferences;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
public class UserPreferencesController : ControllerBase
{
    private readonly IMediator _mediator;

    public UserPreferencesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get user preferences
    /// </summary>
    [HttpGet("{userId}")]
    public async Task<ActionResult<UserPreferencesResponse>> GetPreferences(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPreferencesQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Update user preferences
    /// </summary>
    [HttpPut("{userId}")]
    public async Task<ActionResult<UserPreferencesResponse>> UpdatePreferences(
        string userId,
        [FromBody] UpdateUserPreferencesRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new UpdatePreferencesCommand(userId, request);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }
}
