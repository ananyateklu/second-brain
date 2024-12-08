using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Data;
using SecondBrain.Api.DTOs.Llama;
using SecondBrain.Data.Entities;
using SecondBrain.Api.Services;
using SecondBrain.Api.Enums;

namespace SecondBrain.Api.Services
{
    public class NoteToolService : INoteToolService
    {
        private readonly DataContext _context;
        private readonly ILogger<NoteToolService> _logger;
        private readonly IActivityLogger _activityLogger;
        private const int MAX_LINKS = 20;

        public NoteToolService(
            DataContext context, 
            ILogger<NoteToolService> logger,
            IActivityLogger activityLogger)
        {
            _context = context;
            _logger = logger;
            _activityLogger = activityLogger;
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
                    IsIdea = request.IsIdea,
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
                    request.IsIdea ? "IDEA" : "NOTE",
                    note.Id,
                    note.Title,
                    $"Created new {(request.IsIdea ? "idea" : "note")}: {note.Title}",
                    new { Tags = note.Tags, IsPinned = note.IsPinned }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = $"Successfully created {(request.IsIdea ? "idea" : "note")}",
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

                if (criteria.IsIdea.HasValue)
                    query = query.Where(n => n.IsIdea == criteria.IsIdea.Value);

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
            try
            {
                if (targetIds.Length > MAX_LINKS)
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = $"Cannot link more than {MAX_LINKS} notes at once"
                    };
                }

                // Verify ownership of all notes
                var allNoteIds = new[] { sourceId }.Concat(targetIds);
                var notes = await _context.Notes
                    .Where(n => allNoteIds.Contains(n.Id) && n.UserId == userId)
                    .ToListAsync();

                if (notes.Count != allNoteIds.Count())
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = "Some notes were not found or don't belong to the user"
                    };
                }

                var sourceNote = notes.First(n => n.Id == sourceId);
                var linkedNotes = new List<NoteLink>();

                foreach (var targetId in targetIds)
                {
                    var link = new NoteLink
                    {
                        NoteId = sourceId,
                        LinkedNoteId = targetId,
                        IsDeleted = false
                    };
                    linkedNotes.Add(link);
                }

                await _context.NoteLinks.AddRangeAsync(linkedNotes);
                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    "LINK",
                    "NOTE",
                    sourceId,
                    sourceNote.Title,
                    $"Linked note to {targetIds.Length} other notes",
                    new { LinkedNoteIds = targetIds }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = $"Successfully linked {targetIds.Length} notes"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking notes through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to link notes: " + ex.Message
                };
            }
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
                    note.IsIdea ? ActivityItemType.IDEA.ToString() : ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Updated {(note.IsIdea ? "idea" : "note")}: {note.Title}",
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
            try
            {
                var links = await _context.NoteLinks
                    .Where(nl => nl.NoteId == sourceId && 
                                targetIds.Contains(nl.LinkedNoteId) && 
                                !nl.IsDeleted)
                    .ToListAsync();

                // Verify ownership
                var sourceNote = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == sourceId && n.UserId == userId);

                if (sourceNote == null)
                {
                    return new NoteToolResponse
                    {
                        Success = false,
                        Message = "Source note not found or access denied"
                    };
                }

                foreach (var link in links)
                {
                    link.IsDeleted = true;
                }

                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.UNLINK.ToString(),
                    ActivityItemType.NOTELINK.ToString(),
                    sourceId,
                    sourceNote.Title,
                    $"Unlinked {links.Count} notes from {sourceNote.Title}",
                    new { UnlinkedNoteIds = targetIds }
                );

                return new NoteToolResponse
                {
                    Success = true,
                    Message = $"Successfully unlinked {links.Count} notes"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlinking notes through tool service");
                return new NoteToolResponse
                {
                    Success = false,
                    Message = "Failed to unlink notes: " + ex.Message
                };
            }
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
                    note.IsIdea ? ActivityItemType.IDEA.ToString() : ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Archived {(note.IsIdea ? "idea" : "note")}: {note.Title}",
                    new { ArchivedAt = note.ArchivedAt }
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
                    note.IsIdea ? ActivityItemType.IDEA.ToString() : ActivityItemType.NOTE.ToString(),
                    note.Id,
                    note.Title,
                    $"Deleted {(note.IsIdea ? "idea" : "note")}: {note.Title}",
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