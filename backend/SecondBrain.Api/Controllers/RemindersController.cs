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
using System.Collections.Generic;
using SecondBrain.Api.Gamification;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RemindersController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<RemindersController> _logger;
        private readonly IXPService _xpService;
        private const string REMINDER_NOT_FOUND = "Reminder not found.";

        public RemindersController(DataContext context, ILogger<RemindersController> logger, IXPService xpService)
        {
            _context = context;
            _logger = logger;
            _xpService = xpService;
        }

        private async Task<(Dictionary<string, dynamic> Items, List<ReminderLink> Links)> LoadLinkedItems(IEnumerable<ReminderLink> links)
        {
            var items = new Dictionary<string, dynamic>();
            var validLinks = new List<ReminderLink>();

            foreach (var link in links.Where(l => !l.IsDeleted))
            {
                if (link.LinkType.ToLower() == "note")
                {
                    var note = await _context.Notes
                        .FirstOrDefaultAsync(n => n.Id == link.LinkedItemId && !n.IsDeleted);
                    if (note != null)
                    {
                        items[link.LinkedItemId] = (dynamic)note;
                        validLinks.Add(link);
                    }
                }
                else if (link.LinkType.ToLower() == "idea")
                {
                    var idea = await _context.Ideas
                        .FirstOrDefaultAsync(i => i.Id == link.LinkedItemId && !i.IsDeleted);
                    if (idea != null)
                    {
                        items[link.LinkedItemId] = idea;
                        validLinks.Add(link);
                    }
                }
            }

            return (items, validLinks);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReminders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminders = await _context.Reminders
                .Include(r => r.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .ThenInclude(rl => rl.LinkedItem)
                .Where(r => r.UserId == userId && !r.IsDeleted)
                .AsNoTracking()
                .ToListAsync();

            var reminderResponses = new List<ReminderResponse>();
            foreach (var reminder in reminders)
            {
                if (reminder.ReminderLinks?.Any() == true)
                {
                    var linkedItems = reminder.ReminderLinks
                        .Where(rl => !rl.IsDeleted && rl.LinkedItem != null)
                        .ToDictionary(
                            rl => rl.LinkedItemId,
                            rl => (dynamic)rl.LinkedItem
                        );
                    
                    reminderResponses.Add(ReminderResponse.FromEntity(reminder, linkedItems));
                }
                else
                {
                    reminderResponses.Add(ReminderResponse.FromEntity(reminder, null));
                }
            }

            return Ok(reminderResponses);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReminderById(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            if (reminder.ReminderLinks?.Any() == true)
            {
                var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
                reminder.ReminderLinks = validLinks;
                return Ok(ReminderResponse.FromEntity(reminder, linkedItems));
            }

            return Ok(ReminderResponse.FromEntity(reminder, null));
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

            // Award XP for creating a reminder
            if (!string.IsNullOrEmpty(userId))
            {
                await _xpService.AwardXPAsync(userId, "createreminder", null, reminder.Id, reminder.Title);
            }

            return CreatedAtAction(nameof(GetReminderById), new { id = reminder.Id }, ReminderResponse.FromEntity(reminder, null));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReminder(string id, [FromBody] UpdateReminderRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            // Check if the reminder is being completed
            bool wasCompleted = reminder.IsCompleted;

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

            // Check if the reminder has been completed now but wasn't before
            if (request.IsCompleted.HasValue && 
                request.IsCompleted.Value && 
                !wasCompleted)
            {
                // Award XP for completing a reminder
                if (!string.IsNullOrEmpty(userId))
                {
                    await _xpService.AwardXPAsync(userId, "completereminder", null, reminder.Id, reminder.Title);
                }
            }

            if (reminder.ReminderLinks?.Any() == true)
            {
                var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
                reminder.ReminderLinks = validLinks;
                return Ok(ReminderResponse.FromEntity(reminder, linkedItems));
            }

            return Ok(ReminderResponse.FromEntity(reminder, null));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReminder(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .Where(r => r.Id == id && r.UserId == userId)
                .FirstOrDefaultAsync();

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            reminder.IsDeleted = true;
            reminder.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Reminder deleted successfully." });
        }

        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedReminders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }
            
            var reminders = await _context.Reminders
                .IgnoreQueryFilters()
                .Include(r => r.ReminderLinks)
                .Where(r => r.UserId == userId && r.IsDeleted)
                .ToListAsync();

            var reminderResponses = new List<ReminderResponse>();
            foreach (var reminder in reminders)
            {
                var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
                reminder.ReminderLinks = validLinks;
                var response = ReminderResponse.FromEntity(reminder, linkedItems);
                reminderResponses.Add(response);
            }

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
                .Include(r => r.ReminderLinks)
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

                    // Soft delete the reminder links instead of removing them
                    if (reminder.ReminderLinks != null && reminder.ReminderLinks.Any())
                    {
                        foreach (var link in reminder.ReminderLinks)
                        {
                            link.IsDeleted = true;
                            link.DeletedAt = DateTime.UtcNow;
                        }
                    }
                    
                    // Remove the reminder itself
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

        [HttpPost("{reminderId}/links")]
        [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddReminderLink(string reminderId, [FromBody] ReminderLinkRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("Adding reminder link. ReminderId: {ReminderId}, LinkedItemId: {LinkedItemId}, UserId: {UserId}", 
                reminderId, request.LinkedItemId, userId);

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .FirstOrDefaultAsync(r => r.Id == reminderId && r.UserId == userId);

            if (reminder == null)
            {
                _logger.LogWarning("Reminder not found. ReminderId: {ReminderId}, UserId: {UserId}", reminderId, userId);
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            // Check if the linked item exists based on the link type
            bool linkedItemExists = false;
            if (request.LinkType.ToLower() == "note")
            {
                var note = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == request.LinkedItemId && n.UserId == userId && !n.IsDeleted);
                linkedItemExists = note != null;
            }
            else if (request.LinkType.ToLower() == "idea")
            {
                var idea = await _context.Ideas
                    .FirstOrDefaultAsync(i => i.Id == request.LinkedItemId && i.UserId == userId && !i.IsDeleted);
                linkedItemExists = idea != null;
            }
            else
            {
                _logger.LogWarning("Unsupported link type. LinkType: {LinkType}", request.LinkType);
                return BadRequest(new { error = "Unsupported link type" });
            }

            if (!linkedItemExists)
            {
                _logger.LogWarning("Linked item not found. LinkedItemId: {LinkedItemId}, LinkType: {LinkType}, UserId: {UserId}", 
                    request.LinkedItemId, request.LinkType, userId);
                return NotFound("Linked item not found");
            }

            // Check if link already exists (including soft-deleted ones)
            var existingLink = await _context.ReminderLinks
                .FirstOrDefaultAsync(rl => rl.ReminderId == reminderId && rl.LinkedItemId == request.LinkedItemId);

            if (existingLink != null)
            {
                if (!existingLink.IsDeleted)
                {
                    _logger.LogWarning("Reminder link already exists and is active. ReminderId: {ReminderId}, LinkedItemId: {LinkedItemId}", 
                        reminderId, request.LinkedItemId);
                    return BadRequest("Reminder is already linked to this item");
                }

                // Reactivate the soft-deleted link
                existingLink.IsDeleted = false;
                existingLink.DeletedAt = null;
                existingLink.Description = request.Description; // Update description if provided
                existingLink.CreatedAt = DateTime.UtcNow;      // Update creation time

                _logger.LogInformation("Reactivating existing reminder link: {@ReminderLink}", existingLink);
            }
            else
            {
                // Create new link if no existing link found
                if (string.IsNullOrEmpty(userId))
                {
                    throw new UnauthorizedAccessException("User ID not found in token.");
                }

                var reminderLink = new ReminderLink
                {
                    ReminderId = reminderId,
                    LinkedItemId = request.LinkedItemId,
                    LinkType = request.LinkType,
                    Description = request.Description,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId,
                    IsDeleted = false
                };

                _logger.LogInformation("Creating new reminder link: {@ReminderLink}", reminderLink);
                _context.ReminderLinks.Add(reminderLink);
            }

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Reminder link saved successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving reminder link");
                return StatusCode(500, new { error = "Failed to save reminder link" });
            }

            // Reload the reminder with its links
            try
            {
                reminder = await _context.Reminders
                    .Include(r => r.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .FirstAsync(r => r.Id == reminderId);

                var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
                reminder.ReminderLinks = validLinks;

                var response = ReminderResponse.FromEntity(reminder, linkedItems);
                _logger.LogInformation("Reminder link created successfully. ReminderId: {ReminderId}, LinkedItemId: {LinkedItemId}", 
                    reminderId, request.LinkedItemId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading reminder after saving link");
                return StatusCode(500, new { error = "Failed to load reminder after saving link" });
            }
        }

        [HttpDelete("{reminderId}/links/{linkedItemId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveReminderLink(string reminderId, string linkedItemId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var reminderLink = await _context.ReminderLinks
                .FirstOrDefaultAsync(rl => 
                    rl.ReminderId == reminderId && 
                    rl.LinkedItemId == linkedItemId && 
                    rl.Reminder.UserId == userId);

            if (reminderLink == null)
                return NotFound();

            reminderLink.IsDeleted = true;
            reminderLink.DeletedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks.Where(rl => !rl.IsDeleted))
                .FirstAsync(r => r.Id == reminderId);

            var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
            reminder.ReminderLinks = validLinks;

            return Ok(ReminderResponse.FromEntity(reminder, linkedItems));
        }

        [HttpPut("{reminderId}/links/{linkedItemId}")]
        public async Task<IActionResult> UpdateReminderLink(string reminderId, string linkedItemId, [FromBody] UpdateReminderLinkRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .FirstOrDefaultAsync(r => r.Id == reminderId && r.UserId == userId);

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            var reminderLink = await _context.ReminderLinks
                .FirstOrDefaultAsync(rl => rl.ReminderId == reminderId && rl.LinkedItemId == linkedItemId);

            if (reminderLink == null)
            {
                return NotFound(new { error = "Reminder link not found." });
            }

            if (request.Description != null)
            {
                reminderLink.Description = request.Description;
            }

            await _context.SaveChangesAsync();

            // Reload the reminder with updated links
            reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .FirstOrDefaultAsync(r => r.Id == reminderId);

            var (linkedItems, validLinks) = await LoadLinkedItems(reminder!.ReminderLinks);
            reminder.ReminderLinks = validLinks;
            var reminderResponse = ReminderResponse.FromEntity(reminder, linkedItems);

            return Ok(reminderResponse);
        }

        [HttpGet("{reminderId}/links")]
        public async Task<IActionResult> GetReminderLinks(string reminderId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var reminder = await _context.Reminders
                .Include(r => r.ReminderLinks)
                .FirstOrDefaultAsync(r => r.Id == reminderId && r.UserId == userId);

            if (reminder == null)
            {
                return NotFound(new { error = REMINDER_NOT_FOUND });
            }

            var (linkedItems, validLinks) = await LoadLinkedItems(reminder.ReminderLinks);
            reminder.ReminderLinks = validLinks;
            var reminderResponse = ReminderResponse.FromEntity(reminder, linkedItems);

            return Ok(reminderResponse.LinkedItems);
        }
    }
}
