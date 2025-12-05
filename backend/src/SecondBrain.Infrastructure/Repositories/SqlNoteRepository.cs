using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlNoteRepository : INoteRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteRepository> _logger;

    public SqlNoteRepository(ApplicationDbContext context, ILogger<SqlNoteRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Note>> GetAllAsync()
    {
        try
        {
            _logger.LogDebug("Retrieving all notes from database");
            var notes = await _context.Notes.AsNoTracking().ToListAsync();
            _logger.LogDebug("Retrieved notes. Count: {Count}", notes.Count);
            return notes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all notes from database");
            throw new RepositoryException("Failed to retrieve notes", ex);
        }
    }

    public async Task<Note?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving note by ID. NoteId: {NoteId}", id);
            var note = await _context.Notes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("Note not found. NoteId: {NoteId}", id);
                return null;
            }

            _logger.LogDebug("Note retrieved successfully. NoteId: {NoteId}", id);
            return note;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving note by ID. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to retrieve note with ID '{id}'", ex);
        }
    }

    public async Task<Note> CreateAsync(Note note)
    {
        _logger.LogDebug("Creating new note. NoteTitle: {NoteTitle}, UserId: {UserId}", note.Title, note.UserId);

        // Validate required fields (outside try-catch so validation exceptions bubble up directly)
        if (string.IsNullOrWhiteSpace(note.Content))
        {
            throw new ArgumentException("Note content cannot be null or empty", nameof(note));
        }

        if (string.IsNullOrWhiteSpace(note.Title))
        {
            throw new ArgumentException("Note title cannot be null or empty", nameof(note));
        }

        if (string.IsNullOrEmpty(note.Id))
        {
            note.Id = UuidV7.NewId();
        }

        // Only set timestamps if they haven't been explicitly provided (e.g., for imports)
        var now = DateTime.UtcNow;
        if (note.CreatedAt == default || Math.Abs((note.CreatedAt - now).TotalSeconds) < 1)
        {
            note.CreatedAt = now;
        }
        if (note.UpdatedAt == default || Math.Abs((note.UpdatedAt - now).TotalSeconds) < 1)
        {
            note.UpdatedAt = now;
        }

        try
        {
            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Note created successfully. NoteId: {NoteId}, UserId: {UserId}", note.Id, note.UserId);
            return note;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating note. NoteTitle: {NoteTitle}", note.Title);
            throw new RepositoryException("Failed to create note", ex);
        }
    }

    public async Task<Note?> UpdateAsync(string id, Note note)
    {
        try
        {
            _logger.LogDebug("Updating note. NoteId: {NoteId}", id);
            var existingNote = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);

            if (existingNote == null)
            {
                _logger.LogDebug("Note not found for update. NoteId: {NoteId}", id);
                return null;
            }

            // Update properties
            existingNote.Title = note.Title;
            existingNote.Content = note.Content;
            existingNote.Tags = note.Tags;
            existingNote.IsArchived = note.IsArchived;
            existingNote.Source = note.Source;
            existingNote.ExternalId = note.ExternalId;
            existingNote.Folder = note.Folder;

            // Only set UpdatedAt if it hasn't been explicitly provided
            var now = DateTime.UtcNow;
            if (note.UpdatedAt == default || Math.Abs((note.UpdatedAt - now).TotalSeconds) < 1)
            {
                existingNote.UpdatedAt = now;
            }
            else
            {
                existingNote.UpdatedAt = note.UpdatedAt;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Note updated successfully. NoteId: {NoteId}", id);
            return existingNote;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to update note with ID '{id}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting note. NoteId: {NoteId}", id);
            var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("Note not found for deletion. NoteId: {NoteId}", id);
                return false;
            }

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Note deleted successfully. NoteId: {NoteId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to delete note with ID '{id}'", ex);
        }
    }

    public async Task<int> DeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        try
        {
            var idList = ids.ToList();
            _logger.LogDebug("Deleting multiple notes. Count: {Count}, UserId: {UserId}", idList.Count, userId);

            // Get all notes that match the IDs and belong to the user
            var notes = await _context.Notes
                .Where(n => idList.Contains(n.Id) && n.UserId == userId)
                .ToListAsync();

            if (notes.Count == 0)
            {
                _logger.LogDebug("No notes found for bulk deletion. UserId: {UserId}", userId);
                return 0;
            }

            _context.Notes.RemoveRange(notes);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk deleted notes successfully. Count: {Count}, UserId: {UserId}", notes.Count, userId);
            return notes.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting notes. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to bulk delete notes for user '{userId}'", ex);
        }
    }

    public async Task<Note?> GetByUserIdAndExternalIdAsync(string userId, string externalId)
    {
        try
        {
            _logger.LogDebug("Retrieving note by userId and externalId. UserId: {UserId}, ExternalId: {ExternalId}", userId, externalId);
            var note = await _context.Notes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.UserId == userId && n.ExternalId == externalId);

            if (note == null)
            {
                _logger.LogDebug("Note not found. UserId: {UserId}, ExternalId: {ExternalId}", userId, externalId);
                return null;
            }

            _logger.LogDebug("Note found. NoteId: {NoteId}, UserId: {UserId}, ExternalId: {ExternalId}", note.Id, userId, externalId);
            return note;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving note by userId and externalId. UserId: {UserId}, ExternalId: {ExternalId}", userId, externalId);
            throw new RepositoryException("Failed to retrieve note by external ID", ex);
        }
    }

    public async Task<IEnumerable<Note>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving notes by userId. UserId: {UserId}", userId);
            var notes = await _context.Notes
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .ToListAsync();

            _logger.LogDebug("Retrieved notes for user. UserId: {UserId}, Count: {Count}", userId, notes.Count);
            return notes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notes by userId. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve notes for user '{userId}'", ex);
        }
    }

    // ============================================
    // Soft Delete Operations
    // ============================================

    public async Task<bool> SoftDeleteAsync(string id, string deletedBy)
    {
        try
        {
            _logger.LogDebug("Soft deleting note. NoteId: {NoteId}, DeletedBy: {DeletedBy}", id, deletedBy);
            var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("Note not found for soft deletion. NoteId: {NoteId}", id);
                return false;
            }

            note.IsDeleted = true;
            note.DeletedAt = DateTime.UtcNow;
            note.DeletedBy = deletedBy;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Note soft deleted successfully. NoteId: {NoteId}, DeletedBy: {DeletedBy}", id, deletedBy);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft deleting note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to soft delete note with ID '{id}'", ex);
        }
    }

    public async Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        try
        {
            var idList = ids.ToList();
            _logger.LogDebug("Soft deleting multiple notes. Count: {Count}, UserId: {UserId}", idList.Count, userId);

            var notes = await _context.Notes
                .Where(n => idList.Contains(n.Id) && n.UserId == userId)
                .ToListAsync();

            if (notes.Count == 0)
            {
                _logger.LogDebug("No notes found for bulk soft deletion. UserId: {UserId}", userId);
                return 0;
            }

            var now = DateTime.UtcNow;
            foreach (var note in notes)
            {
                note.IsDeleted = true;
                note.DeletedAt = now;
                note.DeletedBy = userId;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk soft deleted notes successfully. Count: {Count}, UserId: {UserId}", notes.Count, userId);
            return notes.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk soft deleting notes. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to bulk soft delete notes for user '{userId}'", ex);
        }
    }

    public async Task<bool> RestoreAsync(string id)
    {
        try
        {
            _logger.LogDebug("Restoring soft-deleted note. NoteId: {NoteId}", id);

            // Use IgnoreQueryFilters to find soft-deleted notes
            var note = await _context.Notes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(n => n.Id == id && n.IsDeleted);

            if (note == null)
            {
                _logger.LogDebug("Soft-deleted note not found for restoration. NoteId: {NoteId}", id);
                return false;
            }

            note.IsDeleted = false;
            note.DeletedAt = null;
            note.DeletedBy = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Note restored successfully. NoteId: {NoteId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to restore note with ID '{id}'", ex);
        }
    }

    public async Task<bool> HardDeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Hard deleting note. NoteId: {NoteId}", id);

            // Use IgnoreQueryFilters to find all notes including soft-deleted
            var note = await _context.Notes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("Note not found for hard deletion. NoteId: {NoteId}", id);
                return false;
            }

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Note hard deleted successfully. NoteId: {NoteId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard deleting note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to hard delete note with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<Note>> GetDeletedByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving soft-deleted notes by userId. UserId: {UserId}", userId);

            var notes = await _context.Notes
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(n => n.UserId == userId && n.IsDeleted)
                .OrderByDescending(n => n.DeletedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved soft-deleted notes for user. UserId: {UserId}, Count: {Count}", userId, notes.Count);
            return notes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving soft-deleted notes by userId. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve soft-deleted notes for user '{userId}'", ex);
        }
    }
}
