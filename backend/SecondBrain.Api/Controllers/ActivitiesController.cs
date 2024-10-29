using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SecondBrain.Api.DTOs.Activities;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActivitiesController : ControllerBase
    {
        private readonly DataContext _context;

        public ActivitiesController(DataContext context)
        {
            _context = context;
        }

        // GET: api/Activities
        [HttpGet]
        public async Task<IActionResult> GetActivities()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var activities = await _context.Activities
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(activities);
        }

        // POST: api/Activities
        [HttpPost]
        public async Task<IActionResult> CreateActivity([FromBody] CreateActivityRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var activity = new Activity
            {
                UserId = userId,
                ActionType = request.ActionType,
                ItemType = request.ItemType,
                ItemId = request.ItemId,
                ItemTitle = request.ItemTitle,
                Description = request.Description,
                MetadataJson = request.Metadata != null ? JsonConvert.SerializeObject(request.Metadata) : null,
                Timestamp = DateTime.UtcNow
            };

            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetActivities), new { id = activity.Id }, activity);
        }
    }
}
