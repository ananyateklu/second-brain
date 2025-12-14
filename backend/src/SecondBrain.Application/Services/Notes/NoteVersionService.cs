using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service implementation for note version history operations.
/// Uses PostgreSQL 18 temporal features via the repository layer.
/// </summary>
public class NoteVersionService : INoteVersionService
{
    private readonly INoteVersionRepository _repository;
    private readonly ILogger<NoteVersionService> _logger;

    public NoteVersionService(
        INoteVersionRepository repository,
        ILogger<NoteVersionService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<NoteVersionResponse?> GetCurrentVersionAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var version = await _repository.GetCurrentVersionAsync(noteId, cancellationToken);
        return version != null ? MapToResponse(version) : null;
    }

    public async Task<NoteVersionResponse?> GetVersionAtTimeAsync(string noteId, DateTime timestamp, CancellationToken cancellationToken = default)
    {
        var version = await _repository.GetVersionAtTimeAsync(noteId, timestamp, cancellationToken);
        return version != null ? MapToResponse(version) : null;
    }

    public async Task<NoteVersionHistoryResponse> GetVersionHistoryAsync(string noteId, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
    {
        var versions = await _repository.GetVersionHistoryAsync(noteId, skip, take, cancellationToken);
        var totalCount = await _repository.GetVersionCountAsync(noteId, cancellationToken);
        var currentVersion = await _repository.GetCurrentVersionAsync(noteId, cancellationToken);

        return new NoteVersionHistoryResponse
        {
            NoteId = noteId,
            TotalVersions = totalCount,
            CurrentVersion = currentVersion?.VersionNumber ?? 0,
            Versions = versions.Select(MapToResponse).ToList()
        };
    }

    public async Task<NoteVersionResponse?> GetVersionByNumberAsync(string noteId, int versionNumber, CancellationToken cancellationToken = default)
    {
        var version = await _repository.GetVersionByNumberAsync(noteId, versionNumber, cancellationToken);
        return version != null ? MapToResponse(version) : null;
    }

    public async Task<int> CreateVersionAsync(Note note, string modifiedBy, string? changeSummary = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Creating new version for note {NoteId} by {ModifiedBy}", note.Id, modifiedBy);
        return await _repository.CreateVersionAsync(note, modifiedBy, changeSummary, cancellationToken);
    }

    public async Task<NoteVersionResponse> CreateInitialVersionAsync(Note note, string createdBy, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Creating initial version for note {NoteId} by {CreatedBy}", note.Id, createdBy);
        var version = await _repository.CreateInitialVersionAsync(note, createdBy, cancellationToken);
        return MapToResponse(version);
    }

    public async Task<NoteVersionDiffResponse?> GetVersionDiffAsync(string noteId, int fromVersion, int toVersion, CancellationToken cancellationToken = default)
    {
        var diff = await _repository.GetVersionDiffAsync(noteId, fromVersion, toVersion, cancellationToken);
        if (diff == null)
            return null;

        var (from, to) = diff.Value;

        // Calculate tag differences
        var tagsAdded = to.Tags.Except(from.Tags).ToList();
        var tagsRemoved = from.Tags.Except(to.Tags).ToList();

        // Calculate image differences
        var imagesAdded = to.ImageIds.Except(from.ImageIds).ToList();
        var imagesRemoved = from.ImageIds.Except(to.ImageIds).ToList();

        // Determine content change - prefer JSON comparison when both have it
        // This eliminates false positives from format conversion drift
        bool contentChanged = DetermineContentChanged(from, to);

        return new NoteVersionDiffResponse
        {
            NoteId = noteId,
            FromVersion = MapToResponse(from),
            ToVersion = MapToResponse(to),
            TitleChanged = from.Title != to.Title,
            ContentChanged = contentChanged,
            TagsChanged = tagsAdded.Count > 0 || tagsRemoved.Count > 0,
            ArchivedChanged = from.IsArchived != to.IsArchived,
            FolderChanged = from.Folder != to.Folder,
            ImagesChanged = imagesAdded.Count > 0 || imagesRemoved.Count > 0,
            TagsAdded = tagsAdded,
            TagsRemoved = tagsRemoved,
            ImagesAdded = imagesAdded,
            ImagesRemoved = imagesRemoved
        };
    }

    /// <summary>
    /// Determines if content changed between versions.
    /// Prefers ContentJson comparison when both versions have it to avoid format drift false positives.
    /// Falls back to Content string comparison for legacy notes.
    /// </summary>
    private static bool DetermineContentChanged(NoteVersion from, NoteVersion to)
    {
        // If both versions have ContentJson, compare JSON (canonical format)
        if (!string.IsNullOrEmpty(from.ContentJson) && !string.IsNullOrEmpty(to.ContentJson))
        {
            return !JsonContentEquals(from.ContentJson, to.ContentJson);
        }

        // Fall back to string comparison of Content field
        return from.Content != to.Content;
    }

    /// <summary>
    /// Compares two JSON strings for structural equality.
    /// This handles cases where formatting differs but content is the same.
    /// </summary>
    private static bool JsonContentEquals(string json1, string json2)
    {
        try
        {
            using var doc1 = JsonDocument.Parse(json1);
            using var doc2 = JsonDocument.Parse(json2);
            return JsonElementEquals(doc1.RootElement, doc2.RootElement);
        }
        catch
        {
            // If JSON parsing fails, fall back to string comparison
            return json1 == json2;
        }
    }

    /// <summary>
    /// Recursively compares two JsonElements for structural equality.
    /// </summary>
    private static bool JsonElementEquals(JsonElement e1, JsonElement e2)
    {
        if (e1.ValueKind != e2.ValueKind)
            return false;

        switch (e1.ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.True:
            case JsonValueKind.False:
                return true;

            case JsonValueKind.Number:
                return e1.GetDecimal() == e2.GetDecimal();

            case JsonValueKind.String:
                return e1.GetString() == e2.GetString();

            case JsonValueKind.Array:
                var arr1 = e1.EnumerateArray().ToList();
                var arr2 = e2.EnumerateArray().ToList();
                if (arr1.Count != arr2.Count)
                    return false;
                for (int i = 0; i < arr1.Count; i++)
                {
                    if (!JsonElementEquals(arr1[i], arr2[i]))
                        return false;
                }
                return true;

            case JsonValueKind.Object:
                var props1 = e1.EnumerateObject().OrderBy(p => p.Name).ToList();
                var props2 = e2.EnumerateObject().OrderBy(p => p.Name).ToList();
                if (props1.Count != props2.Count)
                    return false;
                for (int i = 0; i < props1.Count; i++)
                {
                    if (props1[i].Name != props2[i].Name)
                        return false;
                    if (!JsonElementEquals(props1[i].Value, props2[i].Value))
                        return false;
                }
                return true;

            default:
                return false;
        }
    }

    public async Task<int> RestoreVersionAsync(string noteId, int targetVersion, string restoredBy, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Restoring note {NoteId} to version {TargetVersion} by {RestoredBy}",
            noteId, targetVersion, restoredBy);

        return await _repository.RestoreVersionAsync(noteId, targetVersion, restoredBy, cancellationToken);
    }

    public async Task<int> GetVersionCountAsync(string noteId, CancellationToken cancellationToken = default)
    {
        return await _repository.GetVersionCountAsync(noteId, cancellationToken);
    }

    private static NoteVersionResponse MapToResponse(NoteVersion version)
    {
        return new NoteVersionResponse
        {
            NoteId = version.NoteId,
            VersionNumber = version.VersionNumber,
            IsCurrent = version.IsCurrent,
            ValidFrom = version.ValidFrom,
            ValidTo = version.ValidTo,
            Title = version.Title,
            Content = version.Content,
            ContentJson = ParseContentJson(version.ContentJson),
            ContentFormat = MapContentFormat(version.ContentFormat),
            Tags = version.Tags,
            IsArchived = version.IsArchived,
            Folder = version.Folder,
            ModifiedBy = version.ModifiedBy,
            ChangeSummary = version.ChangeSummary,
            Source = version.Source,
            ImageIds = version.ImageIds,
            CreatedAt = version.CreatedAt
        };
    }

    /// <summary>
    /// Parses ContentJson string to JsonElement for response.
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
    /// Maps ContentFormat enum to string for API response.
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
}
