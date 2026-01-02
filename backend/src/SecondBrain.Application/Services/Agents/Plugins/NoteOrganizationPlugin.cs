using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling organization operations for notes:
/// ListAllNotes, ListRecentNotes, ListArchivedNotes, Archive/Unarchive,
/// MoveToFolder, ListFolders, ListAllTags, GetNoteStats.
/// </summary>
public class NoteOrganizationPlugin : NotePluginBase
{
    public NoteOrganizationPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService)
    {
    }

    public override string CapabilityId => "notes-organization";
    public override string DisplayName => "Notes Organization";
    public override string Description => "List, archive, and organize notes into folders and tags";

    public override string GetPluginName() => "NotesOrganization";

    public override string GetSystemPromptAddition() => @"
### Organization Tools (Return Previews Only)

- **ListNotes** - Unified listing tool with filters
  - filter='recent' (default): Most recently updated notes
  - filter='archived': Only archived notes
  - filter='all': All notes with pagination
  - detailLevel='ids_only', 'summary' (default), 'full'
  - Returns preview only - use GetNote for full content

- **SetNoteArchived** - Toggle archive status
  - Set isArchived=true to archive, false to restore

- **MoveToFolder**: Organize note into a folder
  - Pass empty string to remove from folder

- **GetOverview** - Unified overview tool for organization info
  - type='all' (default): Full stats with top tags and folders
  - type='folders': List of all folders with note counts
  - type='tags': List of all tags with usage counts
  - type='stats': Counts only (total, active, archived, recent activity)";

    [KernelFunction("ListNotes")]
    [Description("UNIFIED listing tool for all notes. filter: 'recent' (default), 'archived', 'all'. detailLevel: 'ids_only' (fast), 'summary' (default), 'full' (complete content). Examples: 'show my notes' -> filter=recent, 'show archived' -> filter=archived, 'list everything' -> filter=all.")]
    public async Task<string> ListNotesAsync(
        [Description("Filter: 'recent' (default), 'archived', or 'all'")] string filter = "recent",
        [Description("Max notes to return (default: 10)")] int limit = 10,
        [Description("Skip N notes for pagination (default: 0)")] int skip = 0,
        [Description("Detail: 'ids_only', 'summary' (default), 'full'")] string detailLevel = "summary")
    {
        var userError = ValidateUserContext("list notes");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
            var allNotes = notes.ToList();

            // Apply filter
            IEnumerable<SecondBrain.Core.Entities.Note> filteredNotes = filter.ToLowerInvariant() switch
            {
                "archived" => allNotes.Where(n => n.IsArchived),
                "all" => allNotes,
                _ => allNotes.Where(n => !n.IsArchived) // "recent" is default
            };

            var totalCount = filteredNotes.Count();

            var resultNotes = filteredNotes
                .OrderByDescending(n => n.UpdatedAt)
                .Skip(skip)
                .Take(limit > 0 ? limit : 10)
                .ToList();

            if (!resultNotes.Any())
            {
                return filter.ToLowerInvariant() switch
                {
                    "archived" => "You don't have any archived notes.",
                    "all" => "You don't have any notes yet.",
                    _ => "You don't have any active notes. Try filter='archived' to see archived notes."
                };
            }

            var noteData = MapNotesByDetailLevel(resultNotes, detailLevel);

            var filterLabel = filter.ToLowerInvariant() switch
            {
                "archived" => "archived",
                "all" => "total",
                _ => "active"
            };

            var detailHint = detailLevel.ToLowerInvariant() == "full"
                ? ""
                : " Use GetNote with note ID for full content.";

            var response = new
            {
                type = "notes",
                message = $"Found {totalCount} {filterLabel} note(s). Showing {resultNotes.Count}.{detailHint}",
                filter = filter.ToLowerInvariant(),
                detailLevel = detailLevel.ToLowerInvariant(),
                notes = noteData,
                pagination = new
                {
                    total = totalCount,
                    returned = resultNotes.Count,
                    skipped = skip,
                    hasMore = skip + resultNotes.Count < totalCount
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing notes", ex.Message);
        }
    }

    [KernelFunction("SetNoteArchived")]
    [Description("SET archive status for a note. isArchived=true to archive (hide from main list), isArchived=false to restore. Combines ArchiveNote and UnarchiveNote. Examples: 'archive this note' -> isArchived=true, 'restore from archive' -> isArchived=false.")]
    public async Task<string> SetNoteArchivedAsync(
        [Description("Note ID to update")] string noteId,
        [Description("true to archive, false to restore")] bool isArchived)
    {
        var userError = ValidateUserContext("update note archive status");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // Check if already in desired state
            if (note.IsArchived == isArchived)
            {
                return isArchived
                    ? $"Note \"{note.Title}\" (ID: {noteId}) is already archived."
                    : $"Note \"{note.Title}\" (ID: {noteId}) is not archived.";
            }

            var noteTitle = note.Title;

            var request = new SetArchivedOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                IsArchived = isArchived,
                Source = NoteSource.Agent
            };

            var result = await NoteOperationService.SetArchivedAsync(request);

            return result.Match(
                onSuccess: op => isArchived
                    ? $"Successfully archived note \"{noteTitle}\" (ID: {noteId}). Use SetNoteArchived with isArchived=false to restore."
                    : $"Successfully restored note \"{noteTitle}\" (ID: {noteId}) from archive.",
                onFailure: error => $"Error updating archive status: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("updating archive status", ex.Message);
        }
    }

    [KernelFunction("MoveToFolder")]
    [Description("MOVE note to folder for organization. Use empty string to remove from folder. Folders are created automatically. Examples: 'move to Work folder', 'file this under Projects', 'organize into X' -> MoveToFolder.")]
    public async Task<string> MoveToFolderAsync(
        [Description("Note ID to move")] string noteId,
        [Description("Folder name (empty = remove from folder)")] string? folder = null)
    {
        var userError = ValidateUserContext("move note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // First check if note exists and get current state for feedback
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            var noteTitle = note.Title;
            var previousFolder = note.Folder;
            var newFolder = string.IsNullOrWhiteSpace(folder) ? null : folder.Trim();

            // Check if already in the target folder
            if (previousFolder == newFolder)
            {
                return newFolder == null
                    ? $"Note \"{noteTitle}\" (ID: {noteId}) is not in any folder."
                    : $"Note \"{noteTitle}\" (ID: {noteId}) is already in folder \"{newFolder}\".";
            }

            var request = new MoveToFolderOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                Folder = newFolder,
                Source = NoteSource.Agent
            };

            var result = await NoteOperationService.MoveToFolderAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    if (string.IsNullOrEmpty(newFolder))
                    {
                        return previousFolder != null
                            ? $"Removed note \"{noteTitle}\" (ID: {noteId}) from folder \"{previousFolder}\"."
                            : $"Note \"{noteTitle}\" (ID: {noteId}) is not in any folder.";
                    }

                    return previousFolder != null
                        ? $"Moved note \"{noteTitle}\" (ID: {noteId}) from folder \"{previousFolder}\" to \"{newFolder}\"."
                        : $"Moved note \"{noteTitle}\" (ID: {noteId}) to folder \"{newFolder}\".";
                },
                onFailure: error => $"Error moving note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("moving note", ex.Message);
        }
    }

    [KernelFunction("GetOverview")]
    [Description("Get notes overview. type='all' (default) for full stats with top tags/folders, 'folders' for folder list, 'tags' for tag list, 'stats' for counts only. Examples: 'how many notes' -> all, 'what folders exist' -> folders, 'show my tags' -> tags.")]
    public async Task<string> GetOverviewAsync(
        [Description("Overview type: 'all'|'folders'|'tags'|'stats'")] string type = "all",
        [Description("Include archived notes in counts?")] bool includeArchived = false)
    {
        var userError = ValidateUserContext("get overview");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
            var allNotes = notes.ToList();
            var activeNotes = allNotes.Where(n => !n.IsArchived).ToList();
            var archivedNotes = allNotes.Where(n => n.IsArchived).ToList();
            var filteredNotes = includeArchived ? allNotes : activeNotes;

            var normalizedType = type.ToLowerInvariant();

            // Handle "folders" type
            if (normalizedType == "folders")
            {
                var folderCountsDict = filteredNotes
                    .Where(n => !string.IsNullOrEmpty(n.Folder))
                    .GroupBy(n => n.Folder!)
                    .ToDictionary(g => g.Key, g => g.Count());

                if (archivedNotes.Any() && !folderCountsDict.ContainsKey("Archived"))
                {
                    folderCountsDict["Archived"] = archivedNotes.Count;
                }

                var folderCounts = folderCountsDict
                    .Select(kvp => new { name = kvp.Key, noteCount = kvp.Value })
                    .OrderByDescending(x => x.noteCount)
                    .ThenBy(x => x.name)
                    .ToList();

                var notesWithoutFolder = filteredNotes.Count(n => string.IsNullOrEmpty(n.Folder));
                var totalNotesCount = filteredNotes.Count + (includeArchived ? 0 : archivedNotes.Count);

                if (!folderCounts.Any() && notesWithoutFolder == 0 && !archivedNotes.Any())
                {
                    return "You don't have any notes yet.";
                }

                return JsonSerializer.Serialize(new
                {
                    type = "folders",
                    message = folderCounts.Any()
                        ? $"Found {folderCounts.Count} folder(s)"
                        : "No folders found. All notes are unfiled.",
                    folders = folderCounts,
                    unfiledNotes = notesWithoutFolder,
                    totalNotes = totalNotesCount
                });
            }

            // Handle "tags" type
            if (normalizedType == "tags")
            {
                var tagCounts = filteredNotes
                    .SelectMany(n => n.Tags)
                    .GroupBy(t => t.ToLowerInvariant())
                    .Select(g => new { tag = g.First(), count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .ThenBy(x => x.tag)
                    .ToList();

                if (!tagCounts.Any())
                {
                    return "You don't have any tags yet. Add tags to your notes to organize them.";
                }

                return JsonSerializer.Serialize(new
                {
                    type = "tags",
                    message = $"Found {tagCounts.Count} unique tag(s) across your notes",
                    tags = tagCounts.Select(tc => new { name = tc.tag, noteCount = tc.count }).ToList(),
                    totalNotesWithTags = filteredNotes.Count(n => n.Tags.Any()),
                    totalNotes = filteredNotes.Count
                });
            }

            // Handle "stats" type
            if (normalizedType == "stats")
            {
                var now = DateTime.UtcNow;
                var notesThisWeek = filteredNotes.Count(n => n.CreatedAt >= now.AddDays(-7));
                var notesThisMonth = filteredNotes.Count(n => n.CreatedAt >= now.AddDays(-30));

                return JsonSerializer.Serialize(new
                {
                    type = "stats",
                    message = "Notes statistics (counts only)",
                    statistics = new
                    {
                        totalNotes = allNotes.Count,
                        activeNotes = activeNotes.Count,
                        archivedNotes = archivedNotes.Count,
                        notesCreatedThisWeek = notesThisWeek,
                        notesCreatedThisMonth = notesThisMonth
                    }
                });
            }

            // Default: "all" type - full overview
            var allTagCounts = filteredNotes
                .SelectMany(n => n.Tags)
                .GroupBy(t => t.ToLowerInvariant())
                .Select(g => new { tag = g.First(), count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(10)
                .ToList();

            var allFolderCountsDict = filteredNotes
                .Where(n => !string.IsNullOrEmpty(n.Folder))
                .GroupBy(n => n.Folder!)
                .ToDictionary(g => g.Key, g => g.Count());

            if (archivedNotes.Any() && !allFolderCountsDict.ContainsKey("Archived"))
            {
                allFolderCountsDict["Archived"] = archivedNotes.Count;
            }

            var topFolders = allFolderCountsDict
                .Select(kvp => new { name = kvp.Key, count = kvp.Value })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.name)
                .Take(10)
                .ToList();

            var notesInFoldersCount = filteredNotes.Count(n => !string.IsNullOrEmpty(n.Folder));
            if (!includeArchived && archivedNotes.Any())
            {
                notesInFoldersCount += archivedNotes.Count;
            }

            var nowForAll = DateTime.UtcNow;
            var allNotesThisWeek = filteredNotes.Count(n => n.CreatedAt >= nowForAll.AddDays(-7));
            var allNotesThisMonth = filteredNotes.Count(n => n.CreatedAt >= nowForAll.AddDays(-30));

            return JsonSerializer.Serialize(new
            {
                type = "overview",
                message = "Full notes overview",
                statistics = new
                {
                    totalNotes = allNotes.Count,
                    activeNotes = activeNotes.Count,
                    archivedNotes = archivedNotes.Count,
                    notesCreatedThisWeek = allNotesThisWeek,
                    notesCreatedThisMonth = allNotesThisMonth,
                    notesWithTags = filteredNotes.Count(n => n.Tags.Any()),
                    notesInFolders = notesInFoldersCount,
                    uniqueTagCount = allTagCounts.Count,
                    uniqueFolderCount = allFolderCountsDict.Count,
                    topTags = allTagCounts.Select(tc => new { name = tc.tag, count = tc.count }).ToList(),
                    topFolders = topFolders
                }
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("getting overview", ex.Message);
        }
    }
}
