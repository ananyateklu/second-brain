using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;

namespace SecondBrain.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserPreferencesController : ControllerBase
{
    private readonly IUserPreferencesService _preferencesService;
    private readonly ILogger<UserPreferencesController> _logger;

    public UserPreferencesController(
        IUserPreferencesService preferencesService,
        ILogger<UserPreferencesController> logger)
    {
        _preferencesService = preferencesService;
        _logger = logger;
    }

    /// <summary>
    /// Get user preferences
    /// </summary>
    [HttpGet("{userId}")]
    public async Task<ActionResult<UserPreferencesResponse>> GetPreferences(string userId)
    {
        try
        {
            var preferences = await _preferencesService.GetPreferencesAsync(userId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting preferences for user {UserId}", userId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update user preferences
    /// </summary>
    [HttpPut("{userId}")]
    public async Task<ActionResult<UserPreferencesResponse>> UpdatePreferences(
        string userId,
        [FromBody] UpdateUserPreferencesRequest request)
    {
        try
        {
            var preferences = await _preferencesService.UpdatePreferencesAsync(userId, request);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating preferences for user {UserId}", userId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

