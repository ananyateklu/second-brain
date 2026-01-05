using System.Text.Json;

namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for creating a new note
/// </summary>
public sealed class CreateNoteRequest
{
    /// <summary>
    /// Title of the note
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Content/body of the note (markdown format for search and display)
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// TipTap/ProseMirror JSON representation of the note content.
    /// This is the canonical format for UI editing - provides consistent
    /// formatting and eliminates lossy conversions between formats.
    /// </summary>
    public JsonElement? ContentJson { get; set; }

    /// <summary>
    /// List of tags associated with the note
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Whether the note is archived
    /// </summary>
    public bool IsArchived { get; set; }

    /// <summary>
    /// Folder/category for the note
    /// </summary>
    public string? Folder { get; set; }

    /// <summary>
    /// Images to attach to the note
    /// </summary>
    public List<NoteImageDto>? Images { get; set; }

    /// <summary>
    /// Source of the change (e.g., "web", "mcp", "agent").
    /// If not provided, defaults to "web".
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// MCP server name when created via MCP (e.g., "second-brain-notes", "pg-docker").
    /// </summary>
    public string? McpServerName { get; set; }
}

