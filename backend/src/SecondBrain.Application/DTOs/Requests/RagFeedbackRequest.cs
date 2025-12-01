using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request to submit feedback for a RAG query
/// </summary>
public class RagFeedbackRequest
{
    /// <summary>
    /// The RAG query log ID to associate feedback with
    /// </summary>
    [Required]
    public Guid LogId { get; set; }

    /// <summary>
    /// User feedback: 'thumbs_up' or 'thumbs_down'
    /// </summary>
    [Required]
    [RegularExpression("^(thumbs_up|thumbs_down)$", ErrorMessage = "Feedback must be 'thumbs_up' or 'thumbs_down'")]
    public string Feedback { get; set; } = string.Empty;

    /// <summary>
    /// Optional category for the feedback: 'wrong_info', 'missing_context', 'irrelevant', 'other'
    /// </summary>
    [RegularExpression("^(wrong_info|missing_context|irrelevant|slow_response|other)?$", 
        ErrorMessage = "Category must be 'wrong_info', 'missing_context', 'irrelevant', 'slow_response', or 'other'")]
    public string? Category { get; set; }

    /// <summary>
    /// Optional comment providing additional context
    /// </summary>
    [MaxLength(1000)]
    public string? Comment { get; set; }
}

