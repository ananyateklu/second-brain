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

        return new NoteVersionDiffResponse
        {
            NoteId = noteId,
            FromVersion = MapToResponse(from),
            ToVersion = MapToResponse(to),
            TitleChanged = from.Title != to.Title,
            ContentChanged = from.Content != to.Content,
            TagsChanged = tagsAdded.Count > 0 || tagsRemoved.Count > 0,
            ArchivedChanged = from.IsArchived != to.IsArchived,
            FolderChanged = from.Folder != to.Folder,
            TagsAdded = tagsAdded,
            TagsRemoved = tagsRemoved
        };
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
            Tags = version.Tags,
            IsArchived = version.IsArchived,
            Folder = version.Folder,
            ModifiedBy = version.ModifiedBy,
            ChangeSummary = version.ChangeSummary,
            CreatedAt = version.CreatedAt
        };
    }
}
