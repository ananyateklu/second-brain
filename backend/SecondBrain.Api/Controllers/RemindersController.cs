using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Reminders;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using System;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RemindersController : ControllerBase
    {
        private readonly DataContext _context;
        private const string REMINDER_NOT_FOUND = "Reminder not found.";
        private readonly ILogger<RemindersController> _logger;

        public RemindersController(DataContext context, ILogger<RemindersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReminders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminders = await _context.Reminders
                .Where(r => r.UserId == userId && !r.IsDeleted)
                .ToListAsync();

            var reminderResponses = reminders
                .Select(ReminderResponse.FromEntity)
                .ToList();

            return Ok(reminderResponses);
        }

        [HttpPost]
        public async Task<IActionResult> CreateReminder([FromBody] CreateReminderRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var reminder = new Reminder
            {
                Id = Guid.NewGuid().ToString(),
                Title = request.Title,
                Description = request.Description,
                DueDateTime = request.DueDateTime,
                RepeatInterval = request.RepeatInterval,
                CustomRepeatPattern = request.CustomRepeatPattern,
                Tags = request.Tags != null ? string.Join(",", request.Tags) : string.Empty,
                IsSnoozed = false,
                IsCompleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = userId
            };

            _context.Reminders.Add(reminder);
            await _context.SaveChangesAsync();

            var reminderResponse = ReminderResponse.FromEntity(reminder);

            return CreatedAtAction(nameof(GetReminderById), new { id = reminder.Id }, reminderResponse);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReminderById(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminder = await _context.Reminders
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            var reminderResponse = ReminderResponse.FromEntity(reminder);

            return Ok(reminderResponse);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReminder(string id, [FromBody] UpdateReminderRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            // Update properties if they are provided
            if (request.Title != null)
            {
                reminder.Title = request.Title;
            }

            if (request.Description != null)
            {
                reminder.Description = request.Description;
            }

            if (request.DueDateTime != null)
            {
                reminder.DueDateTime = request.DueDateTime.Value;
            }

            if (request.RepeatInterval != null)
            {
                reminder.RepeatInterval = request.RepeatInterval;
            }

            if (request.CustomRepeatPattern != null)
            {
                reminder.CustomRepeatPattern = request.CustomRepeatPattern;
            }

            if (request.IsSnoozed != null)
            {
                reminder.IsSnoozed = request.IsSnoozed.Value;
            }

            if (request.SnoozeUntil != null)
            {
                reminder.SnoozeUntil = request.SnoozeUntil;
            }

            if (request.IsCompleted != null)
            {
                reminder.IsCompleted = request.IsCompleted.Value;
            }

            if (request.CompletedAt != null)
            {
                reminder.CompletedAt = request.CompletedAt;
            }

            if (request.Tags != null)
            {
                reminder.Tags = string.Join(",", request.Tags);
            }

            if (request.IsDeleted != null)
            {
                reminder.IsDeleted = request.IsDeleted.Value;
            }

            if (request.DeletedAt != null)
            {
                reminder.DeletedAt = request.DeletedAt;
            }

            reminder.UpdatedAt = DateTime.UtcNow;

            _context.Reminders.Update(reminder);
            await _context.SaveChangesAsync();

            var reminderResponse = ReminderResponse.FromEntity(reminder);

            return Ok(reminderResponse);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReminder(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            _context.Reminders.Remove(reminder);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Reminder deleted successfully." });
        }

        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedReminders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminders = await _context.Reminders
                .Where(r => r.UserId == userId && r.IsDeleted)
                .ToListAsync();

            var reminderResponses = reminders
                .Select(ReminderResponse.FromEntity)
                .ToList();

            return Ok(reminderResponses);
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteReminderPermanently(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var reminder = await _context.Reminders
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Create activity for permanent deletion
                    var activity = new Activity
                    {
                        UserId = userId,
                        ActionType = "DELETE_PERMANENT",
                        ItemType = "REMINDER",
                        ItemId = reminder.Id,
                        ItemTitle = reminder.Title,
                        Description = $"Permanently deleted reminder: {reminder.Title}",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            reminderId = reminder.Id,
                            reminderTitle = reminder.Title,
                            dueDateTime = reminder.DueDateTime,
                            tags = reminder.Tags,
                            isCompleted = reminder.IsCompleted,
                            deletedAt = DateTime.UtcNow
                        })
                    };

                    _context.Activities.Add(activity);

                    // Remove the reminder
                    _context.Reminders.Remove(reminder);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    return NoContent();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to permanently delete reminder {ReminderId}", id);
                    await transaction.RollbackAsync();
                    throw new InvalidOperationException($"Failed to permanently delete reminder {id}", ex);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to permanently delete reminder {ReminderId}", id);
                return StatusCode(500, new { error = $"Failed to permanently delete reminder: {ex.Message}" });
            }
        }
    }
}
