using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// Thread-safe repository implementation for parallel note operations.
/// Creates a new DbContext instance for each operation using IDbContextFactory,
/// ensuring safe concurrent database access during parallel tool execution.
/// </summary>
public class ParallelNoteRepository : IParallelNoteRepository
{
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
    private readonly ILogger<ParallelNoteRepository> _logger;

    public ParallelNoteRepository(
        IDbContextFactory<ApplicationDbContext> contextFactory,
        ILogger<ParallelNoteRepository> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
    }

    public async Task<IEnumerable<Note>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("ParallelRepo: Retrieving notes for user. UserId: {UserId}", userId);

            // Create isolated DbContext for this operation
            await using var context = await _contextFactory.CreateDbContextAsync();

            var notes = await context.Notes
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.UpdatedAt)
                .ToListAsync();

            _logger.LogDebug("ParallelRepo: Retrieved notes. UserId: {UserId}, Count: {Count}", userId, notes.Count);
            return notes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error retrieving notes by userId. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve notes for user '{userId}'", ex);
        }
    }

    public async Task<Note?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("ParallelRepo: Retrieving note by ID. NoteId: {NoteId}", id);

            await using var context = await _contextFactory.CreateDbContextAsync();

            var note = await context.Notes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("ParallelRepo: Note not found. NoteId: {NoteId}", id);
                return null;
            }

            _logger.LogDebug("ParallelRepo: Note retrieved successfully. NoteId: {NoteId}", id);
            return note;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error retrieving note by ID. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to retrieve note with ID '{id}'", ex);
        }
    }

    public async Task<Note> CreateAsync(Note note)
    {
        _logger.LogDebug("ParallelRepo: Creating new note. NoteTitle: {NoteTitle}, UserId: {UserId}", note.Title, note.UserId);

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

        try
        {
            await using var context = await _contextFactory.CreateDbContextAsync();

            note.CreatedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            context.Notes.Add(note);
            await context.SaveChangesAsync();

            _logger.LogInformation("ParallelRepo: Note created successfully. NoteId: {NoteId}, UserId: {UserId}", note.Id, note.UserId);
            return note;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error creating note. NoteTitle: {NoteTitle}", note.Title);
            throw new RepositoryException("Failed to create note", ex);
        }
    }

    public async Task<Note?> UpdateAsync(string id, Note note)
    {
        try
        {
            _logger.LogDebug("ParallelRepo: Updating note. NoteId: {NoteId}", id);

            await using var context = await _contextFactory.CreateDbContextAsync();

            var existingNote = await context.Notes.FirstOrDefaultAsync(n => n.Id == id);
            if (existingNote == null)
            {
                _logger.LogDebug("ParallelRepo: Note not found for update. NoteId: {NoteId}", id);
                return null;
            }

            // Update fields
            existingNote.Title = note.Title;
            existingNote.Content = note.Content;
            existingNote.Tags = note.Tags;
            existingNote.IsArchived = note.IsArchived;
            existingNote.Folder = note.Folder;
            existingNote.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            _logger.LogInformation("ParallelRepo: Note updated successfully. NoteId: {NoteId}", id);
            return existingNote;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error updating note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to update note with ID '{id}'", ex);
        }
    }

    public async Task<bool> SoftDeleteAsync(string id, string deletedBy)
    {
        try
        {
            _logger.LogDebug("ParallelRepo: Soft deleting note. NoteId: {NoteId}, DeletedBy: {DeletedBy}", id, deletedBy);

            await using var context = await _contextFactory.CreateDbContextAsync();

            var note = await context.Notes.FirstOrDefaultAsync(n => n.Id == id);
            if (note == null)
            {
                _logger.LogDebug("ParallelRepo: Note not found for soft delete. NoteId: {NoteId}", id);
                return false;
            }

            note.IsDeleted = true;
            note.DeletedAt = DateTime.UtcNow;
            note.DeletedBy = deletedBy;
            note.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            _logger.LogInformation("ParallelRepo: Note soft deleted successfully. NoteId: {NoteId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error soft deleting note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to soft delete note with ID '{id}'", ex);
        }
    }

    public async Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        try
        {
            var idList = ids.ToList();
            _logger.LogDebug("ParallelRepo: Soft deleting multiple notes. Count: {Count}, UserId: {UserId}", idList.Count, userId);

            await using var context = await _contextFactory.CreateDbContextAsync();

            var notes = await context.Notes
                .Where(n => idList.Contains(n.Id) && n.UserId == userId && !n.IsDeleted)
                .ToListAsync();

            foreach (var note in notes)
            {
                note.IsDeleted = true;
                note.DeletedAt = DateTime.UtcNow;
                note.DeletedBy = userId;
                note.UpdatedAt = DateTime.UtcNow;
            }

            await context.SaveChangesAsync();

            _logger.LogInformation("ParallelRepo: Soft deleted {Count} notes. UserId: {UserId}", notes.Count, userId);
            return notes.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error soft deleting multiple notes. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to soft delete notes", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("ParallelRepo: Permanently deleting note. NoteId: {NoteId}", id);

            await using var context = await _contextFactory.CreateDbContextAsync();

            var note = await context.Notes
                .IgnoreQueryFilters() // Include soft-deleted notes
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                _logger.LogDebug("ParallelRepo: Note not found for permanent delete. NoteId: {NoteId}", id);
                return false;
            }

            context.Notes.Remove(note);
            await context.SaveChangesAsync();

            _logger.LogInformation("ParallelRepo: Note permanently deleted. NoteId: {NoteId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ParallelRepo: Error permanently deleting note. NoteId: {NoteId}", id);
            throw new RepositoryException($"Failed to delete note with ID '{id}'", ex);
        }
    }
}
