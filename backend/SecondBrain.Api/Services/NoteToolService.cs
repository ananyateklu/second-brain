using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Data;
using SecondBrain.Api.DTOs.Ollama;
using SecondBrain.Data.Entities;
using SecondBrain.Api.Services;
using SecondBrain.Api.Enums;
using SecondBrain.Api.Gamification;

namespace SecondBrain.Api.Services
{
    public class NoteToolService : INoteToolService
    {
        private readonly DataContext _context;
        private readonly ILogger<NoteToolService> _logger;
        private readonly IActivityLogger _activityLogger;
        private readonly IXPService _xpService;
        private const int MAX_LINKS = 20;

        public NoteToolService(
            DataContext context, 
            ILogger<NoteToolService> logger,
            IActivityLogger activityLogger,
            IXPService xpService)
        {
            _context = context;
            _logger = logger;
            _activityLogger = activityLogger;
            _xpService = xpService;
        }

        public async Task<NoteToolResponse> CreateNoteAsync(NoteToolRequest request)
        {
            try
            {
                var note = new Note
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = request.Title,
                    Content = request.Content,
                    IsPinned = request.IsPinned,
                    IsFavorite = request.IsFavorite,
                    IsArchived = request.IsArchived,
                    // IsIdea property removed - ideas are now separate entities
                    Tags = request.Tags ?? string.Empty,
                    UserId = request.UserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Notes.Add(note);
                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    request.UserId,
                    "CREATE",
                    "NOTE",
                    note.Id,
                    note.Title,
                    $"Created new note: {note.Title}",
                    new { Tags = note.Tags, IsPinned = note.IsPinned }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = "Successfully created note",
                    Data = note
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating note through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to create note: " + ex.Message
                };
            }
        }

        public async Task<NoteToolResponse> SearchNotesAsync(NoteToolSearchCriteria criteria)
        {
            try
            {
                var query = _context.Notes
                    .Where(n => n.UserId == criteria.UserId && !n.IsDeleted);

                if (!string.IsNullOrEmpty(criteria.Tags))
                {
                    var tags = criteria.Tags.Split(',').Select(t => t.Trim());
                    query = query.Where(n => n.Tags != null && tags.All(tag => n.Tags.Contains(tag, StringComparison.OrdinalIgnoreCase)));
                }

                if (criteria.IsPinned.HasValue)
                    query = query.Where(n => n.IsPinned == criteria.IsPinned.Value);

                if (criteria.IsFavorite.HasValue)
                    query = query.Where(n => n.IsFavorite == criteria.IsFavorite.Value);

                if (criteria.IsArchived.HasValue)
                    query = query.Where(n => n.IsArchived == criteria.IsArchived.Value);

                if (!string.IsNullOrEmpty(criteria.Query))
                {
                    query = query.Where(n => 
                        (n.Title != null && n.Title.Contains(criteria.Query, StringComparison.OrdinalIgnoreCase)) || 
                        (n.Content != null && n.Content.Contains(criteria.Query, StringComparison.OrdinalIgnoreCase)));
                }

                var notes = await query.ToListAsync();

                return new NoteToolResponse
                {
                    Success = true,
                    Message = $"Found {notes.Count} notes",
                    Data = notes
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching notes through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to search notes: " + ex.Message
                };
            }
        }

        public async Task<NoteToolResponse> LinkNotesAsync(string sourceId, string[] targetIds, string userId)
        {
            var sourceNote = await _context.Notes.FindAsync(sourceId);
            if (sourceNote == null || sourceNote.UserId != userId)
            {
                return new NoteToolResponse { Success = false, Message = "Source note not found or access denied." };
            }

            if (targetIds == null || !targetIds.Any())
            {
                return new NoteToolResponse { Success = false, Message = "No target notes specified for linking." };
            }

            var linkedNotesCount = 0;
            var alreadyLinkedCount = 0;
            var notFoundCount = 0;
            var linksAdded = new List<object>();

            foreach (var targetId in targetIds.Distinct().Take(MAX_LINKS)) // Limit the number of links to process
            {
                if (sourceId == targetId) continue; // Cannot link a note to itself

                var targetNote = await _context.Notes.FindAsync(targetId);
                if (targetNote == null || targetNote.UserId != userId)
                {
                    notFoundCount++;
                    continue;
                }

                var existingLink = await _context.NoteLinks
                    .FirstOrDefaultAsync(nl => nl.NoteId == sourceId && nl.LinkedItemId == targetId && nl.LinkedItemType == "Note" && !nl.IsDeleted);
                
                if (existingLink != null)
                {
                    alreadyLinkedCount++;
                    continue;
                }

                // Check for soft-deleted link to reactivate
                var softDeletedLink = await _context.NoteLinks
                    .FirstOrDefaultAsync(nl => nl.NoteId == sourceId && nl.LinkedItemId == targetId && nl.LinkedItemType == "Note" && nl.IsDeleted);

                if (softDeletedLink != null)
                {
                    softDeletedLink.IsDeleted = false;
                    softDeletedLink.CreatedAt = DateTime.UtcNow; // Optionally update CreatedAt upon reactivation
                    softDeletedLink.CreatedBy = userId;
                }
                else
                {
                    var newLink = new NoteLink
                    {
                        NoteId = sourceId,
                        LinkedItemId = targetId,
                        LinkedItemType = "Note", // Explicitly setting type for Note-to-Note link
                        CreatedBy = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.NoteLinks.Add(newLink);
                }
                linkedNotesCount++;
                linksAdded.Add(new { sourceId = sourceId, targetId = targetId, type = "Note" });

                // Consider bidirectional linking based on requirements
                // For now, creating only one-way link as per IdeaLinks behavior
            }

            if (linkedNotesCount > 0)
            {
                await _context.SaveChangesAsync();
                await _activityLogger.LogActivityAsync(userId, ActivityActionType.LINK.ToString(), ActivityItemType.NOTE.ToString(), sourceId, sourceNote.Title, $"Linked note '{sourceNote.Title}' to {linkedNotesCount} other note(s).");
                var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(userId, "createlink", linkedNotesCount);
                // Check for achievements related to linking notes
            }

            string message = $"Processed {targetIds.Length} link requests. Added {linkedNotesCount} new links.";
            if (alreadyLinkedCount > 0) message += $" {alreadyLinkedCount} were already linked.";
            if (notFoundCount > 0) message += $" {notFoundCount} target notes not found or access denied.";

            return new NoteToolResponse
            {
                Success = true,
                Message = message,
                Data = new { linksAdded }
            };
        }

        public async Task<NoteToolResponse> UpdateNoteAsync(string noteId, NoteToolRequest request)
        {
            try
            {
                var note = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == request.UserId && !n.IsDeleted);

                if (note == null)
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = "Note not found or access denied"
                    };
                }

                // Track changes for activity log
                var changes = new Dictionary<string, (object Old, object New)>();

                if (request.Title != note.Title)
                {
                    changes["Title"] = (note.Title, request.Title);
                    note.Title = request.Title;
                }

                if (request.Content != note.Content)
                {
                    changes["Content"] = (note.Content, request.Content);
                    note.Content = request.Content;
                }

                if (request.IsPinned != note.IsPinned)
                {
                    changes["IsPinned"] = (note.IsPinned, request.IsPinned);
                    note.IsPinned = request.IsPinned;
                }

                if (request.IsFavorite != note.IsFavorite)
                {
                    changes["IsFavorite"] = (note.IsFavorite, request.IsFavorite);
                    note.IsFavorite = request.IsFavorite;
                }

                if (request.Tags != note.Tags)
                {
                    changes["Tags"] = ((object)(note.Tags ?? string.Empty), (object)(request.Tags ?? string.Empty));
                    note.Tags = request.Tags ?? string.Empty;
                }

                note.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Log activity with changes
                await _activityLogger.LogActivityAsync(
                    request.UserId,
                    ActivityActionType.UPDATE.ToString(),
                    ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Updated note: {note.Title}",
                    new { Changes = changes }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = "Successfully updated note",
                    Data = note
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating note through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to update note: " + ex.Message
                };
            }
        }

        public async Task<NoteToolResponse> UnlinkNotesAsync(string sourceId, string[] targetIds, string userId)
        {
            var sourceNote = await _context.Notes.FindAsync(sourceId);
            if (sourceNote == null || sourceNote.UserId != userId)
            {
                return new NoteToolResponse { Success = false, Message = "Source note not found or access denied." };
            }

            if (targetIds == null || !targetIds.Any())
            {
                return new NoteToolResponse { Success = false, Message = "No target notes specified for unlinking." };
            }

            var unlinkedCount = 0;
            var notFoundCount = 0;
            var linksRemovedDetails = new List<object>();

            foreach (var targetId in targetIds.Distinct())
            {
                var link = await _context.NoteLinks
                    .FirstOrDefaultAsync(nl => nl.NoteId == sourceId && nl.LinkedItemId == targetId && nl.LinkedItemType == "Note" && !nl.IsDeleted);

                if (link == null)
                {
                    // Also check if they are trying to unlink a link that was to a different item type by mistake (though UI should prevent this)
                    var anyLink = await _context.NoteLinks.FirstOrDefaultAsync(nl => nl.NoteId == sourceId && nl.LinkedItemId == targetId && !nl.IsDeleted);
                    if(anyLink != null && anyLink.LinkedItemType != "Note")
                    {
                         _logger.LogWarning("User {UserId} attempted to unlink note {SourceId} from {TargetId} using Note-to-Note unlink, but actual link type was {LinkType}", userId, sourceId, targetId, anyLink.LinkedItemType);
                        // Decide if this should be an error or if we should proceed if the user owns the note.
                        // For now, we treat it as not found for Note-to-Note unlinking.
                    }
                    notFoundCount++;
                    continue;
                }

                link.IsDeleted = true;
                link.DeletedAt = DateTime.UtcNow;
                unlinkedCount++;
                linksRemovedDetails.Add(new { sourceId = sourceId, targetId = targetId, type = link.LinkedItemType });

                // Consider bidirectional unlinking
            }

            if (unlinkedCount > 0)
            {
                await _context.SaveChangesAsync();
                await _activityLogger.LogActivityAsync(userId, ActivityActionType.UNLINK.ToString(), ActivityItemType.NOTE.ToString(), sourceId, sourceNote.Title, $"Unlinked note '{sourceNote.Title}' from {unlinkedCount} other note(s).");
            }

            string message = $"Processed {targetIds.Length} unlink requests. Removed {unlinkedCount} links.";
            if (notFoundCount > 0) message += $" {notFoundCount} links not found.";

            return new NoteToolResponse
            {
                Success = true,
                Message = message,
                Data = new { linksRemovedDetails }
            };
        }

        public async Task<NoteToolResponse> ArchiveNoteAsync(string noteId, string userId)
        {
            try
            {
                var note = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted);

                if (note == null)
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = "Note not found or access denied"
                    };
                }

                note.IsArchived = true;
                note.ArchivedAt = DateTime.UtcNow;
                note.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.ARCHIVE.ToString(),
                    ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Archived note: {note.Title}",
                    new { ArchivedAt = note.ArchivedAt }
                );

                // Award XP for archiving note
                await _xpService.AwardXPAsync(
                    userId,
                    "archivenote",
                    null,
                    note.Id,
                    note.Title
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = "Successfully archived note",
                    Data = note
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error archiving note through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to archive note: " + ex.Message
                };
            }
        }

        public async Task<NoteToolResponse> DeleteNoteAsync(string noteId, string userId)
        {
            try
            {
                var note = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted);

                if (note == null)
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = "Note not found or access denied"
                    };
                }

                note.IsDeleted = true;
                note.DeletedAt = DateTime.UtcNow;
                note.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.DELETE.ToString(),
                    ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Deleted note: {note.Title}",
                    new { DeletedAt = note.DeletedAt }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = "Successfully deleted note",
                    Data = note
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting note through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to delete note: " + ex.Message
                };
            }
        }

        public async Task<List<Note>> FindNotesByDescriptionAsync(string description, string userId)
        {
            try
            {
                // Split the description into keywords
                var keywords = description.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Where(k => k.Length > 3) // Ignore small words
                    .Select(k => k.ToLower());

                var notes = await _context.Notes
                    .Where(n => n.UserId == userId && !n.IsDeleted)
                    .Where(n => keywords.Any(k => 
                        n.Title.Contains(k, StringComparison.OrdinalIgnoreCase) || 
                        n.Content.Contains(k, StringComparison.OrdinalIgnoreCase)))
                    .ToListAsync();

                return notes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding notes by description");
                return new List<Note>();
            }
        }

        public async Task<Note?> GetNoteByIdAsync(string noteId, string userId)
        {
            return await _context.Notes
                .FirstOrDefaultAsync(n => 
                    n.Id == noteId && 
                    n.UserId == userId && 
                    !n.IsDeleted);
        }
    }
} 