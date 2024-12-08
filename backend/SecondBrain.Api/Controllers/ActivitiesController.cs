using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SecondBrain.Api.DTOs.Activities;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActivitiesController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<ActivitiesController> _logger;

        public ActivitiesController(DataContext context, ILogger<ActivitiesController> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets all activities for the authenticated user
        /// </summary>
        /// <returns>List of activities ordered by timestamp</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<IEnumerable<Activity>>> GetActivities()
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var activities = await _context.Activities
                .AsNoTracking()
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(activities);
        }

        /// <summary>
        /// Creates a new activity for the authenticated user
        /// </summary>
        /// <param name="request">Activity details</param>
        /// <returns>Created activity</returns>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<Activity>> CreateActivity([FromBody] CreateActivityRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            if (userId == null)
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
                MetadataJson = request.Metadata is not null ? JsonConvert.SerializeObject(request.Metadata) : null!,
                Timestamp = DateTime.UtcNow
            };

            try
            {
                _context.Activities.Add(activity);
                await _context.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetActivities),
                    new { id = activity.Id },
                    activity);
            }
            catch (Exception ex)
            {
                // Log the exception here
                _logger.LogError(ex, "Error creating activity");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An error occurred while creating the activity." });
            }
        }

        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}
