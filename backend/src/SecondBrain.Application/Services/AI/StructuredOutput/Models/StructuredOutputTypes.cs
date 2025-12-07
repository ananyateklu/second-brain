using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Models;

/// <summary>
/// Note analysis result for extracting structured information from notes.
/// </summary>
public class NoteAnalysis
{
    /// <summary>
    /// Extracted or suggested title for the note.
    /// </summary>
    [Description("Extracted or suggested title for the note")]
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Brief summary of the note content (1-3 sentences).
    /// </summary>
    [Description("Brief summary of the note content (1-3 sentences)")]
    [Required]
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// Relevant tags for categorization (3-7 tags).
    /// </summary>
    [Description("Relevant tags for categorization (3-7 tags)")]
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Overall sentiment of the note.
    /// </summary>
    [Description("Overall sentiment: positive, negative, or neutral")]
    public string Sentiment { get; set; } = "neutral";

    /// <summary>
    /// Key points or main ideas from the note.
    /// </summary>
    [Description("Key points or main ideas from the note")]
    public List<string> KeyPoints { get; set; } = new();

    /// <summary>
    /// Suggested folder or category for organization.
    /// </summary>
    [Description("Suggested folder or category for organization")]
    public string? SuggestedFolder { get; set; }
}

/// <summary>
/// Query intent classification for routing and feature enablement.
/// </summary>
public class QueryIntent
{
    /// <summary>
    /// Type of query being performed.
    /// </summary>
    [Description("Type of query: search, create, update, delete, question, analyze, summarize, compare")]
    [Required]
    public string IntentType { get; set; } = string.Empty;

    /// <summary>
    /// Entities mentioned in the query.
    /// </summary>
    [Description("Named entities mentioned in the query (people, places, topics, etc.)")]
    public List<string> Entities { get; set; } = new();

    /// <summary>
    /// Whether RAG (Retrieval-Augmented Generation) should be used.
    /// </summary>
    [Description("Whether the query would benefit from retrieving relevant notes")]
    public bool RequiresRAG { get; set; }

    /// <summary>
    /// Whether agent tools should be used.
    /// </summary>
    [Description("Whether the query requires agent tools (notes manipulation, web search, etc.)")]
    public bool RequiresTools { get; set; }

    /// <summary>
    /// Specific tools that may be needed.
    /// </summary>
    [Description("Specific tools that may be needed: search_notes, create_note, update_note, delete_note, web_search")]
    public List<string> SuggestedTools { get; set; } = new();

    /// <summary>
    /// Confidence score for the classification (0.0-1.0).
    /// </summary>
    [Description("Confidence score for the classification (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }

    /// <summary>
    /// Brief explanation of the classification.
    /// </summary>
    [Description("Brief explanation of why this classification was chosen")]
    public string? Reasoning { get; set; }
}

/// <summary>
/// Data extraction result for parsing documents into structured data.
/// </summary>
public class ExtractedData
{
    /// <summary>
    /// Key-value pairs of extracted fields.
    /// </summary>
    [Description("Key-value pairs of extracted fields")]
    public Dictionary<string, string> Fields { get; set; } = new();

    /// <summary>
    /// List of extracted entities with their types and positions.
    /// </summary>
    [Description("List of extracted entities with their types and positions")]
    public List<ExtractedEntity> Entities { get; set; } = new();

    /// <summary>
    /// Overall confidence in the extraction (0.0-1.0).
    /// </summary>
    [Description("Overall confidence in the extraction (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }
}

/// <summary>
/// A single extracted entity from text.
/// </summary>
public class ExtractedEntity
{
    /// <summary>
    /// The type of entity (person, organization, date, location, etc.).
    /// </summary>
    [Description("The type of entity: person, organization, date, location, money, percentage, etc.")]
    [Required]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// The extracted value.
    /// </summary>
    [Description("The extracted value")]
    [Required]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Start character index in the original text.
    /// </summary>
    [Description("Start character index in the original text")]
    public int? StartIndex { get; set; }

    /// <summary>
    /// End character index in the original text.
    /// </summary>
    [Description("End character index in the original text")]
    public int? EndIndex { get; set; }

    /// <summary>
    /// Confidence in this specific extraction (0.0-1.0).
    /// </summary>
    [Description("Confidence in this specific extraction (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }
}

/// <summary>
/// Summary generation result.
/// </summary>
public class ContentSummary
{
    /// <summary>
    /// One-line summary (title-like).
    /// </summary>
    [Description("One-line summary, like a title")]
    [Required]
    public string OneLiner { get; set; } = string.Empty;

    /// <summary>
    /// Short paragraph summary (2-4 sentences).
    /// </summary>
    [Description("Short paragraph summary (2-4 sentences)")]
    [Required]
    public string ShortSummary { get; set; } = string.Empty;

    /// <summary>
    /// Detailed summary with key points.
    /// </summary>
    [Description("Detailed summary with key points")]
    public string DetailedSummary { get; set; } = string.Empty;

    /// <summary>
    /// Main topics covered.
    /// </summary>
    [Description("Main topics covered in the content")]
    public List<string> Topics { get; set; } = new();

    /// <summary>
    /// Key takeaways or action items.
    /// </summary>
    [Description("Key takeaways or action items")]
    public List<string> KeyTakeaways { get; set; } = new();
}

/// <summary>
/// Comparison result for comparing multiple items.
/// </summary>
public class ComparisonResult
{
    /// <summary>
    /// Items being compared.
    /// </summary>
    [Description("Names or identifiers of items being compared")]
    public List<string> Items { get; set; } = new();

    /// <summary>
    /// Similarities between the items.
    /// </summary>
    [Description("Similarities found between the items")]
    public List<string> Similarities { get; set; } = new();

    /// <summary>
    /// Differences between the items.
    /// </summary>
    [Description("Differences found between the items")]
    public List<string> Differences { get; set; } = new();

    /// <summary>
    /// Overall similarity score (0.0-1.0).
    /// </summary>
    [Description("Overall similarity score (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float SimilarityScore { get; set; }

    /// <summary>
    /// Recommendation or conclusion.
    /// </summary>
    [Description("Recommendation or conclusion based on the comparison")]
    public string? Recommendation { get; set; }
}

/// <summary>
/// Classification result for categorizing content.
/// </summary>
public class Classification
{
    /// <summary>
    /// Primary category.
    /// </summary>
    [Description("Primary category for the content")]
    [Required]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Secondary categories if applicable.
    /// </summary>
    [Description("Secondary categories if applicable")]
    public List<string> SecondaryCategories { get; set; } = new();

    /// <summary>
    /// Confidence in the classification (0.0-1.0).
    /// </summary>
    [Description("Confidence in the classification (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }

    /// <summary>
    /// Reasoning for the classification.
    /// </summary>
    [Description("Brief explanation of why this classification was chosen")]
    public string? Reasoning { get; set; }
}

/// <summary>
/// Question answering result with source citations.
/// </summary>
public class AnswerWithSources
{
    /// <summary>
    /// The answer to the question.
    /// </summary>
    [Description("Direct answer to the question")]
    [Required]
    public string Answer { get; set; } = string.Empty;

    /// <summary>
    /// Confidence in the answer (0.0-1.0).
    /// </summary>
    [Description("Confidence in the answer (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }

    /// <summary>
    /// Sources that support the answer.
    /// </summary>
    [Description("Sources or references that support the answer")]
    public List<AnswerSource> Sources { get; set; } = new();

    /// <summary>
    /// Whether the question can be fully answered from available information.
    /// </summary>
    [Description("Whether the question can be fully answered from available information")]
    public bool IsComplete { get; set; }

    /// <summary>
    /// Additional context or caveats.
    /// </summary>
    [Description("Additional context or caveats about the answer")]
    public string? AdditionalContext { get; set; }
}

/// <summary>
/// A source reference for an answer.
/// </summary>
public class AnswerSource
{
    /// <summary>
    /// Title or name of the source.
    /// </summary>
    [Description("Title or name of the source")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Relevant excerpt from the source.
    /// </summary>
    [Description("Relevant excerpt from the source")]
    public string? Excerpt { get; set; }

    /// <summary>
    /// Source identifier (note ID, URL, etc.).
    /// </summary>
    [Description("Source identifier (note ID, URL, etc.)")]
    public string? SourceId { get; set; }

    /// <summary>
    /// Relevance of this source (0.0-1.0).
    /// </summary>
    [Description("Relevance of this source to the answer (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Relevance { get; set; }
}

// ============================================================================
// RAG Pipeline Types
// ============================================================================

/// <summary>
/// Relevance score result for RAG reranking.
/// Used by RerankerService to get reliable relevance scores from AI.
/// </summary>
public class RelevanceScoreResult
{
    /// <summary>
    /// Relevance score from 0 to 10.
    /// </summary>
    [Description("Relevance score from 0 (completely irrelevant) to 10 (highly relevant and directly answers the query)")]
    [Range(0, 10)]
    [Required]
    public float Score { get; set; }

    /// <summary>
    /// Brief reasoning for the score.
    /// </summary>
    [Description("Brief explanation of why this relevance score was assigned")]
    public string? Reasoning { get; set; }
}

/// <summary>
/// Topic label result for query clustering.
/// Used by TopicClusteringService to generate consistent topic labels.
/// </summary>
public class TopicLabelResult
{
    /// <summary>
    /// Short topic label (2-4 words).
    /// </summary>
    [Description("Short descriptive topic label (2-4 words) that captures the common theme")]
    [Required]
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Confidence in the label (0.0-1.0).
    /// </summary>
    [Description("Confidence in the topic label (0.0 to 1.0)")]
    [Range(0.0, 1.0)]
    public float Confidence { get; set; }

    /// <summary>
    /// Keywords associated with this topic.
    /// </summary>
    [Description("Key terms or concepts that define this topic")]
    public List<string> Keywords { get; set; } = new();
}

/// <summary>
/// Multi-query expansion result.
/// Used by QueryExpansionService to generate alternative query phrasings.
/// </summary>
public class MultiQueryResult
{
    /// <summary>
    /// List of alternative query phrasings.
    /// </summary>
    [Description("Alternative phrasings of the original query that capture different aspects or wordings")]
    [Required]
    public List<string> Queries { get; set; } = new();

    /// <summary>
    /// Brief explanation of how queries differ.
    /// </summary>
    [Description("Brief explanation of how each query variation differs from the original")]
    public string? Explanation { get; set; }
}

/// <summary>
/// HyDE (Hypothetical Document Embeddings) result.
/// Used by QueryExpansionService to generate hypothetical documents for better retrieval.
/// </summary>
public class HyDEDocumentResult
{
    /// <summary>
    /// Hypothetical document that would answer the query.
    /// </summary>
    [Description("A detailed paragraph that would appear in a document that directly answers the query")]
    [Required]
    public string Document { get; set; } = string.Empty;

    /// <summary>
    /// Key concepts covered in the document.
    /// </summary>
    [Description("Key concepts, terms, and topics covered in the hypothetical document")]
    public List<string> KeyConcepts { get; set; } = new();

    /// <summary>
    /// Type of document generated.
    /// </summary>
    [Description("The type of document this represents (e.g., 'technical documentation', 'tutorial', 'research paper')")]
    public string? DocumentType { get; set; }
}
