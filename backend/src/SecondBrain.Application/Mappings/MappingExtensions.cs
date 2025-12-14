using System.Text.Json;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Mappings;

/// <summary>
/// Extension methods for mapping between entities and DTOs
/// </summary>
public static class MappingExtensions
{
    /// <summary>
    /// Maps a Note entity to a NoteResponse DTO (full content, used for get-by-id)
    /// </summary>
    public static NoteResponse ToResponse(this Note note)
    {
        return new NoteResponse
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            ContentJson = ParseContentJson(note.ContentJson),
            ContentFormat = MapContentFormat(note.ContentFormat),
            Summary = note.Summary,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            Tags = note.Tags,
            IsArchived = note.IsArchived,
            UserId = note.UserId,
            Source = note.Source,
            ExternalId = note.ExternalId,
            Folder = note.Folder,
            Images = note.Images?.Select(i => i.ToResponse()).ToList() ?? new List<NoteImageResponse>()
        };
    }

    /// <summary>
    /// Parses ContentJson string to JsonElement for response
    /// </summary>
    private static JsonElement? ParseContentJson(string? contentJson)
    {
        if (string.IsNullOrEmpty(contentJson))
            return null;

        try
        {
            return JsonDocument.Parse(contentJson).RootElement.Clone();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Maps ContentFormat enum to string for API response
    /// </summary>
    private static string MapContentFormat(ContentFormat format)
    {
        return format switch
        {
            ContentFormat.Html => "html",
            ContentFormat.TipTapJson => "tiptap_json",
            _ => "markdown"
        };
    }

    /// <summary>
    /// Maps a NoteImage entity to a NoteImageResponse DTO
    /// </summary>
    public static NoteImageResponse ToResponse(this NoteImage image)
    {
        return new NoteImageResponse
        {
            Id = image.Id,
            NoteId = image.NoteId,
            Base64Data = image.Base64Data,
            MediaType = image.MediaType,
            FileName = image.FileName,
            ImageIndex = image.ImageIndex,
            Description = image.Description,
            AltText = image.AltText,
            DescriptionProvider = image.DescriptionProvider,
            CreatedAt = image.CreatedAt,
            UpdatedAt = image.UpdatedAt
        };
    }

    /// <summary>
    /// Maps a Note entity to a NoteListResponse DTO (lightweight, summary instead of content).
    /// Used for list endpoints to reduce payload size and improve performance.
    /// </summary>
    public static NoteListResponse ToListResponse(this Note note)
    {
        return new NoteListResponse
        {
            Id = note.Id,
            Title = note.Title,
            Summary = note.Summary,
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt,
            Tags = note.Tags,
            IsArchived = note.IsArchived,
            Folder = note.Folder,
            Source = note.Source
        };
    }

    /// <summary>
    /// Maps a CreateNoteRequest to a Note entity
    /// </summary>
    public static Note ToEntity(this CreateNoteRequest request, string userId)
    {
        var hasContentJson = request.ContentJson.HasValue &&
                            request.ContentJson.Value.ValueKind != JsonValueKind.Undefined &&
                            request.ContentJson.Value.ValueKind != JsonValueKind.Null;

        return new Note
        {
            Id = UuidV7.NewId(),
            Title = request.Title,
            Content = request.Content,
            ContentJson = hasContentJson ? request.ContentJson!.Value.GetRawText() : null,
            ContentFormat = hasContentJson ? ContentFormat.TipTapJson : ContentFormat.Markdown,
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
    /// The folder name used for archived notes
    /// </summary>
    public const string ArchivedFolderName = "Archived";

    /// <summary>
    /// Updates an existing Note entity with data from UpdateNoteRequest.
    /// Only updates fields that are explicitly provided (not null).
    /// When archiving a note, it is automatically moved to the "Archived" folder.
    /// When unarchiving, it is removed from the "Archived" folder (folder set to null).
    /// </summary>
    public static void UpdateFrom(this Note note, UpdateNoteRequest request)
    {
        if (request.Title != null)
        {
            note.Title = request.Title;
        }

        if (request.Content != null)
        {
            note.Content = request.Content;
        }

        // Handle ContentJson update
        if (request.UpdateContentJson)
        {
            if (request.ContentJson.HasValue &&
                request.ContentJson.Value.ValueKind != JsonValueKind.Undefined &&
                request.ContentJson.Value.ValueKind != JsonValueKind.Null)
            {
                note.ContentJson = request.ContentJson.Value.GetRawText();
                note.ContentFormat = ContentFormat.TipTapJson;
            }
            else
            {
                note.ContentJson = null;
                // Revert to Markdown format if ContentJson is cleared
                note.ContentFormat = ContentFormat.Markdown;
            }
        }

        if (request.Tags != null)
        {
            note.Tags = request.Tags;
        }

        if (request.IsArchived.HasValue)
        {
            note.IsArchived = request.IsArchived.Value;

            // Automatically manage folder when archiving/unarchiving
            if (request.IsArchived.Value)
            {
                // When archiving, move to Archived folder
                note.Folder = ArchivedFolderName;
            }
            else
            {
                // When unarchiving, remove from Archived folder (only if currently in Archived folder)
                if (note.Folder == ArchivedFolderName)
                {
                    note.Folder = null;
                }
            }
        }

        // Only update folder if explicitly requested (to allow setting to null/empty)
        // This takes precedence over the automatic archiving folder logic above
        if (request.UpdateFolder)
        {
            note.Folder = request.Folder;
        }

        note.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Maps an ImportNoteRequest to a Note entity
    /// </summary>
    public static Note ToEntity(this ImportNoteRequest request, string userId)
    {
        return new Note
        {
            Id = UuidV7.NewId(),
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

