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

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RemindersController : ControllerBase
    {
        private readonly DataContext _context;

        public RemindersController(DataContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReminders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminders = await _context.Reminders
                .Where(r => r.UserId == userId)
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
                return NotFound(new { error = "Reminder not found." });
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
                return NotFound(new { error = "Reminder not found." });
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
                return NotFound(new { error = "Reminder not found." });
            }

            _context.Reminders.Remove(reminder);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Reminder deleted successfully." });
        }
    }
}
