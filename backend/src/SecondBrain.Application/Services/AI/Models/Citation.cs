namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Represents a citation from Claude's response, referencing specific parts of source documents.
/// Citations provide verifiable attribution for Claude's responses when documents are provided.
/// </summary>
public class Citation
{
    /// <summary>
    /// Identifier of the source document (if provided)
    /// </summary>
    public string? DocumentId { get; set; }

    /// <summary>
    /// Page number within the document (1-indexed)
    /// </summary>
    public int? Page { get; set; }

    /// <summary>
    /// The cited text/passage from the source document
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Character start index within the source content
    /// </summary>
    public int? StartIndex { get; set; }

    /// <summary>
    /// Character end index within the source content
    /// </summary>
    public int? EndIndex { get; set; }

    /// <summary>
    /// Title of the source document (if available)
    /// </summary>
    public string? DocumentTitle { get; set; }

    /// <summary>
    /// Type of citation source: "document", "note", "url"
    /// </summary>
    public string SourceType { get; set; } = "document";
}

/// <summary>
/// Settings for enabling citations in Claude requests
/// </summary>
public class CitationSettings
{
    /// <summary>
    /// Whether citations are enabled for this request
    /// </summary>
    public bool Enabled { get; set; } = false;
}
