using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SecondBrain.Api.Hubs;
using SecondBrain.Data;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IHubContext<ToolHub> _hubContext;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            DataContext context,
            IHubContext<ToolHub> hubContext,
            ILogger<UsersController> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        [HttpPost("trigger-stats-update")]
        public async Task<IActionResult> TriggerStatsUpdate()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                // Trigger the SignalR event for this user's group
                await _hubContext.Clients.Group($"User_{userId}").SendAsync("userstatsupdated");
                _logger.LogInformation($"Triggered stats update for user {userId} in group User_{userId}");

                return Ok(new { message = "Stats update triggered successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error triggering stats update");
                return StatusCode(500, new { error = "An error occurred while triggering stats update." });
            }
        }
    }
}