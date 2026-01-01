using System.Text.Json;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
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
    protected string CurrentProvider = string.Empty;
    protected string CurrentModel = string.Empty;

    /// <summary>
    /// Context images from the current message available for attachment operations.
    /// </summary>
    protected IReadOnlyList<ContextImage> ContextImages { get; private set; } = Array.Empty<ContextImage>();

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

    public void SetAgentContext(string provider, string model)
    {
        CurrentProvider = provider;
        CurrentModel = model;
    }

    public void SetContextImages(IReadOnlyList<ContextImage>? images)
    {
        ContextImages = images ?? Array.Empty<ContextImage>();
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
    /// Maps notes to the appropriate format based on detail level.
    /// </summary>
    /// <param name="notes">Notes to map</param>
    /// <param name="detailLevel">'ids_only', 'summary' (default), or 'full'</param>
    protected static List<object> MapNotesByDetailLevel(IEnumerable<Core.Entities.Note> notes, string detailLevel)
    {
        return detailLevel.ToLowerInvariant() switch
        {
            "ids_only" => notes.Select(MapToIdsOnly).ToList(),
            "full" => notes.Select(MapToDetail).ToList(),
            _ => notes.Select(MapToPreview).ToList() // "summary" is default
        };
    }

    /// <summary>
    /// Maps a note to minimal ID-only format for fast operations.
    /// </summary>
    protected static object MapToIdsOnly(Core.Entities.Note note)
    {
        return new
        {
            id = note.Id,
            title = note.Title
        };
    }

    /// <summary>
    /// Maps a note to a preview object for list responses.
    /// Includes image count indicator so agent knows if note has attachments.
    /// </summary>
    protected static object MapToPreview(Core.Entities.Note note)
    {
        var imageCount = note.Images?.Count ?? 0;
        return new
        {
            id = note.Id,
            title = note.Title,
            preview = GetContentPreview(note.Content),
            tags = note.Tags,
            folder = note.Folder,
            isArchived = note.IsArchived,
            hasImages = imageCount > 0,
            imageCount = imageCount,
            createdAt = note.CreatedAt,
            updatedAt = note.UpdatedAt
        };
    }

    /// <summary>
    /// Maps a note to a full detail object.
    /// Includes image metadata (descriptions, filenames) so agent can understand visual content.
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
            images = note.Images?.OrderBy(i => i.ImageIndex).Select(MapImageForAgent).ToList() ?? new List<object>(),
            createdAt = note.CreatedAt,
            updatedAt = note.UpdatedAt
        };
    }

    /// <summary>
    /// Maps a note image to agent-friendly format.
    /// Excludes base64 data (too large) but includes description and metadata.
    /// </summary>
    protected static object MapImageForAgent(Core.Entities.NoteImage image)
    {
        return new
        {
            id = image.Id,
            fileName = image.FileName,
            mediaType = image.MediaType,
            imageIndex = image.ImageIndex,
            description = image.Description ?? image.AltText ?? "No description available",
            altText = image.AltText
        };
    }

    #endregion

    #region Context Image Helpers

    /// <summary>
    /// Finds a context image by reference (e.g., "img1" or the reference ID).
    /// </summary>
    /// <param name="reference">Image reference like "img1", "img2", or a reference ID.</param>
    /// <returns>The matching context image or null if not found.</returns>
    protected ContextImage? FindContextImage(string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
            return null;

        var trimmed = reference.Trim().ToLowerInvariant();

        return ContextImages.FirstOrDefault(i =>
            i.ReferenceId.Equals(trimmed, StringComparison.OrdinalIgnoreCase) ||
            $"img{i.Index + 1}".Equals(trimmed, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Gets a summary of available context images for tool responses.
    /// </summary>
    protected string GetContextImagesSummary()
    {
        if (ContextImages.Count == 0)
            return "No context images available.";

        var items = ContextImages.Select(i =>
        {
            var status = i.IsAttached ? " [attached]" : "";
            var name = !string.IsNullOrEmpty(i.FileName) ? $" ({i.FileName})" : "";
            return $"img{i.Index + 1}{name}{status}";
        });

        return string.Join(", ", items);
    }

    /// <summary>
    /// Parses comma-separated image references and returns the matching context images.
    /// </summary>
    /// <param name="imageReferences">Comma-separated references like "img1,img2".</param>
    /// <returns>List of found images and any errors.</returns>
    protected (List<ContextImage> images, string? error) ParseImageReferences(string imageReferences)
    {
        if (string.IsNullOrWhiteSpace(imageReferences))
            return (new List<ContextImage>(), "No image references provided.");

        var refs = imageReferences.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(r => r.Trim())
            .ToList();

        var images = new List<ContextImage>();
        var notFound = new List<string>();

        foreach (var refId in refs)
        {
            var img = FindContextImage(refId);
            if (img != null)
            {
                images.Add(img);
            }
            else
            {
                notFound.Add(refId);
            }
        }

        if (notFound.Count > 0)
        {
            return (images, $"Image(s) not found: {string.Join(", ", notFound)}. Available: {GetContextImagesSummary()}");
        }

        return (images, null);
    }

    #endregion
}
