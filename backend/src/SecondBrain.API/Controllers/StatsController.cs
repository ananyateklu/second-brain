using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Application.Services;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
//[Authorize] // Assuming we want auth, but based on other controllers I see ApiKeyAuth might be used or handled globally
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;
    public StatsController(IStatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet("ai")]
    public async Task<ActionResult<AIUsageStatsResponse>> GetAIUsageStats()
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var stats = await _statsService.GetAIUsageStatsAsync(userId);
        return Ok(stats);
    }
}

