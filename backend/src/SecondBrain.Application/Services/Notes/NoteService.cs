using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service for handling note operations with business logic
/// </summary>
public class NoteService : INoteService
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<NoteService> _logger;

    public NoteService(INoteRepository noteRepository, ILogger<NoteService> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<NoteResponse>> GetAllNotesAsync(string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving all notes for user. UserId: {UserId}", userId);

        var notes = await _noteRepository.GetByUserIdAsync(userId);
        return notes.Select(n => n.ToResponse());
    }

    public async Task<NoteResponse?> GetNoteByIdAsync(string noteId, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Retrieving note. NoteId: {NoteId}, UserId: {UserId}", noteId, userId);

        var note = await _noteRepository.GetByIdAsync(noteId);

        if (note == null)
        {
            return null;
        }

        // Verify ownership
        if (note.UserId != userId)
        {
            _logger.LogWarning("User attempted to access note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                userId, noteId, note.UserId);
            throw new UnauthorizedException("Access denied to this note");
        }

        return note.ToResponse();
    }

    public async Task<NoteResponse> CreateNoteAsync(CreateNoteRequest request, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Creating note for user. UserId: {UserId}, Title: {Title}", userId, request.Title);

        var note = request.ToEntity(userId);
        var createdNote = await _noteRepository.CreateAsync(note);

        _logger.LogInformation("Note created successfully. NoteId: {NoteId}, UserId: {UserId}", createdNote.Id, userId);
        return createdNote.ToResponse();
    }

    public async Task<NoteResponse?> UpdateNoteAsync(string noteId, UpdateNoteRequest request, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Updating note. NoteId: {NoteId}, UserId: {UserId}", noteId, userId);

        var existingNote = await _noteRepository.GetByIdAsync(noteId);

        if (existingNote == null)
        {
            return null;
        }

        // Verify ownership
        if (existingNote.UserId != userId)
        {
            _logger.LogWarning("User attempted to update note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                userId, noteId, existingNote.UserId);
            throw new UnauthorizedException("Access denied to this note");
        }

        existingNote.UpdateFrom(request);
        var updatedNote = await _noteRepository.UpdateAsync(noteId, existingNote);

        if (updatedNote == null)
        {
            return null;
        }

        _logger.LogInformation("Note updated successfully. NoteId: {NoteId}", noteId);
        return updatedNote.ToResponse();
    }

    public async Task<bool> DeleteNoteAsync(string noteId, string userId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Deleting note. NoteId: {NoteId}, UserId: {UserId}", noteId, userId);

        var existingNote = await _noteRepository.GetByIdAsync(noteId);

        if (existingNote == null)
        {
            return false;
        }

        // Verify ownership
        if (existingNote.UserId != userId)
        {
            _logger.LogWarning("User attempted to delete note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                userId, noteId, existingNote.UserId);
            throw new UnauthorizedException("Access denied to this note");
        }

        var deleted = await _noteRepository.DeleteAsync(noteId);

        if (deleted)
        {
            _logger.LogInformation("Note deleted successfully. NoteId: {NoteId}", noteId);
        }

        return deleted;
    }

    public async Task<int> BulkDeleteNotesAsync(IEnumerable<string> noteIds, string userId, CancellationToken cancellationToken = default)
    {
        var idList = noteIds.ToList();
        _logger.LogDebug("Bulk deleting notes. Count: {Count}, UserId: {UserId}", idList.Count, userId);

        if (idList.Count == 0)
        {
            return 0;
        }

        // The repository handles ownership verification by filtering on userId
        var deletedCount = await _noteRepository.DeleteManyAsync(idList, userId);

        _logger.LogInformation("Bulk deleted {DeletedCount} notes for user {UserId}", deletedCount, userId);

        return deletedCount;
    }

    public async Task<bool> IsNoteOwnedByUserAsync(string noteId, string userId, CancellationToken cancellationToken = default)
    {
        var note = await _noteRepository.GetByIdAsync(noteId);
        return note != null && note.UserId == userId;
    }
}

