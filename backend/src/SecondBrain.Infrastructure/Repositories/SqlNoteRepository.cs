using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        try
        {
            _logger.LogDebug("Creating new note. NoteTitle: {NoteTitle}, UserId: {UserId}", note.Title, note.UserId);

            // Validate required fields
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
                note.Id = Guid.NewGuid().ToString();
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
}

