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
using SecondBrain.Api.DTOs.Ideas;
using SecondBrain.Api.Services;

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
        private readonly IActivityLogger _activityLogger;
        private const string USER_ID_NOT_FOUND_ERROR = "User ID not found in token.";
        private const string NOTE_NOT_FOUND_ERROR = "Note not found.";

        public NotesController(DataContext context, IXPService xpService, IAchievementService achievementService, ILogger<NotesController> logger, IActivityLogger activityLogger)
        {
            _context = context;
            _xpService = xpService;
            _achievementService = achievementService;
            _logger = logger;
            _activityLogger = activityLogger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NoteResponse>>> GetNotes()
        {
            try
            {
                var userId = GetUserId();

                var notes = await _context.Notes
                    .Where(n => n.UserId == userId && !n.IsArchived && !n.IsDeleted)
                    .ToListAsync(); // Step 1: Get all relevant notes first

                var noteIds = notes.Select(n => n.Id).ToList();

                // Step 2: Get all links for these notes
                var allLinksForNotes = await _context.NoteLinks
                    .Where(link => noteIds.Contains(link.NoteId) && !link.IsDeleted)
                    .ToListAsync();

                // Step 3: Collect all unique LinkedItemIds and their types
                var allLinkedItemIds = allLinksForNotes
                    .Select(link => link.LinkedItemId)
                    .Distinct()
                    .ToList();

                // Step 4: Fetch all linked items from their respective tables
                var linkedNotesFromDb = await _context.Notes
                    .Where(n => allLinkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                    .Select(n => new { n.Id, n.Title, Type = "Note" })
                    .ToListAsync();

                var linkedIdeasFromDb = await _context.Ideas
                    .Where(i => allLinkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                    .Select(i => new { i.Id, i.Title, Type = "Idea" })
                    .ToListAsync();
                
                var linkedTasksFromDb = await _context.Tasks
                    .Where(t => allLinkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                    .Select(t => new { t.Id, t.Title, Type = "Task" })
                    .ToListAsync();

                var linkedRemindersFromDb = await _context.Reminders
                    .Where(r => allLinkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                    .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                    .ToListAsync();

                var linkedItemsLookup = linkedNotesFromDb
                    .Cast<dynamic>()
                    .Concat(linkedIdeasFromDb)
                    .Concat(linkedTasksFromDb)
                    .Concat(linkedRemindersFromDb)
                    .ToDictionary(item => (string)item.Id, item => new { Type = (string)item.Type, Title = (string)item.Title });

                // Step 5: Construct the response
                var responses = notes.Select(note =>
                {
                    var noteSpecificLinks = allLinksForNotes.Where(l => l.NoteId == note.Id).ToList();
                    var linkedItemsForThisNote = noteSpecificLinks
                        .Select(link => {
                            if (linkedItemsLookup.TryGetValue(link.LinkedItemId, out var itemDetails)) {
                                // Ensure itemDetails.Type matches link.LinkedItemType if necessary for stricter validation
                                // For now, we trust the ID lookup is sufficient if IDs are globally unique across these types
                                // or that the link.LinkedItemType was correctly stored.
                                return new DTOs.Ideas.LinkedItemResponse // Using Ideas.LinkedItemResponse for consistency
                                {
                                    Id = link.LinkedItemId,
                                    Type = itemDetails.Type, // Or link.LinkedItemType if preferred for source of truth
                                    Title = itemDetails.Title,
                                    LinkType = link.LinkType
                                };
                            }
                            _logger.LogWarning("Could not find details for linked item {LinkedItemId} of type {LinkedItemType} for note {NoteId}", link.LinkedItemId, link.LinkedItemType, note.Id);
                            return null;
                        })
                        .Where(x => x != null)
                        .Select(x => x!)
                        .ToList();
                    return NoteResponse.FromEntity(note, linkedItemsForThisNote);
                }).ToList();

                return Ok(responses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving notes");
                return StatusCode(500, new { error = "An error occurred while retrieving notes." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
        {
            try
            {
                var userId = GetUserId();

                var note = new Note
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = request.Title,
                    Content = request.Content,
                    Tags = request.Tags != null && request.Tags.Any() ? string.Join(",", request.Tags) : null,
                    IsPinned = request.IsPinned,
                    IsFavorite = request.IsFavorite,
                    IsArchived = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    UserId = userId
                };

                _context.Notes.Add(note);
                await _context.SaveChangesAsync();

                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.CREATE.ToString(),
                    ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Created note '{note.Title}'"
                );

                var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(userId, "createnote");
                var unlockedAchievements = await _achievementService.CheckAndUnlockAchievementsAsync(userId, "createnote");
                
                var noteResponse = NoteResponse.FromEntity(note, new List<LinkedItemResponse>(), XPValues.CreateNote, newXP, leveledUp, newLevel, unlockedAchievements ?? new List<UnlockedAchievement>());

                return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, noteResponse);
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
            // Use the internal helper method
            var noteResponse = await GetNoteByIdInternal(id, userId);

            if (noteResponse == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }
            return Ok(noteResponse);
        }

        [HttpPost("{noteId}/links")]
        public async Task<ActionResult<NoteResponse>> AddLink(string noteId, [FromBody] AddNoteLinkRequest request)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted && !n.IsArchived);

            if (note == null)
            {
                return NotFound(new { error = "Source note not found or is deleted/archived." });
            }

            bool targetExists = false;
            string targetTitle = "Unknown Item";
            string linkedItemTypeNormalized = request.LinkedItemType.ToLower();

            switch (linkedItemTypeNormalized)
            {
                case "note":
                    var linkedNote = await _context.Notes.FirstOrDefaultAsync(n => n.Id == request.LinkedItemId && n.UserId == userId && !n.IsDeleted && !n.IsArchived);
                    if (linkedNote != null) { targetExists = true; targetTitle = linkedNote.Title; }
                    break;
                case "idea":
                    var linkedIdea = await _context.Ideas.FirstOrDefaultAsync(i => i.Id == request.LinkedItemId && i.UserId == userId && !i.IsDeleted && !i.IsArchived);
                     if (linkedIdea != null) { targetExists = true; targetTitle = linkedIdea.Title; }
                    break;
                case "task":
                    var linkedTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == request.LinkedItemId && t.UserId == userId && !t.IsDeleted);
                    if (linkedTask != null) { targetExists = true; targetTitle = linkedTask.Title; }
                    break;
                case "reminder":
                    var linkedReminder = await _context.Reminders.FirstOrDefaultAsync(r => r.Id == request.LinkedItemId && r.UserId == userId && !r.IsDeleted);
                    if (linkedReminder != null) { targetExists = true; targetTitle = linkedReminder.Title; }
                    break;
                default:
                    return BadRequest(new { error = "Invalid LinkedItemType." });
            }

            if (!targetExists)
            {
                return NotFound(new { error = $"Target {request.LinkedItemType} not found, or it is deleted/archived." });
            }

            if (noteId == request.LinkedItemId && linkedItemTypeNormalized == "note") {
                 return BadRequest(new { error = "Cannot link a note to itself." });
            }
            
            // Check if an active link already exists
            var existingActiveLink = await _context.NoteLinks
                .FirstOrDefaultAsync(nl => 
                    nl.NoteId == noteId && 
                    nl.LinkedItemId == request.LinkedItemId && 
                    nl.LinkedItemType == request.LinkedItemType && 
                    !nl.IsDeleted);

            if (existingActiveLink != null)
            {
                return BadRequest(new { error = "Link already exists." });
            }

            // Check for a soft-deleted link that we can reactivate
            var existingSoftDeletedLink = await _context.NoteLinks
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(nl => 
                    nl.NoteId == noteId && 
                    nl.LinkedItemId == request.LinkedItemId && 
                    nl.LinkedItemType == request.LinkedItemType && 
                    nl.IsDeleted);

            if (existingSoftDeletedLink != null)
            {
                // Reactivate the soft-deleted link
                existingSoftDeletedLink.IsDeleted = false;
                existingSoftDeletedLink.DeletedAt = null;
                existingSoftDeletedLink.LinkType = request.LinkType;
                existingSoftDeletedLink.CreatedAt = DateTime.UtcNow;
                _logger.LogInformation("Reactivated link from Note {NoteId} to {LinkedItemType} {LinkedItemId}", noteId, request.LinkedItemType, request.LinkedItemId);
            }
            else
            {
                // Create a new link if no existing link (active or deleted) was found
                var newLink = new NoteLink
                {
                    NoteId = noteId,
                    LinkedItemId = request.LinkedItemId,
                    LinkedItemType = request.LinkedItemType,
                    LinkType = request.LinkType,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.NoteLinks.Add(newLink);
                _logger.LogInformation("Created link from Note {NoteId} to {LinkedItemType} {LinkedItemId}", noteId, request.LinkedItemType, request.LinkedItemId);
            }

            await _context.SaveChangesAsync();
            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.LINK.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                $"Linked note '{note.Title}' to {request.LinkedItemType} '{targetTitle}'"
            );

            var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(userId, "createlink");
            var unlockedAchievements = await _achievementService.CheckAndUnlockAchievementsAsync(userId, "createlink");

            var updatedNote = await _context.Notes
                .Include(n => n.NoteLinks.Where(link => !link.IsDeleted))
                .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);

            if (updatedNote == null)
            {
                 return NotFound(new { error = "Note not found after update." });
            }
            
            var updatedNoteLinks = updatedNote.NoteLinks ?? new List<NoteLink>();
            var currentLinkedItemIds = updatedNoteLinks
                .Select(link => link.LinkedItemId)
                .Distinct()
                .ToList();

            var currentLinkedNotes = await _context.Notes
                .Where(n => currentLinkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                .Select(n => new { n.Id, n.Title, Type = "Note" })
                .ToListAsync();
            var currentLinkedIdeas = await _context.Ideas
                .Where(i => currentLinkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                .Select(i => new { i.Id, i.Title, Type = "Idea" })
                .ToListAsync();
            var currentLinkedTasks = await _context.Tasks
                .Where(t => currentLinkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                .Select(t => new { t.Id, t.Title, Type = "Task" })
                .ToListAsync();
            var currentLinkedReminders = await _context.Reminders
                .Where(r => currentLinkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                .ToListAsync();

            var currentLinkedItemsLookup = currentLinkedNotes
                .Cast<dynamic>()
                .Concat(currentLinkedIdeas)
                .Concat(currentLinkedTasks)
                .Concat(currentLinkedReminders)
                .ToDictionary(item => (string)item.Id, item => new { Type = (string)item.Type, Title = (string)item.Title });

            var linkedItemsForResponse = updatedNoteLinks
                .Select(link => {
                    if (currentLinkedItemsLookup.TryGetValue(link.LinkedItemId, out var itemDetails))
                    {
                        return new LinkedItemResponse
                        {
                            Id = link.LinkedItemId,
                            Type = itemDetails.Type,
                            Title = itemDetails.Title,
                            LinkType = link.LinkType 
                        };
                    }
                    return null;
                })
                .Where(x => x != null)
                .Select(x => x!)
                .ToList();
            
            var response = NoteResponse.FromEntity(updatedNote, linkedItemsForResponse, XPValues.CreateLink, newXP, leveledUp, newLevel, unlockedAchievements ?? new List<UnlockedAchievement>());

            return Ok(response);
        }

        [HttpDelete("{noteId}/links/{linkedItemType}/{linkedItemId}")]
        public async Task<ActionResult<NoteResponse>> RemoveLink(string noteId, string linkedItemType, string linkedItemId)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .Include(n => n.NoteLinks)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted && !n.IsArchived);

            if (note == null)
            {
                return NotFound(new { error = "Source note not found or is deleted/archived." });
            }

            var linkToRemove = await _context.NoteLinks.FirstOrDefaultAsync(nl =>
                nl.NoteId == noteId &&
                nl.LinkedItemId == linkedItemId &&
                nl.LinkedItemType == linkedItemType &&
                !nl.IsDeleted);

            if (linkToRemove == null)
            {
                return NotFound(new { error = "Link not found." });
            }

            linkToRemove.IsDeleted = true;
            linkToRemove.DeletedAt = DateTime.UtcNow;
            _logger.LogInformation("Soft deleted link from Note {NoteId} to {LinkedItemType} {LinkedItemId}", noteId, linkedItemType, linkedItemId);
            
            string targetTitle = "Unknown Item";
            string linkedItemTypeNormalized = linkedItemType.ToLower();
             switch (linkedItemTypeNormalized)
            {
                case "note":
                    var linkedNote = await _context.Notes.FirstOrDefaultAsync(n => n.Id == linkedItemId);
                    if (linkedNote != null) targetTitle = linkedNote.Title;
                    break;
                case "idea":
                    var linkedIdea = await _context.Ideas.FirstOrDefaultAsync(i => i.Id == linkedItemId);
                    if (linkedIdea != null) targetTitle = linkedIdea.Title;
                    break;
                case "task":
                    var linkedTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == linkedItemId);
                     if (linkedTask != null) targetTitle = linkedTask.Title;
                    break;
                case "reminder":
                    var linkedReminder = await _context.Reminders.FirstOrDefaultAsync(r => r.Id == linkedItemId);
                    if (linkedReminder != null) targetTitle = linkedReminder.Title;
                    break;
            }

            await _context.SaveChangesAsync();
            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.UNLINK.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                $"Unlinked note '{note.Title}' from {linkedItemType} '{targetTitle}'"
            );

            // Fetch the main note entity for the response. Using AsNoTracking to ensure we get DB state if needed,
            // though for the note's own properties, it might not be strictly necessary if no other changes were made.
            var noteEntityForResponse = await _context.Notes
                                             .AsNoTracking() 
                                             .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted);

            if (noteEntityForResponse == null)
            {
                _logger.LogError("[NotesController] RemoveLink: Note {NoteId} not found after attempting to remove link for response generation.", noteId);
                // It's unlikely the note itself would disappear, but good to check.
                // If the original 'note' variable is still in scope and valid, we could potentially use it.
                // However, to ensure consistency with potential (though not current) updates to the note itself, re-fetching is safer.
                // For now, let's assume 'note' (the initially fetched one) is sufficient if noteEntityForResponse is null,
                // or handle as a more critical error if the note is truly gone.
                // Reverting to use the initially fetched 'note' if 'noteEntityForResponse' is null,
                // as the primary goal is to fix the linked items.
                // For now, let's assume 'note' (the initially fetched one) is sufficient if noteEntityForResponse is null,
                // or handle as a more critical error if the note is truly gone.
                noteEntityForResponse = note; 
                if (noteEntityForResponse == null) // Double check if initial note was somehow also null (should not happen if NotFound wasn't hit earlier)
                {
                     _logger.LogError("[NotesController] RemoveLink: Critical error - Original note instance for {NoteId} is also null.", noteId);
                     return StatusCode(500, new { error = "Critical error retrieving note for response after link removal." });
                }
            }
            
            var freshlyQueriedNoteLinks = await _context.NoteLinks
                .Where(nl => nl.NoteId == noteId && !nl.IsDeleted) // Key filter: !nl.IsDeleted
                .ToListAsync();

            List<LinkedItemResponse> finalLinkedItemsForResponse;

            if (freshlyQueriedNoteLinks.Any())
            {
                var currentLinkedItemIds = freshlyQueriedNoteLinks
                    .Select(link => link.LinkedItemId)
                    .Distinct()
                    .ToList();
            
                var currentLinkedNotes = await _context.Notes
                    .Where(n => currentLinkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                    .Select(n => new { n.Id, n.Title, Type = "Note" })
                    .ToListAsync();
                var currentLinkedIdeas = await _context.Ideas
                    .Where(i => currentLinkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                    .Select(i => new { i.Id, i.Title, Type = "Idea" })
                    .ToListAsync();
                 var currentLinkedTasks = await _context.Tasks
                    .Where(t => currentLinkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                    .Select(t => new { t.Id, t.Title, Type = "Task" })
                    .ToListAsync();
                var currentLinkedReminders = await _context.Reminders
                    .Where(r => currentLinkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                    .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                    .ToListAsync();

                var currentLinkedItemsLookup = currentLinkedNotes
                    .Cast<dynamic>()
                    .Concat(currentLinkedIdeas)
                    .Concat(currentLinkedTasks)
                    .Concat(currentLinkedReminders)
                    .ToDictionary(item => (string)item.Id, item => new { Type = (string)item.Type, Title = (string)item.Title });

                finalLinkedItemsForResponse = freshlyQueriedNoteLinks
                    .Select(link => {
                        if (currentLinkedItemsLookup.TryGetValue(link.LinkedItemId, out var itemDetails))
                        {
                            // Ensure the LinkedItemType from the link record is used if it's more reliable,
                            // though itemDetails.Type should ideally match.
                            return new LinkedItemResponse
                            {
                                Id = link.LinkedItemId,
                                Type = link.LinkedItemType, // Prefer link's type for accuracy
                                Title = itemDetails.Title,
                                LinkType = link.LinkType
                            };
                        }
                        _logger.LogWarning("[NotesController] RemoveLink: Details for linked item {LinkedItemId} (Type: {LinkedItemType}) for Note {NoteId} not found in lookup during response generation.", link.LinkedItemId, link.LinkedItemType, noteId);
                        return null;
                    })
                    .Where(x => x != null)
                    .Select(x => x!)
                    .ToList();
            }
            else
            {
                finalLinkedItemsForResponse = new List<LinkedItemResponse>();
            }
            
            var response = NoteResponse.FromEntity(noteEntityForResponse, finalLinkedItemsForResponse);

            return Ok(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(string id)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }
            
            if (note.IsDeleted)
            {
                return BadRequest(new { error = "Note is already deleted." });
            }

            note.IsDeleted = true;
            note.DeletedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.DELETE.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                $"Moved note '{note.Title}' to trash"
            );

            return Ok(new { message = "Note moved to trash successfully." });
        }

        [HttpGet("deleted")]
        public async Task<ActionResult<IEnumerable<NoteResponse>>> GetDeletedNotes()
        {
            var userId = GetUserId();
            var notes = await _context.Notes
                .IgnoreQueryFilters()
                .Include(n => n.NoteLinks.Where(link => !link.IsDeleted))
                .Where(n => n.UserId == userId && n.IsDeleted)
                .ToListAsync();
            
            var responses = notes.Select(note => {
                 var noteLinks = note.NoteLinks ?? new List<NoteLink>();
                 var linkedItems = noteLinks.Select(link => new LinkedItemResponse {
                     Id = link.LinkedItemId,
                     Type = link.LinkedItemType,
                     Title = "Linked Item (details not loaded for deleted notes)",
                     LinkType = link.LinkType
                 }).ToList();
                 return NoteResponse.FromEntity(note, linkedItems);
            }).ToList();
            
            return Ok(responses);
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreNote(string id)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.IsDeleted);

            if (note == null)
            {
                return NotFound(new { error = "Deleted note not found." });
            }

            note.IsDeleted = false;
            note.DeletedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.RESTORE.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                $"Restored note '{note.Title}' from trash"
            );
            
            var restoredNoteWithLinks = await GetNoteByIdInternal(id, userId);
            if (restoredNoteWithLinks == null)
            {
                return NotFound(new { error = "Restored note could not be retrieved." });
            }
            return Ok(restoredNoteWithLinks);
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteNotePermanently(string id)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .IgnoreQueryFilters()
                .Include(n => n.NoteLinks)
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
                    if (note.NoteLinks != null && note.NoteLinks.Any())
                    {
                        _context.NoteLinks.RemoveRange(note.NoteLinks);
                    }
                    
                    _context.Notes.Remove(note);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    await _activityLogger.LogActivityAsync(
                        userId,
                        ActivityActionType.PERMANENT_DELETE.ToString(),
                        ActivityItemType.NOTE.ToString(),
                        id, 
                        note.Title, 
                        $"Permanently deleted note '{note.Title}'"
                    );
                    return Ok(new { message = "Note permanently deleted successfully." });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to permanently delete note {NoteId} during transaction.", id);
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
            var userId = GetUserId();
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && !n.IsDeleted);

            if (note == null)
            {
                return NotFound(new { error = NOTE_NOT_FOUND_ERROR });
            }

            bool wasArchived = note.IsArchived;
            string oldTitle = note.Title;

            if (request.Title != null) note.Title = request.Title;
            if (request.Content != null) note.Content = request.Content;
            if (request.Tags != null) note.Tags = string.Join(",", request.Tags);
            else if (request.Tags == null) note.Tags = null;
            
            if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
            if (request.IsFavorite.HasValue) note.IsFavorite = request.IsFavorite.Value;
            
            if (request.IsArchived.HasValue) 
            {
                note.IsArchived = request.IsArchived.Value;
                note.ArchivedAt = request.IsArchived.Value ? DateTime.UtcNow : null;
            }

            note.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            string description = $"Updated note '{oldTitle}'";
            if (oldTitle != note.Title) description += $" Title changed to '{note.Title}'.";
            if (request.IsArchived.HasValue && request.IsArchived.Value && !wasArchived) description += " Note archived.";
            if (request.IsArchived.HasValue && !request.IsArchived.Value && wasArchived) description += " Note unarchived.";

            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.UPDATE.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                description
            );

            if (request.IsArchived.HasValue && request.IsArchived.Value && !wasArchived)
            {
                await _xpService.AwardXPAsync(userId, "archivenote", null, note.Id, note.Title);
            }
            
            var updatedNoteWithLinks = await GetNoteByIdInternal(id, userId);
             if (updatedNoteWithLinks == null)
            {
                return NotFound(new { error = "Updated note could not be retrieved with links." });
            }
            return Ok(updatedNoteWithLinks);
        }

        [HttpGet("archived")]
        public async Task<ActionResult<IEnumerable<NoteResponse>>> GetArchivedNotes()
        {
            var userId = GetUserId();
            _logger.LogInformation("Fetching archived notes for user: {UserId}", userId);

            var archivedNotes = await _context.Notes
                .Where(n => n.UserId == userId && n.IsArchived && !n.IsDeleted)
                .ToListAsync();
            
            _logger.LogInformation("Retrieved {Count} archived notes", archivedNotes.Count);

            var noteIds = archivedNotes.Select(n => n.Id).ToList();

            var allLinksForArchivedNotes = await _context.NoteLinks
                .Where(link => noteIds.Contains(link.NoteId) && !link.IsDeleted)
                .ToListAsync();

            var allLinkedItemIds = allLinksForArchivedNotes
                .Select(link => link.LinkedItemId)
                .Distinct()
                .ToList();

            var linkedNotesFromDb = await _context.Notes
                .Where(n => allLinkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                .Select(n => new { n.Id, n.Title, Type = "Note" })
                .ToListAsync();
            var linkedIdeasFromDb = await _context.Ideas
                .Where(i => allLinkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                .Select(i => new { i.Id, i.Title, Type = "Idea" })
                .ToListAsync();
             var linkedTasksFromDb = await _context.Tasks
                .Where(t => allLinkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                .Select(t => new { t.Id, t.Title, Type = "Task" })
                .ToListAsync();
            var linkedRemindersFromDb = await _context.Reminders
                .Where(r => allLinkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                .ToListAsync();

            var globalLinkedItemsLookup = linkedNotesFromDb
                .Cast<dynamic>()
                .Concat(linkedIdeasFromDb)
                .Concat(linkedTasksFromDb)
                .Concat(linkedRemindersFromDb)
                .ToDictionary(item => (string)item.Id, item => new { Type = (string)item.Type, Title = (string)item.Title });

            var responses = archivedNotes.Select(note =>
            {
                 var noteSpecificLinks = allLinksForArchivedNotes.Where(l => l.NoteId == note.Id).ToList();
                 var linkedItems = noteSpecificLinks
                    .Select(link => {
                        if (globalLinkedItemsLookup.TryGetValue(link.LinkedItemId, out var itemDetails)) {
                             return new DTOs.Ideas.LinkedItemResponse // Using Ideas.LinkedItemResponse for consistency
                            {
                                Id = link.LinkedItemId,
                                Type = itemDetails.Type, // Or link.LinkedItemType
                                Title = itemDetails.Title,
                                LinkType = link.LinkType
                            };
                        }
                        _logger.LogWarning("Could not find details for linked item {LinkedItemId} of type {LinkedItemType} for archived note {NoteId}", link.LinkedItemId, link.LinkedItemType, note.Id);
                        return null;
                    })
                    .Where(x => x != null)
                    .Select(x => x!)
                    .ToList();
                return NoteResponse.FromEntity(note, linkedItems);
            }).ToList();

            return Ok(responses);
        }

        [HttpPost("{id}/unarchive")]
        public async Task<IActionResult> UnarchiveNote(string id)
        {
            var userId = GetUserId();
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.IsArchived && !n.IsDeleted);

            if (note == null)
            {
                return NotFound(new { error = "Archived note not found." });
            }

            note.IsArchived = false;
            note.ArchivedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _activityLogger.LogActivityAsync(
                userId,
                ActivityActionType.UNARCHIVE.ToString(),
                ActivityItemType.NOTE.ToString(),
                note.Id,
                note.Title,
                $"Unarchived note '{note.Title}'"
            );
            
            var unarchivedNoteWithLinks = await GetNoteByIdInternal(id, userId);
             if (unarchivedNoteWithLinks == null)
            {
                return NotFound(new { error = "Unarchived note could not be retrieved with links." });
            }
            return Ok(unarchivedNoteWithLinks);
        }

        private async Task<NoteResponse?> GetNoteByIdInternal(string noteId, string userId)
        {
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted);

            if (note == null)
            {
                return null;
            }
            
            var noteSpecificLinks = await _context.NoteLinks
                .Where(link => link.NoteId == noteId && !link.IsDeleted)
                .ToListAsync();

            var linkedItemIds = noteSpecificLinks
                .Select(link => link.LinkedItemId)
                .Distinct()
                .ToList();

            var linkedNotesFromDb = await _context.Notes
                .Where(n => linkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                .Select(n => new { n.Id, n.Title, Type = "Note" })
                .ToListAsync();
            
            var linkedIdeasFromDb = await _context.Ideas
                .Where(i => linkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                .Select(i => new { i.Id, i.Title, Type = "Idea" })
                .ToListAsync();
            
            var linkedTasksFromDb = await _context.Tasks
                .Where(t => linkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                .Select(t => new { t.Id, t.Title, Type = "Task" })
                .ToListAsync();

            var linkedRemindersFromDb = await _context.Reminders
                .Where(r => linkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                .ToListAsync();

            var linkedItemsLookup = linkedNotesFromDb
                .Cast<dynamic>()
                .Concat(linkedIdeasFromDb)
                .Concat(linkedTasksFromDb)
                .Concat(linkedRemindersFromDb)
                .ToDictionary(item => (string)item.Id, item => new { Type = (string)item.Type, Title = (string)item.Title });

            var linkedItemsForResponse = noteSpecificLinks
                .Select(link => {
                    if (linkedItemsLookup.TryGetValue(link.LinkedItemId, out var itemDetails)) {
                         return new DTOs.Ideas.LinkedItemResponse // Using Ideas.LinkedItemResponse for consistency
                        {
                            Id = link.LinkedItemId,
                            Type = itemDetails.Type, // Or link.LinkedItemType
                            Title = itemDetails.Title,
                            LinkType = link.LinkType
                        };
                    }
                    _logger.LogWarning("Linked item with ID {LinkedItemId} for note {NoteId} not found in lookup table.", link.LinkedItemId, noteId);
                    return null; 
                })
                .Where(x => x != null)
                .Select(x => x!)
                .ToList();
            
            return NoteResponse.FromEntity(note, linkedItemsForResponse);
        }
    }
}
