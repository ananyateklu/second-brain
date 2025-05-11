using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Notes;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SecondBrain.Api.Gamification;
using System.Text.Json;
using SecondBrain.Api.Enums;
using SecondBrain.Services.Gamification;

namespace SecondBrain.Api.Controllers
{
    public abstract class ApiControllerBase : ControllerBase
    {
        protected string GetUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("User ID not found in token.");
            }
            return userId;
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotesController : ApiControllerBase
    {
        private readonly DataContext _context;
        private readonly IXPService _xpService;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<NotesController> _logger;
        private const string USER_ID_NOT_FOUND_ERROR = "User ID not found in token.";
        private const string NOTE_NOT_FOUND_ERROR = "Note not found.";

        public NotesController(DataContext context, IXPService xpService, IAchievementService achievementService, ILogger<NotesController> logger)
        {
            _context = context;
            _xpService = xpService;
            _achievementService = achievementService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NoteResponse>>> GetNotes()
        {
            var userId = GetUserId();
            var notes = await _context.Notes
                .Include(n => n.NoteLinks)
                    .ThenInclude(nl => nl.LinkedNote)
                .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.Task)
                .Include(n => n.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .ThenInclude(rl => rl.Reminder)
                .Where(n => n.UserId == userId && !n.IsDeleted)
                .ToListAsync();

            var reminderLinks = await _context.ReminderLinks
                .Where(rl => !rl.IsDeleted && notes.Select(n => n.Id).Contains(rl.LinkedItemId))
                .Include(rl => rl.Reminder)
                .ToListAsync();

            var responses = notes.Select(note =>
            {
                var response = NoteResponse.FromEntity(note);
                response.LinkedReminders = reminderLinks
                    .Where(rl => rl.LinkedItemId == note.Id && !rl.IsDeleted)
                    .Select(rl => new LinkedReminderDto
                    {
                        Id = rl.ReminderId,
                        Title = rl.Reminder.Title,
                        Description = rl.Reminder.Description ?? string.Empty,
                        DueDateTime = rl.Reminder.DueDateTime,
                        IsCompleted = rl.Reminder.IsCompleted,
                        IsSnoozed = rl.Reminder.IsSnoozed,
                        CreatedAt = rl.Reminder.CreatedAt,
                        UpdatedAt = rl.Reminder.UpdatedAt
                    })
                    .ToList();
                return response;
            });

            return Ok(responses);
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
                }

                var note = new Note
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = request.Title,
                    Content = request.Content,
                    Tags = string.Join(",", request.Tags ?? new List<string>()),
                    IsPinned = request.IsPinned,
                    IsFavorite = request.IsFavorite,
                    IsArchived = false,
                    IsIdea = false, // No longer support storing ideas in Notes table
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    UserId = userId
                };

                _context.Notes.Add(note);
                await _context.SaveChangesAsync();

                // Award XP for creating a note
                var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(userId, "createnote");

                // Check for achievements
                var unlockedAchievements = await _achievementService.CheckAndUnlockAchievementsAsync(userId, "createnote");

                _logger.LogInformation(
                    "Note created: {NoteId}, XP awarded: {XP}, Level: {Level}, Achievements: {AchievementCount}",
                    note.Id, newXP, newLevel, unlockedAchievements.Count
                );

                var response = new NoteResponse
                {
                    Id = note.Id,
                    Title = note.Title,
                    Content = note.Content,
                    Tags = !string.IsNullOrEmpty(note.Tags)
                        ? note.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                        : new List<string>(),
                    IsPinned = note.IsPinned,
                    IsFavorite = note.IsFavorite,
                    IsArchived = note.IsArchived,
                    ArchivedAt = note.ArchivedAt,
                    CreatedAt = note.CreatedAt,
                    UpdatedAt = note.UpdatedAt,
                    LinkedNoteIds = new List<string>(),
                    XPAwarded = XPValues.CreateNote,
                    NewTotalXP = newXP,
                    LeveledUp = leveledUp,
                    NewLevel = newLevel,
                    UnlockedAchievements = unlockedAchievements
                };

                return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating note");
                return StatusCode(500, new { error = "An error occurred while creating the note." });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<NoteResponse>> GetNoteById(string id)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                    .ThenInclude(nl => nl.LinkedNote)
                .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.Task)
                .Include(n => n.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .ThenInclude(rl => rl.Reminder)
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            var reminderLinks = await _context.ReminderLinks
                .Where(rl => !rl.IsDeleted && rl.LinkedItemId == id)
                .Include(rl => rl.Reminder)
                .ToListAsync();

            var response = NoteResponse.FromEntity(note);
            response.LinkedReminders = reminderLinks
                .Select(rl => new LinkedReminderDto
                {
                    Id = rl.ReminderId,
                    Title = rl.Reminder.Title,
                    Description = rl.Reminder.Description ?? string.Empty,
                    DueDateTime = rl.Reminder.DueDateTime,
                    IsCompleted = rl.Reminder.IsCompleted,
                    IsSnoozed = rl.Reminder.IsSnoozed,
                    CreatedAt = rl.Reminder.CreatedAt,
                    UpdatedAt = rl.Reminder.UpdatedAt
                })
                .ToList();

            return Ok(response);
        }

        [HttpDelete("{id}/links/{targetNoteId}")]
        public async Task<IActionResult> RemoveLink(string id, string targetNoteId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Soft delete approach for links
            var links = await _context.NoteLinks
                .Where(nl => ((nl.NoteId == id && nl.LinkedNoteId == targetNoteId) ||
                              (nl.NoteId == targetNoteId && nl.LinkedNoteId == id)) &&
                              !nl.IsDeleted)
                .ToListAsync();

            if (!links.Any())
            {
                return NotFound(new { error = "Link not found." });
            }

            // Soft delete the links instead of removing them
            foreach (var link in links)
            {
                link.IsDeleted = true;
                link.DeletedAt = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();

            // Return both updated notes with their active links
            var updatedNotes = await _context.Notes
                .Include(n => n.NoteLinks.Where(nl => !nl.IsDeleted))
                .ThenInclude(nl => nl.LinkedNote)
                .Where(n => n.Id == id || n.Id == targetNoteId)
                .ToListAsync();

            // Transform to API response format
            var responses = updatedNotes.Select(n => new NoteResponse
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                Tags = (n.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                IsPinned = n.IsPinned,
                IsFavorite = n.IsFavorite,
                IsArchived = n.IsArchived,
                ArchivedAt = n.ArchivedAt,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt,
                LinkedNoteIds = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList(),
                Links = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => new NoteLinkDto
                    {
                        Source = n.Id,
                        Target = nl.LinkedNoteId,
                        Type = nl.LinkType,
                        CreatedAt = nl.CreatedAt
                    })
                    .ToList()
            }).ToList();

            return Ok(new
            {
                sourceNote = responses.First(n => n.Id == id),
                targetNote = responses.First(n => n.Id == targetNoteId)
            });
        }

        [HttpPost("{id}/links")]
        public async Task<IActionResult> AddLink(string id, [FromBody] SecondBrain.Api.DTOs.Notes.AddLinkRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var sourceNote = await _context.Notes.FindAsync(id);
            var targetNote = await _context.Notes.FindAsync(request.TargetNoteId);

            if (sourceNote == null || targetNote == null || sourceNote.UserId != userId || targetNote.UserId != userId)
            {
                return NotFound(new { error = "Note not found." });
            }

            // Check if either note is deleted
            if (sourceNote.IsDeleted || targetNote.IsDeleted)
            {
                return BadRequest(new { error = "Cannot link to a deleted note." });
            }

            // Check if link already exists (active links only)
            var existingActiveLink = await _context.NoteLinks
                .AnyAsync(nl =>
                    ((nl.NoteId == id && nl.LinkedNoteId == request.TargetNoteId) ||
                    (nl.NoteId == request.TargetNoteId && nl.LinkedNoteId == id)) && 
                    !nl.IsDeleted);

            if (existingActiveLink)
            {
                return BadRequest(new { error = "Notes are already linked." });
            }

            // Check for soft-deleted links that can be reactivated
            var existingDeletedLinks = await _context.NoteLinks
                .Where(nl => 
                    ((nl.NoteId == id && nl.LinkedNoteId == request.TargetNoteId) ||
                    (nl.NoteId == request.TargetNoteId && nl.LinkedNoteId == id)) && 
                    nl.IsDeleted)
                .ToListAsync();

            var linkType = request.LinkType ?? "default";
            var timestamp = DateTime.UtcNow;

            if (existingDeletedLinks.Any())
            {
                // Reactivate existing soft-deleted links
                foreach (var link in existingDeletedLinks)
                {
                    link.IsDeleted = false;
                    link.DeletedAt = null;
                    link.LinkType = linkType;
                    link.CreatedAt = timestamp;
                    link.CreatedBy = userId;
                }
            }
            else
            {
                // Create new links if no soft-deleted links exist
                var noteLink = new NoteLink { 
                    NoteId = id, 
                    LinkedNoteId = request.TargetNoteId,
                    LinkType = linkType,
                    CreatedAt = timestamp,
                    CreatedBy = userId
                };
                
                var reverseLink = new NoteLink { 
                    NoteId = request.TargetNoteId, 
                    LinkedNoteId = id,
                    LinkType = linkType,
                    CreatedAt = timestamp,
                    CreatedBy = userId
                };

                _context.NoteLinks.AddRange(noteLink, reverseLink);
            }

            await _context.SaveChangesAsync();

            // Award XP for creating a link
            await _xpService.AwardXPAsync(userId, "createlink");

            // Return both updated notes with their links
            var updatedNotes = await _context.Notes
                .Include(n => n.NoteLinks.Where(nl => !nl.IsDeleted))
                .ThenInclude(nl => nl.LinkedNote)
                .Where(n => n.Id == id || n.Id == request.TargetNoteId)
                .ToListAsync();

            // Transform to API response format
            var responses = updatedNotes.Select(n => new NoteResponse
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                Tags = (n.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                IsPinned = n.IsPinned,
                IsFavorite = n.IsFavorite,
                IsArchived = n.IsArchived,
                ArchivedAt = n.ArchivedAt,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt,
                LinkedNoteIds = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList(),
                Links = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => new NoteLinkDto
                    {
                        Source = n.Id,
                        Target = nl.LinkedNoteId,
                        Type = nl.LinkType,
                        CreatedAt = nl.CreatedAt
                    })
                    .ToList()
            }).ToList();

            return Ok(new
            {
                sourceNote = responses.First(n => n.Id == id),
                targetNote = responses.First(n => n.Id == request.TargetNoteId)
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            note.IsDeleted = true;
            note.DeletedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("deleted")]
        public async Task<ActionResult<IEnumerable<NoteResponse>>> GetDeletedNotes()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            // Use IgnoreQueryFilters to bypass the global query filter for soft deleted items
            var notes = await _context.Notes
                .IgnoreQueryFilters()
                .Include(n => n.NoteLinks.Where(nl => !nl.IsDeleted))
                    .ThenInclude(nl => nl.LinkedNote)
                .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.Task)
                .Include(n => n.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .ThenInclude(rl => rl.Reminder)
                .Where(n => n.UserId == userId && n.IsDeleted)
                .ToListAsync();

            var reminderLinks = await _context.ReminderLinks
                .Where(rl => !rl.IsDeleted && notes.Select(n => n.Id).Contains(rl.LinkedItemId))
                .Include(rl => rl.Reminder)
                .ToListAsync();

            var responses = notes.Select(note => NoteResponse.FromEntity(note)).ToList();
            
            return Ok(responses);
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId && n.IsDeleted)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            note.IsDeleted = false;
            note.DeletedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(NoteResponse.FromEntity(note));
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteNotePermanently(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            // Find the note and include all its links
            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                    .ThenInclude(nl => nl.LinkedNote)
                .Include(n => n.ReminderLinks)
                .Include(n => n.TaskLinks)
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // 1. Track unlink activities
                    var unlinkActivities = note.NoteLinks.Select(link => new Activity
                    {
                        UserId = userId,
                        ActionType = ActivityActionType.UNLINK.ToString(),
                        ItemType = ActivityItemType.NOTELINK.ToString(),
                        ItemId = note.Id,
                        ItemTitle = note.Title,
                        Description = $"Unlinked from '{link.LinkedNote.Title}' (due to deletion)",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            sourceNoteId = note.Id,
                            targetNoteId = link.LinkedNote.Id,
                            sourceNoteTitle = note.Title,
                            targetNoteTitle = link.LinkedNote.Title,
                            reason = "deletion"
                        })
                    });
                    _context.Activities.AddRange(unlinkActivities);

                    // 2. Remove all task links (soft delete approach)
                    var taskLinks = await _context.TaskLinks
                        .Where(tl => tl.LinkedItemId == id)
                        .ToListAsync();
                    // Soft delete instead of remove
                    foreach (var link in taskLinks)
                    {
                        link.IsDeleted = true;
                        link.DeletedAt = DateTime.UtcNow;
                    }

                    // 3. Remove all reminder links (soft delete approach)
                    var reminderLinks = await _context.ReminderLinks
                        .Where(rl => rl.LinkedItemId == id)
                        .ToListAsync();
                    // Soft delete instead of remove
                    foreach (var link in reminderLinks)
                    {
                        link.IsDeleted = true;
                        link.DeletedAt = DateTime.UtcNow;
                    }

                    // 4. Remove all note links
                    var noteLinks = await _context.NoteLinks
                        .Where(nl => nl.NoteId == id || nl.LinkedNoteId == id)
                        .ToListAsync();
                    _context.NoteLinks.RemoveRange(noteLinks);

                    // 5. Delete the note itself
                    _context.Notes.Remove(note);

                    // 6. Save all changes
                    await _context.SaveChangesAsync();

                    // 7. Commit transaction
                    await transaction.CommitAsync();

                    return Ok(new { message = "Note permanently deleted" });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to permanently delete note {NoteId}", id);
                return StatusCode(500, new { error = "Failed to delete note permanently." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(string id, [FromBody] UpdateNoteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.Task)
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            // Check if archiving a note
            bool isArchiving = request.IsArchived.HasValue && request.IsArchived.Value && !note.IsArchived;

            // Update properties if provided
            if (request.Title != null) note.Title = request.Title;
            if (request.Content != null) note.Content = request.Content;
            if (request.Tags != null) note.Tags = string.Join(",", request.Tags);
            if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
            if (request.IsFavorite.HasValue) note.IsFavorite = request.IsFavorite.Value;
            if (request.IsArchived.HasValue) 
            {
                note.IsArchived = request.IsArchived.Value;
                if (request.IsArchived.Value) 
                {
                    note.ArchivedAt = DateTime.UtcNow;
                }
                else
                {
                    note.ArchivedAt = null;
                }
            }
            if (request.IsDeleted.HasValue)
            {
                note.IsDeleted = request.IsDeleted.Value;
                note.DeletedAt = request.IsDeleted.Value ? DateTime.UtcNow : null;
            }

            note.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Award XP if note is being archived
            if (isArchiving)
            {
                string actionType = "archivenote";
                await _xpService.AwardXPAsync(
                    userId,
                    actionType,
                    null,
                    note.Id,
                    note.Title
                );
            }

            var response = NoteResponse.FromEntity(note);
            return Ok(response);
        }

        [HttpGet("archived")]
        public async Task<IActionResult> GetArchivedNotes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            // Add logging to check the userId and query
            _logger.LogInformation("Fetching archived notes for user: {UserId}", userId);

            // Get the archived notes with more detailed logging
            var archivedNotes = await _context.Notes
                .Where(n => n.UserId == userId && n.IsArchived)
                .Include(n => n.NoteLinks)
                .AsNoTracking() // Add this to improve performance for read-only operations
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} archived notes", archivedNotes.Count);

            // Map to response
            var response = archivedNotes.Select(n => new NoteResponse
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                Tags = !string.IsNullOrEmpty(n.Tags)
                    ? n.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    : new List<string>(),
                IsPinned = n.IsPinned,
                IsFavorite = n.IsFavorite,
                IsArchived = n.IsArchived,
                ArchivedAt = n.ArchivedAt,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt,
                LinkedNoteIds = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList()
            }).ToList();

            return Ok(response);
        }

        [HttpPost("{id}/unarchive")]
        public async Task<IActionResult> UnarchiveNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId && n.IsArchived)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            note.IsArchived = false;
            note.ArchivedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(NoteResponse.FromEntity(note));
        }

        [HttpPost("{id}/reminders")]
        public async Task<ActionResult<NoteResponse>> LinkReminder(string id, [FromBody] LinkReminderRequest request)
        {
            try
            {
                _logger.LogInformation("Attempting to link reminder {ReminderId} to note {NoteId}", request.ReminderId, id);

                var userId = GetUserId();
                var note = await _context.Notes
                    .Include(n => n.NoteLinks)
                    .Include(n => n.TaskLinks)
                    .Include(n => n.ReminderLinks)
                    .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

                if (note == null)
                {
                    _logger.LogWarning("Note {NoteId} not found", id);
                    return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
                }

                var reminder = await _context.Reminders
                    .FirstOrDefaultAsync(r => r.Id == request.ReminderId && r.UserId == userId);

                if (reminder == null)
                {
                    _logger.LogWarning("Reminder {ReminderId} not found", request.ReminderId);
                    return NotFound(new { error = "Reminder not found." });
                }

                // Check for existing soft-deleted link
                var existingLink = await _context.ReminderLinks
                    .FirstOrDefaultAsync(rl => rl.ReminderId == request.ReminderId &&
                                             rl.LinkedItemId == id);

                if (existingLink != null)
                {
                    // Update existing link instead of creating new one
                    existingLink.IsDeleted = false;
                    existingLink.DeletedAt = null;
                    existingLink.CreatedAt = DateTime.UtcNow;
                    existingLink.CreatedBy = userId;
                }
                else
                {
                    // Create new link
                    var reminderLink = new ReminderLink
                    {
                        ReminderId = request.ReminderId,
                        LinkedItemId = id,
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = userId,
                        LinkType = "note"
                    };
                    _context.ReminderLinks.Add(reminderLink);
                }

                await _context.SaveChangesAsync();

                // Reload the note with all its relationships
                note = await _context.Notes
                    .Include(n => n.NoteLinks)
                        .ThenInclude(nl => nl.LinkedNote)
                    .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                        .ThenInclude(tl => tl.Task)
                    .Include(n => n.ReminderLinks.Where(rl => !rl.IsDeleted))
                        .ThenInclude(rl => rl.Reminder)
                    .FirstOrDefaultAsync(n => n.Id == id);

                _logger.LogInformation("Successfully linked reminder {ReminderId} to note {NoteId}", request.ReminderId, id);
                return Ok(NoteResponse.FromEntity(note!));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking reminder to note {NoteId}", id);
                return StatusCode(500, new { error = "An error occurred while linking the reminder." });
            }
        }

        public class LinkReminderRequest
        {
            public string ReminderId { get; set; } = string.Empty;
        }

        [HttpDelete("{id}/reminders/{reminderId}")]
        public async Task<ActionResult<NoteResponse>> UnlinkReminder(string id, string reminderId)
        {
            var reminderLink = await _context.ReminderLinks
                .FirstOrDefaultAsync(rl => rl.ReminderId == reminderId &&
                                         rl.LinkedItemId == id);

            if (reminderLink == null)
            {
                return NotFound(new { error = "Reminder link not found." });
            }

            // Soft delete the link instead of removing it permanently
            reminderLink.IsDeleted = true;
            reminderLink.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Reload the note with remaining active links
            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                    .ThenInclude(nl => nl.LinkedNote)
                .Include(n => n.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.Task)
                .Include(n => n.ReminderLinks.Where(rl => !rl.IsDeleted))
                    .ThenInclude(rl => rl.Reminder)
                .FirstOrDefaultAsync(n => n.Id == id);

            return Ok(NoteResponse.FromEntity(note!));
        }

    }
}
