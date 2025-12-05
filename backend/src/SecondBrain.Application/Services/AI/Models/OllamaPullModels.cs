namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Request model for pulling (downloading) an Ollama model
/// </summary>
public class OllamaPullRequest
{
    /// <summary>
    /// Name of the model to pull (e.g., "llama3:8b", "codellama:13b")
    /// </summary>
    public required string ModelName { get; set; }

    /// <summary>
    /// Optional remote Ollama server URL. If not provided, uses the default configured URL.
    /// </summary>
    public string? OllamaBaseUrl { get; set; }

    /// <summary>
    /// Whether to allow insecure connections (default: false)
    /// </summary>
    public bool Insecure { get; set; } = false;
}

/// <summary>
/// Progress update for an Ollama model pull operation
/// </summary>
public class OllamaPullProgress
{
    /// <summary>
    /// Current status message (e.g., "pulling manifest", "downloading sha256:abc123", "success")
    /// </summary>
    public required string Status { get; set; }

    /// <summary>
    /// Digest of the current layer being downloaded (if applicable)
    /// </summary>
    public string? Digest { get; set; }

    /// <summary>
    /// Total bytes to download for the current layer
    /// </summary>
    public long? TotalBytes { get; set; }

    /// <summary>
    /// Bytes completed for the current layer
    /// </summary>
    public long? CompletedBytes { get; set; }

    /// <summary>
    /// Calculated percentage complete (0-100)
    /// </summary>
    public double? Percentage { get; set; }

    /// <summary>
    /// Download speed in bytes per second (calculated on frontend or backend)
    /// </summary>
    public double? BytesPerSecond { get; set; }

    /// <summary>
    /// Estimated time remaining in seconds
    /// </summary>
    public double? EstimatedSecondsRemaining { get; set; }

    /// <summary>
    /// Whether the pull operation is complete
    /// </summary>
    public bool IsComplete { get; set; }

    /// <summary>
    /// Whether the operation failed
    /// </summary>
    public bool IsError { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Timestamp of this progress update
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Response model for listing available models from Ollama library
/// </summary>
public class OllamaModelInfo
{
    /// <summary>
    /// Model name (e.g., "llama3")
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Model description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Available tags/versions
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Estimated size in bytes (for the default tag)
    /// </summary>
    public long? SizeBytes { get; set; }

    /// <summary>
    /// Model category (e.g., "language", "code", "vision", "embedding")
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Whether this model is already downloaded locally
    /// </summary>
    public bool IsDownloaded { get; set; }
}













