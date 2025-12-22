using System.Text.Json;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Base class for note-related plugins providing shared infrastructure,
/// dependencies, and helper methods.
/// </summary>
public abstract class NotePluginBase : IAgentPlugin
{
    /// <summary>
    /// Repository for read operations (thread-safe for concurrent agent operations).
    /// </summary>
    protected readonly IParallelNoteRepository NoteRepository;

    /// <summary>
    /// Service for mutation operations (Create, Update, Delete).
    /// All mutations MUST use this service for consistent version tracking.
    /// </summary>
    protected readonly INoteOperationService? NoteOperationService;

    protected readonly IRagService? RagService;
    protected readonly IStructuredOutputService? StructuredOutputService;
    protected readonly RagSettings? RagSettings;

    protected string CurrentUserId = string.Empty;
    protected bool AgentRagEnabled = false;
    protected RagOptions? UserRagOptions;

    /// <summary>
    /// Maximum length for content preview in list operations.
    /// </summary>
    protected const int MaxPreviewLength = 200;

    protected NotePluginBase(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
    {
        NoteRepository = noteRepository;
        RagService = ragService;
        RagSettings = ragSettings;
        StructuredOutputService = structuredOutputService;
        NoteOperationService = noteOperationService;
    }

    #region IAgentPlugin Implementation

    public abstract string CapabilityId { get; }
    public abstract string DisplayName { get; }
    public abstract string Description { get; }

    public void SetCurrentUserId(string userId)
    {
        CurrentUserId = userId;
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        AgentRagEnabled = enabled;
    }

    public void SetRagOptions(RagOptions? options)
    {
        UserRagOptions = options;
    }

    public virtual object GetPluginInstance() => this;

    public abstract string GetPluginName();

    public abstract string GetSystemPromptAddition();

    #endregion

    #region Shared Helper Methods

    /// <summary>
    /// Validates that a user context is set.
    /// </summary>
    /// <returns>Error message if not set, null if valid.</returns>
    protected string? ValidateUserContext()
    {
        return string.IsNullOrEmpty(CurrentUserId)
            ? "Error: User context not set."
            : null;
    }

    /// <summary>
    /// Validates that a user context is set and returns an error message with operation context.
    /// </summary>
    protected string? ValidateUserContext(string operation)
    {
        return string.IsNullOrEmpty(CurrentUserId)
            ? $"Error: User context not set. Cannot {operation}."
            : null;
    }

    /// <summary>
    /// Extracts a preview from note content - first paragraph limited to MaxPreviewLength characters.
    /// Use GetNote tool to read full content.
    /// </summary>
    protected static string GetContentPreview(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return string.Empty;

        // Find the first paragraph (split by double newline or single newline)
        var paragraphBreaks = new[] { "\n\n", "\r\n\r\n", "\n", "\r\n" };
        var firstParagraph = content;

        foreach (var separator in paragraphBreaks)
        {
            var index = content.IndexOf(separator, StringComparison.Ordinal);
            if (index > 0 && index < firstParagraph.Length)
            {
                firstParagraph = content.Substring(0, index);
                break;
            }
        }

        // Trim and limit length
        firstParagraph = firstParagraph.Trim();

        if (firstParagraph.Length <= MaxPreviewLength)
            return firstParagraph;

        // Truncate at word boundary if possible
        var truncated = firstParagraph.Substring(0, MaxPreviewLength);
        var lastSpace = truncated.LastIndexOf(' ');

        if (lastSpace > MaxPreviewLength * 0.7) // Only use word boundary if it's not too far back
            truncated = truncated.Substring(0, lastSpace);

        return truncated + "...";
    }

    /// <summary>
    /// Extracts meaningful content from a raw chunk, skipping metadata lines.
    /// </summary>
    protected static string ExtractContentFromChunk(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return string.Empty;

        var lines = rawContent.Split('\n');
        var contentLines = new List<string>();

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();

            // Skip metadata lines we already display separately
            if (trimmedLine.StartsWith("Title:") ||
                trimmedLine.StartsWith("Tags:") ||
                trimmedLine.StartsWith("Created:") ||
                trimmedLine.StartsWith("Last Updated:") ||
                trimmedLine == "Content:")
            {
                continue;
            }

            // Add any other non-empty lines as content
            if (!string.IsNullOrWhiteSpace(trimmedLine))
            {
                contentLines.Add(trimmedLine);
            }
        }

        return string.Join("\n", contentLines).Trim();
    }

    /// <summary>
    /// Parses relative date strings to DateTime values.
    /// </summary>
    protected static DateTime ParseRelativeDate(string dateStr, DateTime now)
    {
        var lower = dateStr.Trim().ToLowerInvariant();

        return lower switch
        {
            "today" or "now" => now,
            "yesterday" => now.AddDays(-1),
            "last week" or "week ago" => now.AddDays(-7),
            "last month" or "month ago" => now.AddMonths(-1),
            "last year" or "year ago" => now.AddYears(-1),
            _ => DateTime.TryParse(dateStr, out var parsed) ? parsed : now
        };
    }

    /// <summary>
    /// Parses comma-separated tags into a clean list.
    /// </summary>
    protected static List<string> ParseTags(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
            return new List<string>();

        return tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList();
    }

    /// <summary>
    /// Creates a standardized JSON response for note operations.
    /// </summary>
    protected static string CreateNotesResponse(string message, IEnumerable<object> notes)
    {
        var response = new
        {
            type = "notes",
            message = message,
            notes = notes.ToList()
        };

        return JsonSerializer.Serialize(response);
    }

    /// <summary>
    /// Creates a standardized error response.
    /// </summary>
    protected static string CreateErrorResponse(string operation, string message)
    {
        return $"Error {operation}: {message}";
    }

    /// <summary>
    /// Maps a note to a preview object for list responses.
    /// </summary>
    protected static object MapToPreview(Core.Entities.Note note)
    {
        return new
        {
            id = note.Id,
            title = note.Title,
            preview = GetContentPreview(note.Content),
            tags = note.Tags,
            folder = note.Folder,
            isArchived = note.IsArchived,
            createdAt = note.CreatedAt,
            updatedAt = note.UpdatedAt
        };
    }

    /// <summary>
    /// Maps a note to a full detail object.
    /// </summary>
    protected static object MapToDetail(Core.Entities.Note note)
    {
        return new
        {
            id = note.Id,
            title = note.Title,
            content = note.Content,
            tags = note.Tags,
            folder = note.Folder,
            isArchived = note.IsArchived,
            createdAt = note.CreatedAt,
            updatedAt = note.UpdatedAt
        };
    }

    #endregion
}
