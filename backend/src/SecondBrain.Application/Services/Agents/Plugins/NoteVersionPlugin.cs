using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling version history operations for notes:
/// GetNoteVersionHistory, GetVersion (by number OR timestamp), CompareNoteVersions, RestoreNoteVersion.
/// </summary>
public class NoteVersionPlugin : NotePluginBase
{
    private readonly INoteVersionService _versionService;

    public NoteVersionPlugin(
        IParallelNoteRepository noteRepository,
        INoteVersionService versionService,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService)
    {
        _versionService = versionService;
    }

    public override string CapabilityId => "notes-version";
    public override string DisplayName => "Notes Version History";
    public override string Description => "View and restore previous versions of notes";

    public override string GetPluginName() => "NotesVersion";

    public override string GetSystemPromptAddition() => @"
### Version History Tools

- **GetNoteVersionHistory**: View all previous versions of a note
  - Use when user asks ""show history"", ""what changed"", or ""list versions""
  - Returns paginated list of versions with change summaries

- **GetVersion**: Get a specific version by number OR timestamp (use one, not both)
  - versionNumber: Use when user asks ""show version 3"" or ""what was in version X""
  - timestamp: Supports ISO dates (2024-12-25) and relative dates (yesterday, last week)
  - Examples: ""show version 3"" -> versionNumber=3, ""what was this yesterday"" -> timestamp=""yesterday""

- **CompareNoteVersions**: Compare two versions to see differences
  - Shows what changed between versions (title, content, tags, folder)
  - Use when user asks ""what changed between version 2 and 5?""

- **RestoreNoteVersion**: Restore note to a previous version
  - Creates a new version with the restored content (non-destructive)
  - Use when user asks ""undo"", ""revert"", or ""restore to version X""";

    [KernelFunction("GetNoteVersionHistory")]
    [Description("Gets the version history of a note, showing all previous versions with change summaries. Use this when the user wants to see the edit history of a note.")]
    public async Task<string> GetNoteVersionHistoryAsync(
        [Description("The ID of the note to get version history for")] string noteId,
        [Description("Number of versions to skip for pagination (default: 0)")] int skip = 0,
        [Description("Maximum number of versions to return (default: 20)")] int take = 20)
    {
        var userError = ValidateUserContext("get version history");
        if (userError != null) return userError;

        try
        {
            // First verify the note exists and user has access
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            var history = await _versionService.GetVersionHistoryAsync(noteId, skip, take);

            if (!history.Versions.Any())
            {
                return $"No version history found for note \"{note.Title}\" (ID: {noteId}).";
            }

            var versionData = history.Versions.Select(v => new
            {
                versionNumber = v.VersionNumber,
                isCurrent = v.IsCurrent,
                validFrom = v.ValidFrom,
                validTo = v.ValidTo,
                changeSummary = v.ChangeSummary ?? (v.VersionNumber == 1 ? "Initial version" : "Modified"),
                modifiedBy = v.ModifiedBy,
                source = v.Source,
                aiProvider = v.AiProvider,
                aiModel = v.AiModel
            }).ToList();

            var response = new
            {
                type = "versionHistory",
                message = $"Version history for note \"{note.Title}\"",
                noteId = note.Id,
                noteTitle = note.Title,
                totalVersions = history.TotalVersions,
                currentVersion = history.CurrentVersion,
                pagination = new
                {
                    skip,
                    take,
                    returned = versionData.Count,
                    hasMore = skip + versionData.Count < history.TotalVersions
                },
                versions = versionData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("getting version history", ex.Message);
        }
    }

    [KernelFunction("GetVersion")]
    [Description("Get specific note version. Use versionNumber OR timestamp (not both). Timestamp supports ISO dates and relative ('yesterday', 'last week'). Examples: 'show version 3' -> versionNumber=3, 'what was this yesterday' -> timestamp='yesterday'.")]
    public async Task<string> GetVersionAsync(
        [Description("Note ID")] string noteId,
        [Description("Version number to retrieve")] int? versionNumber = null,
        [Description("Timestamp (ISO or relative)")] string? timestamp = null)
    {
        var userError = ValidateUserContext("get version");
        if (userError != null) return userError;

        // Validate parameters
        if (versionNumber == null && string.IsNullOrWhiteSpace(timestamp))
        {
            return "Please provide either a versionNumber or a timestamp to retrieve.";
        }

        if (versionNumber != null && !string.IsNullOrWhiteSpace(timestamp))
        {
            return "Please provide either versionNumber OR timestamp, not both.";
        }

        try
        {
            // First verify the note exists and user has access
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // Retrieve by version number
            if (versionNumber != null)
            {
                var version = await _versionService.GetVersionByNumberAsync(note.Id, versionNumber.Value);

                if (version == null)
                {
                    var totalVersions = await _versionService.GetVersionCountAsync(note.Id);
                    return $"Version {versionNumber} not found for note \"{note.Title}\". This note has {totalVersions} version(s).";
                }

                return JsonSerializer.Serialize(new
                {
                    type = "noteVersion",
                    message = $"Version {versionNumber} of note \"{note.Title}\"",
                    noteId = note.Id,
                    noteTitle = note.Title,
                    version = new
                    {
                        versionNumber = version.VersionNumber,
                        isCurrent = version.IsCurrent,
                        title = version.Title,
                        content = version.Content,
                        tags = version.Tags,
                        folder = version.Folder,
                        isArchived = version.IsArchived,
                        validFrom = version.ValidFrom,
                        validTo = version.ValidTo,
                        changeSummary = version.ChangeSummary,
                        modifiedBy = version.ModifiedBy,
                        source = version.Source,
                        aiProvider = version.AiProvider,
                        aiModel = version.AiModel
                    }
                });
            }

            // Retrieve by timestamp
            var now = DateTime.UtcNow;
            DateTime targetTime = ParseRelativeDate(timestamp!, now);

            var versionAtTime = await _versionService.GetVersionAtTimeAsync(note.Id, targetTime);

            if (versionAtTime == null)
            {
                return $"No version found for note \"{note.Title}\" at {targetTime:yyyy-MM-dd HH:mm:ss} UTC. The note may not have existed at that time.";
            }

            return JsonSerializer.Serialize(new
            {
                type = "noteVersion",
                message = $"Note \"{note.Title}\" as it was at {targetTime:yyyy-MM-dd HH:mm:ss} UTC",
                noteId = note.Id,
                noteTitle = note.Title,
                requestedTime = targetTime,
                version = new
                {
                    versionNumber = versionAtTime.VersionNumber,
                    isCurrent = versionAtTime.IsCurrent,
                    title = versionAtTime.Title,
                    content = versionAtTime.Content,
                    tags = versionAtTime.Tags,
                    folder = versionAtTime.Folder,
                    isArchived = versionAtTime.IsArchived,
                    validFrom = versionAtTime.ValidFrom,
                    validTo = versionAtTime.ValidTo,
                    changeSummary = versionAtTime.ChangeSummary,
                    modifiedBy = versionAtTime.ModifiedBy
                }
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("getting version", ex.Message);
        }
    }

    [KernelFunction("CompareNoteVersions")]
    [Description("Compares two versions of a note to see what changed between them. Shows differences in title, content, tags, folder, and archived status.")]
    public async Task<string> CompareNoteVersionsAsync(
        [Description("The ID of the note")] string noteId,
        [Description("The earlier version number to compare from")] int fromVersion,
        [Description("The later version number to compare to")] int toVersion)
    {
        var userError = ValidateUserContext("compare versions");
        if (userError != null) return userError;

        try
        {
            // First verify the note exists and user has access
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // Ensure fromVersion < toVersion
            if (fromVersion > toVersion)
            {
                (fromVersion, toVersion) = (toVersion, fromVersion);
            }

            var diff = await _versionService.GetVersionDiffAsync(noteId, fromVersion, toVersion);

            if (diff == null)
            {
                var totalVersions = await _versionService.GetVersionCountAsync(noteId);
                return $"Could not compare versions {fromVersion} and {toVersion}. Note \"{note.Title}\" has {totalVersions} version(s).";
            }

            // Build a human-readable summary of changes
            var changes = new List<string>();
            if (diff.TitleChanged) changes.Add("title");
            if (diff.ContentChanged) changes.Add("content");
            if (diff.TagsChanged) changes.Add($"tags (added: {string.Join(", ", diff.TagsAdded)}, removed: {string.Join(", ", diff.TagsRemoved)})");
            if (diff.FolderChanged) changes.Add($"folder (from \"{diff.FromVersion.Folder ?? "none"}\" to \"{diff.ToVersion.Folder ?? "none"}\")");
            if (diff.ArchivedChanged) changes.Add($"archived status ({diff.FromVersion.IsArchived} → {diff.ToVersion.IsArchived})");
            if (diff.ImagesChanged) changes.Add($"images (added: {diff.ImagesAdded.Count}, removed: {diff.ImagesRemoved.Count})");

            var response = new
            {
                type = "versionDiff",
                message = changes.Any()
                    ? $"Changes between version {fromVersion} and {toVersion} of \"{note.Title}\""
                    : $"No changes detected between version {fromVersion} and {toVersion}",
                noteId = note.Id,
                noteTitle = note.Title,
                comparison = new
                {
                    fromVersion = fromVersion,
                    toVersion = toVersion,
                    titleChanged = diff.TitleChanged,
                    contentChanged = diff.ContentChanged,
                    tagsChanged = diff.TagsChanged,
                    folderChanged = diff.FolderChanged,
                    archivedChanged = diff.ArchivedChanged,
                    imagesChanged = diff.ImagesChanged,
                    tagsAdded = diff.TagsAdded,
                    tagsRemoved = diff.TagsRemoved,
                    changesSummary = changes.Any() ? string.Join(", ", changes) : "No changes"
                },
                versions = new
                {
                    from = new
                    {
                        versionNumber = diff.FromVersion.VersionNumber,
                        title = diff.FromVersion.Title,
                        contentPreview = GetContentPreview(diff.FromVersion.Content),
                        tags = diff.FromVersion.Tags,
                        folder = diff.FromVersion.Folder,
                        isArchived = diff.FromVersion.IsArchived,
                        validFrom = diff.FromVersion.ValidFrom
                    },
                    to = new
                    {
                        versionNumber = diff.ToVersion.VersionNumber,
                        title = diff.ToVersion.Title,
                        contentPreview = GetContentPreview(diff.ToVersion.Content),
                        tags = diff.ToVersion.Tags,
                        folder = diff.ToVersion.Folder,
                        isArchived = diff.ToVersion.IsArchived,
                        validFrom = diff.ToVersion.ValidFrom
                    }
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("comparing versions", ex.Message);
        }
    }

    [KernelFunction("RestoreNoteVersion")]
    [Description("Restores a note to a previous version. This creates a new version with the content from the target version (non-destructive - you can always restore again).")]
    public async Task<string> RestoreNoteVersionAsync(
        [Description("The ID of the note to restore")] string noteId,
        [Description("The version number to restore to")] int targetVersion)
    {
        var userError = ValidateUserContext("restore version");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // First verify the note exists and user has access
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            var noteTitle = note.Title;

            // Get the target version to show what will be restored
            var versionToRestore = await _versionService.GetVersionByNumberAsync(noteId, targetVersion);
            if (versionToRestore == null)
            {
                var totalVersions = await _versionService.GetVersionCountAsync(noteId);
                return $"Version {targetVersion} not found for note \"{noteTitle}\". This note has {totalVersions} version(s).";
            }

            var request = new RestoreVersionOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                TargetVersionNumber = targetVersion
            };

            var result = await NoteOperationService.RestoreVersionAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    var response = new
                    {
                        type = "versionRestored",
                        message = $"Successfully restored note \"{noteTitle}\" to version {targetVersion}",
                        noteId = noteId,
                        noteTitle = noteTitle,
                        restoredFromVersion = targetVersion,
                        newVersionNumber = op.NewVersionNumber,
                        restoredNote = new
                        {
                            title = op.Note.Title,
                            contentPreview = GetContentPreview(op.Note.Content),
                            tags = op.Note.Tags,
                            folder = op.Note.Folder
                        }
                    };
                    return JsonSerializer.Serialize(response);
                },
                onFailure: error => $"Error restoring version: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("restoring version", ex.Message);
        }
    }
}
