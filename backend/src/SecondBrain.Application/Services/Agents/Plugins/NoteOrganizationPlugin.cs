using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
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
        IStructuredOutputService? structuredOutputService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService)
    {
    }

    public override string CapabilityId => "notes-organization";
    public override string DisplayName => "Notes Organization";
    public override string Description => "List, archive, and organize notes into folders and tags";

    public override string GetPluginName() => "NotesOrganization";

    public override string GetSystemPromptAddition() => @"
### Organization Tools (Return Previews Only)

- **ListAllNotes**: Show all notes (with optional pagination)
  - Returns preview only - use GetNote for full content
  - Use when user wants to see their complete list of notes

- **ListRecentNotes**: Show most recently updated notes
  - Returns preview only - use GetNote for full content

- **ListArchivedNotes**: Show archived notes
  - Returns preview only - use GetNote for full content

- **ArchiveNote**: Archive a note (soft delete)
  - Hides note from main list without deleting

- **UnarchiveNote**: Restore an archived note
  - Brings archived note back to main list

- **MoveToFolder**: Organize note into a folder
  - Pass empty string to remove from folder

- **ListFolders**: Show all folders with note counts

- **ListAllTags**: Show all tags with usage counts

- **GetNoteStats**: Get notes statistics overview";

    [KernelFunction("ListAllNotes")]
    [Description("Lists all of the user's notes. Use this when the user wants to see their complete list of notes, not just recent ones.")]
    public async Task<string> ListAllNotesAsync(
        [Description("Whether to include archived notes (default: false)")] bool includeArchived = false,
        [Description("Optional: Skip this many notes for pagination (default: 0)")] int skip = 0,
        [Description("Optional: Maximum number of notes to return. Use 0 or negative for all notes (default: 0 = all)")] int limit = 0)
    {
        var userError = ValidateUserContext("list notes");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

            var filteredNotes = includeArchived
                ? notes.ToList()
                : notes.Where(n => !n.IsArchived).ToList();

            var totalCount = filteredNotes.Count;

            var orderedNotes = filteredNotes
                .OrderByDescending(n => n.UpdatedAt)
                .Skip(skip);

            if (limit > 0)
            {
                orderedNotes = orderedNotes.Take(limit);
            }

            var resultNotes = orderedNotes.ToList();

            if (!resultNotes.Any())
            {
                if (skip > 0)
                {
                    return $"No more notes to show (skipped {skip} notes, total: {totalCount}).";
                }
                return includeArchived
                    ? "You don't have any notes yet."
                    : "You don't have any active notes. You may have archived notes - try setting includeArchived to true.";
            }

            var noteData = resultNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                folder = n.Folder,
                isArchived = n.IsArchived,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var paginationInfo = skip > 0 || limit > 0
                ? $" (showing {resultNotes.Count} of {totalCount}, skipped {skip})"
                : "";

            var response = new
            {
                type = "notes",
                message = $"Found {totalCount} total note(s){paginationInfo}. Use GetNote with the note ID to read full content.",
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
            return CreateErrorResponse("listing all notes", ex.Message);
        }
    }

    [KernelFunction("ListRecentNotes")]
    [Description("Lists the user's most recent notes. Use this to show what notes exist or to help the user remember what they've saved.")]
    public async Task<string> ListRecentNotesAsync(
        [Description("Maximum number of notes to list (default: 10)")] int maxResults = 10)
    {
        var userError = ValidateUserContext("list notes");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

            var recentNotes = notes
                .Where(n => !n.IsArchived)
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!recentNotes.Any())
            {
                return "You don't have any notes yet.";
            }

            var noteData = recentNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Your {recentNotes.Count} most recent notes. Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing notes", ex.Message);
        }
    }

    [KernelFunction("ListArchivedNotes")]
    [Description("Lists all archived notes. Use this when the user wants to see notes they have previously archived.")]
    public async Task<string> ListArchivedNotesAsync(
        [Description("Maximum number of archived notes to list (default: 10)")] int maxResults = 10)
    {
        var userError = ValidateUserContext("list archived notes");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

            var archivedNotes = notes
                .Where(n => n.IsArchived)
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!archivedNotes.Any())
            {
                return "You don't have any archived notes.";
            }

            var noteData = archivedNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {archivedNotes.Count} archived note(s). Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing archived notes", ex.Message);
        }
    }

    [KernelFunction("ArchiveNote")]
    [Description("Archives a note, hiding it from the main list while preserving it. Use this when the user wants to hide a note without permanently deleting it.")]
    public async Task<string> ArchiveNoteAsync(
        [Description("The ID of the note to archive")] string noteId)
    {
        var userError = ValidateUserContext("archive note");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to archive this note.";
            }

            if (note.IsArchived)
            {
                return $"Note \"{note.Title}\" (ID: {noteId}) is already archived.";
            }

            note.IsArchived = true;
            note.Folder = "Archived";
            note.UpdatedAt = DateTime.UtcNow;
            await NoteRepository.UpdateAsync(noteId, note);

            return $"Successfully archived note \"{note.Title}\" (ID: {noteId}) and moved it to the Archived folder. Use UnarchiveNote to restore it.";
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("archiving note", ex.Message);
        }
    }

    [KernelFunction("UnarchiveNote")]
    [Description("Restores an archived note back to the main list. Use this when the user wants to bring back a previously archived note.")]
    public async Task<string> UnarchiveNoteAsync(
        [Description("The ID of the note to unarchive")] string noteId)
    {
        var userError = ValidateUserContext("unarchive note");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to unarchive this note.";
            }

            if (!note.IsArchived)
            {
                return $"Note \"{note.Title}\" (ID: {noteId}) is not archived.";
            }

            note.IsArchived = false;
            if (note.Folder == "Archived")
            {
                note.Folder = null;
            }
            note.UpdatedAt = DateTime.UtcNow;
            await NoteRepository.UpdateAsync(noteId, note);

            return $"Successfully restored note \"{note.Title}\" (ID: {noteId}) from archive.";
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("unarchiving note", ex.Message);
        }
    }

    [KernelFunction("MoveToFolder")]
    [Description("Moves a note to a specific folder for organization. Use this when the user wants to organize notes into folders or categories.")]
    public async Task<string> MoveToFolderAsync(
        [Description("The ID of the note to move")] string noteId,
        [Description("The folder name to move the note to (use empty string or null to remove from folder)")] string? folder = null)
    {
        var userError = ValidateUserContext("move note");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to move this note.";
            }

            var previousFolder = note.Folder;
            var newFolder = string.IsNullOrWhiteSpace(folder) ? null : folder.Trim();

            note.Folder = newFolder;
            note.UpdatedAt = DateTime.UtcNow;
            await NoteRepository.UpdateAsync(noteId, note);

            if (string.IsNullOrEmpty(newFolder))
            {
                return previousFolder != null
                    ? $"Removed note \"{note.Title}\" (ID: {noteId}) from folder \"{previousFolder}\"."
                    : $"Note \"{note.Title}\" (ID: {noteId}) is not in any folder.";
            }

            return previousFolder != null
                ? $"Moved note \"{note.Title}\" (ID: {noteId}) from folder \"{previousFolder}\" to \"{newFolder}\"."
                : $"Moved note \"{note.Title}\" (ID: {noteId}) to folder \"{newFolder}\".";
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("moving note", ex.Message);
        }
    }

    [KernelFunction("ListFolders")]
    [Description("Lists all folders used to organize notes, with counts showing how many notes are in each folder.")]
    public async Task<string> ListFoldersAsync(
        [Description("Whether to include archived notes in the folder counts (default: false)")] bool includeArchived = false)
    {
        var userError = ValidateUserContext("list folders");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
            var allNotes = notes.ToList();

            var activeNotes = allNotes.Where(n => !n.IsArchived).ToList();
            var archivedNotes = allNotes.Where(n => n.IsArchived).ToList();
            var filteredNotes = includeArchived ? allNotes : activeNotes;

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

            var response = new
            {
                type = "folders",
                message = folderCounts.Any()
                    ? $"Found {folderCounts.Count} folder(s)"
                    : "No folders found. All notes are unfiled.",
                folders = folderCounts,
                unfiledNotes = notesWithoutFolder,
                totalNotes = totalNotesCount
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing folders", ex.Message);
        }
    }

    [KernelFunction("ListAllTags")]
    [Description("Lists all unique tags used across the user's notes, with counts showing how many notes use each tag.")]
    public async Task<string> ListAllTagsAsync(
        [Description("Whether to include archived notes in the tag counts (default: false)")] bool includeArchived = false)
    {
        var userError = ValidateUserContext("list tags");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

            var filteredNotes = includeArchived
                ? notes
                : notes.Where(n => !n.IsArchived);

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

            var response = new
            {
                type = "tags",
                message = $"Found {tagCounts.Count} unique tag(s) across your notes",
                tags = tagCounts.Select(tc => new { name = tc.tag, noteCount = tc.count }).ToList(),
                totalNotesWithTags = filteredNotes.Count(n => n.Tags.Any()),
                totalNotes = filteredNotes.Count()
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing tags", ex.Message);
        }
    }

    [KernelFunction("GetNoteStats")]
    [Description("Gets statistics about the user's notes, including total counts, tag distribution, and folder organization.")]
    public async Task<string> GetNoteStatsAsync(
        [Description("Whether to include archived notes in the statistics (default: false)")] bool includeArchived = false)
    {
        var userError = ValidateUserContext("get statistics");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
            var allNotes = notes.ToList();

            var activeNotes = allNotes.Where(n => !n.IsArchived).ToList();
            var archivedNotes = allNotes.Where(n => n.IsArchived).ToList();
            var notesForStats = includeArchived ? allNotes : activeNotes;

            // Tag statistics
            var tagCounts = notesForStats
                .SelectMany(n => n.Tags)
                .GroupBy(t => t.ToLowerInvariant())
                .Select(g => new { tag = g.First(), count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(10)
                .ToList();

            // Folder statistics
            var folderCountsDict = notesForStats
                .Where(n => !string.IsNullOrEmpty(n.Folder))
                .GroupBy(n => n.Folder!)
                .ToDictionary(g => g.Key, g => g.Count());

            if (archivedNotes.Any() && !folderCountsDict.ContainsKey("Archived"))
            {
                folderCountsDict["Archived"] = archivedNotes.Count;
            }

            var topFolders = folderCountsDict
                .Select(kvp => new { name = kvp.Key, count = kvp.Value })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.name)
                .Take(10)
                .ToList();

            var notesInFoldersCount = notesForStats.Count(n => !string.IsNullOrEmpty(n.Folder));
            if (!includeArchived && archivedNotes.Any())
            {
                notesInFoldersCount += archivedNotes.Count;
            }

            // Date statistics
            var now = DateTime.UtcNow;
            var notesThisWeek = notesForStats.Count(n => n.CreatedAt >= now.AddDays(-7));
            var notesThisMonth = notesForStats.Count(n => n.CreatedAt >= now.AddDays(-30));

            var response = new
            {
                type = "stats",
                message = "Notes statistics",
                statistics = new
                {
                    totalNotes = allNotes.Count,
                    activeNotes = activeNotes.Count,
                    archivedNotes = archivedNotes.Count,
                    notesCreatedThisWeek = notesThisWeek,
                    notesCreatedThisMonth = notesThisMonth,
                    notesWithTags = notesForStats.Count(n => n.Tags.Any()),
                    notesInFolders = notesInFoldersCount,
                    uniqueTagCount = tagCounts.Count,
                    uniqueFolderCount = folderCountsDict.Count,
                    topTags = tagCounts.Select(tc => new { name = tc.tag, count = tc.count }).ToList(),
                    topFolders = topFolders
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("getting note statistics", ex.Message);
        }
    }
}
