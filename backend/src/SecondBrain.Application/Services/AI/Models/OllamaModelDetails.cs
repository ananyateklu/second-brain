namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Detailed information about an Ollama model
/// </summary>
public class OllamaModelDetails
{
    /// <summary>
    /// The model name (e.g., "llama3:8b")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The Modelfile content used to create the model
    /// </summary>
    public string? Modelfile { get; set; }

    /// <summary>
    /// The prompt template used by the model
    /// </summary>
    public string? Template { get; set; }

    /// <summary>
    /// License information for the model
    /// </summary>
    public string? License { get; set; }

    /// <summary>
    /// Size of the model in bytes
    /// </summary>
    public long? Size { get; set; }

    /// <summary>
    /// Formatted size string (e.g., "4.7 GB")
    /// </summary>
    public string? SizeFormatted { get; set; }

    /// <summary>
    /// The quantization level (e.g., "Q4_0", "Q8_0")
    /// </summary>
    public string? QuantizationLevel { get; set; }

    /// <summary>
    /// Parameter count (e.g., "8B", "70B")
    /// </summary>
    public string? ParameterSize { get; set; }

    /// <summary>
    /// The model family (e.g., "llama", "mistral")
    /// </summary>
    public string? Family { get; set; }

    /// <summary>
    /// Model format (e.g., "gguf")
    /// </summary>
    public string? Format { get; set; }

    /// <summary>
    /// Additional model parameters
    /// </summary>
    public Dictionary<string, object>? Parameters { get; set; }

    /// <summary>
    /// Model modification time
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// The digest/hash of the model
    /// </summary>
    public string? Digest { get; set; }
}

/// <summary>
/// Result of a model copy operation
/// </summary>
public class OllamaModelCopyResult
{
    /// <summary>
    /// Whether the copy was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the copy failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The source model name
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// The destination model name
    /// </summary>
    public string Destination { get; set; } = string.Empty;
}

/// <summary>
/// Information about an available Ollama model
/// </summary>
public class OllamaModelInfo
{
    /// <summary>
    /// The model name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Size of the model in bytes
    /// </summary>
    public long Size { get; set; }

    /// <summary>
    /// Formatted size string
    /// </summary>
    public string SizeFormatted => FormatSize(Size);

    /// <summary>
    /// Model modification time
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// The digest/hash of the model
    /// </summary>
    public string? Digest { get; set; }

    private static string FormatSize(long bytes)
    {
        if (bytes >= 1_000_000_000)
            return $"{bytes / 1_000_000_000.0:F1} GB";
        if (bytes >= 1_000_000)
            return $"{bytes / 1_000_000.0:F1} MB";
        return $"{bytes / 1_000.0:F1} KB";
    }
}
