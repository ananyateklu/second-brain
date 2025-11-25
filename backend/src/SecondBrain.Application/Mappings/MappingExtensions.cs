using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Mappings;

/// <summary>
/// Extension methods for mapping between entities and DTOs
/// </summary>
public static class MappingExtensions
{
    /// <summary>
    /// Maps a Note entity to a NoteResponse DTO
    /// </summary>
    public static NoteResponse ToResponse(this Note note)
    {
        return new NoteResponse
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            Tags = note.Tags,
            IsArchived = note.IsArchived,
            UserId = note.UserId,
            Source = note.Source,
            ExternalId = note.ExternalId,
            Folder = note.Folder
        };
    }

    /// <summary>
    /// Maps a CreateNoteRequest to a Note entity
    /// </summary>
    public static Note ToEntity(this CreateNoteRequest request, string userId)
    {
        return new Note
        {
            Id = Guid.NewGuid().ToString(),
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UserId = userId,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Updates an existing Note entity with data from UpdateNoteRequest
    /// </summary>
    public static void UpdateFrom(this Note note, UpdateNoteRequest request)
    {
        note.Title = request.Title;
        note.Content = request.Content;
        note.Tags = request.Tags;
        note.IsArchived = request.IsArchived;
        note.Folder = request.Folder;
        note.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Maps an ImportNoteRequest to a Note entity
    /// </summary>
    public static Note ToEntity(this ImportNoteRequest request, string userId)
    {
        return new Note
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            ExternalId = request.ExternalId,
            Source = request.Source,
            CreatedAt = request.CreatedAt.UtcDateTime,
            UpdatedAt = request.UpdatedAt.UtcDateTime,
            Title = request.Title,
            Content = request.Content,
            Folder = request.Folder,
            Tags = request.Tags,
            IsArchived = false
        };
    }

    /// <summary>
    /// Updates an existing Note entity with data from ImportNoteRequest
    /// </summary>
    public static void UpdateFrom(this Note note, ImportNoteRequest request)
    {
        note.Title = request.Title;
        note.Content = request.Content;
        note.Folder = request.Folder;
        note.Source = request.Source;
        note.UpdatedAt = request.UpdatedAt.UtcDateTime;
        note.Tags = request.Tags;
    }

    /// <summary>
    /// Maps a User entity to a UserResponse DTO
    /// </summary>
    public static UserResponse ToResponse(this User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            IsActive = user.IsActive
        };
    }
}

