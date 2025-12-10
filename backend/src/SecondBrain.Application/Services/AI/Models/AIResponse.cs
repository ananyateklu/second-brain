namespace SecondBrain.Application.Services.AI.Models;

public class AIResponse
{
    public string Content { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int TokensUsed { get; set; }
    public string Provider { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Detailed token usage information from the provider
    /// </summary>
    public TokenUsageDetails? Usage { get; set; }

    /// <summary>
    /// Grounding sources from Google Search (Gemini only)
    /// </summary>
    public List<GroundingSource>? GroundingSources { get; set; }

    /// <summary>
    /// Code execution result from Python sandbox (Gemini only)
    /// </summary>
    public CodeExecutionResult? CodeExecutionResult { get; set; }

    /// <summary>
    /// Extended thinking/reasoning process (Gemini 2.0+ thinking mode, Claude extended thinking)
    /// </summary>
    public string? ThinkingProcess { get; set; }

    /// <summary>
    /// Function calls requested by the model (for agent/tool use)
    /// </summary>
    public List<FunctionCallInfo>? FunctionCalls { get; set; }

    /// <summary>
    /// Citations from source documents (Claude only, when documents are provided)
    /// </summary>
    public List<Citation>? Citations { get; set; }

    /// <summary>
    /// Cache statistics for prompt caching (Claude only)
    /// </summary>
    public CacheUsageStats? CacheUsage { get; set; }
}

/// <summary>
/// Statistics about prompt cache usage (Claude only)
/// </summary>
public class CacheUsageStats
{
    /// <summary>
    /// Tokens used to create the cache
    /// </summary>
    public int CacheCreationTokens { get; set; }

    /// <summary>
    /// Tokens read from cache (saved from re-processing)
    /// </summary>
    public int CacheReadTokens { get; set; }

    /// <summary>
    /// Estimated cost savings percentage from caching
    /// </summary>
    public decimal SavingsPercent => CacheReadTokens > 0 && (CacheCreationTokens + CacheReadTokens) > 0
        ? Math.Round((decimal)CacheReadTokens / (CacheCreationTokens + CacheReadTokens) * 100, 2)
        : 0;
}

/// <summary>
/// Represents a grounding source from Google Search
/// </summary>
public class GroundingSource
{
    /// <summary>
    /// URL of the source
    /// </summary>
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// Title of the source page
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Relevant snippet from the source
    /// </summary>
    public string? Snippet { get; set; }
}

/// <summary>
/// Result of code execution in Gemini's Python sandbox
/// </summary>
public class CodeExecutionResult
{
    /// <summary>
    /// The executed code
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Programming language (typically "python")
    /// </summary>
    public string Language { get; set; } = "python";

    /// <summary>
    /// Output from code execution
    /// </summary>
    public string Output { get; set; } = string.Empty;

    /// <summary>
    /// Whether execution completed successfully
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if execution failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Information about a function call requested by the model
/// </summary>
public class FunctionCallInfo
{
    /// <summary>
    /// Name of the function to call
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Arguments as JSON string
    /// </summary>
    public string Arguments { get; set; } = "{}";

    /// <summary>
    /// Unique ID for this function call (for matching with results)
    /// </summary>
    public string? Id { get; set; }
}

/// <summary>
/// Information about a function execution result
/// </summary>
public class FunctionResultInfo
{
    /// <summary>
    /// Name of the function that was called
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The result of the execution (usually a Dictionary or primitive)
    /// </summary>
    public object? Result { get; set; }

    /// <summary>
    /// Optional ID matching the call
    /// </summary>
    public string? Id { get; set; }
}

/// <summary>
/// Detailed token usage information from AI providers.
/// Captures actual provider-reported tokens for accurate tracking.
/// </summary>
public class TokenUsageDetails
{
    /// <summary>
    /// Tokens used for the input/prompt (actual from provider)
    /// </summary>
    public int InputTokens { get; set; }

    /// <summary>
    /// Tokens used for the output/response (actual from provider)
    /// </summary>
    public int OutputTokens { get; set; }

    /// <summary>
    /// Total tokens (input + output)
    /// </summary>
    public int TotalTokens => InputTokens + OutputTokens;

    /// <summary>
    /// Whether these are actual provider tokens (true) or estimates (false)
    /// </summary>
    public bool IsActual { get; set; } = true;

    /// <summary>
    /// Tokens used for reasoning/thinking (Claude extended thinking, Gemini thinking mode)
    /// </summary>
    public int? ReasoningTokens { get; set; }

    /// <summary>
    /// Cache-related token usage (Claude prompt caching)
    /// </summary>
    public CacheTokenUsage? CacheUsage { get; set; }

    /// <summary>
    /// RAG context token usage breakdown
    /// </summary>
    public RagTokenUsage? RagUsage { get; set; }

    /// <summary>
    /// Tool/function call token usage for agent mode
    /// </summary>
    public ToolTokenUsage? ToolUsage { get; set; }

    /// <summary>
    /// Create from estimated token counts (fallback when provider doesn't report actual)
    /// </summary>
    public static TokenUsageDetails CreateEstimated(int inputTokens, int outputTokens)
    {
        return new TokenUsageDetails
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            IsActual = false
        };
    }

    /// <summary>
    /// Create from actual provider token counts
    /// </summary>
    public static TokenUsageDetails CreateActual(int inputTokens, int outputTokens)
    {
        return new TokenUsageDetails
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            IsActual = true
        };
    }
}

/// <summary>
/// Cache-related token usage (primarily for Claude prompt caching)
/// </summary>
public class CacheTokenUsage
{
    /// <summary>
    /// Tokens used to create the cache
    /// </summary>
    public int CacheCreationTokens { get; set; }

    /// <summary>
    /// Tokens read from cache (saved from re-processing)
    /// </summary>
    public int CacheReadTokens { get; set; }

    /// <summary>
    /// Estimated cost savings percentage from caching
    /// </summary>
    public decimal SavingsPercent => CacheReadTokens > 0 && (CacheCreationTokens + CacheReadTokens) > 0
        ? Math.Round((decimal)CacheReadTokens / (CacheCreationTokens + CacheReadTokens) * 100, 2)
        : 0;
}

/// <summary>
/// RAG context token usage breakdown
/// </summary>
public class RagTokenUsage
{
    /// <summary>
    /// Tokens used by the RAG context (retrieved notes/chunks)
    /// </summary>
    public int ContextTokens { get; set; }

    /// <summary>
    /// Number of notes/chunks included in context
    /// </summary>
    public int ChunksIncluded { get; set; }

    /// <summary>
    /// Tokens used for RAG prompt formatting/instructions
    /// </summary>
    public int FormattingTokens { get; set; }
}

/// <summary>
/// Tool/function call token usage for agent mode
/// </summary>
public class ToolTokenUsage
{
    /// <summary>
    /// Tokens used for tool definitions/schemas
    /// </summary>
    public int DefinitionTokens { get; set; }

    /// <summary>
    /// Tokens used for tool call arguments
    /// </summary>
    public int ArgumentTokens { get; set; }

    /// <summary>
    /// Tokens used for tool results
    /// </summary>
    public int ResultTokens { get; set; }

    /// <summary>
    /// Number of tool calls made
    /// </summary>
    public int CallCount { get; set; }
}

#region Gemini File Upload Models

/// <summary>
/// Represents an uploaded file in Gemini's file storage
/// </summary>
public class GeminiUploadedFile
{
    /// <summary>
    /// The resource name of the file (e.g., "files/abc123")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The display name of the file
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The MIME type of the file
    /// </summary>
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// The size of the file in bytes
    /// </summary>
    public long SizeBytes { get; set; }

    /// <summary>
    /// The URI to access the file
    /// </summary>
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// The state of the file (PROCESSING, ACTIVE, FAILED)
    /// </summary>
    public string State { get; set; } = string.Empty;

    /// <summary>
    /// When the file was created
    /// </summary>
    public DateTime? CreateTime { get; set; }

    /// <summary>
    /// When the file will expire
    /// </summary>
    public DateTime? ExpirationTime { get; set; }

    /// <summary>
    /// Error message if the file processing failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Whether the file is ready to be used
    /// </summary>
    public bool IsReady => State == "ACTIVE";
}

/// <summary>
/// Request to upload a file to Gemini
/// </summary>
public class GeminiFileUploadRequest
{
    /// <summary>
    /// The file bytes to upload
    /// </summary>
    public byte[]? Bytes { get; set; }

    /// <summary>
    /// The local file path to upload from
    /// </summary>
    public string? FilePath { get; set; }

    /// <summary>
    /// The name to give the file (required when uploading bytes)
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// Optional display name for the file
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Optional MIME type (will be auto-detected if not provided)
    /// </summary>
    public string? MimeType { get; set; }
}

/// <summary>
/// File reference for including in Gemini requests
/// </summary>
public class GeminiFileReference
{
    /// <summary>
    /// The file URI (from uploaded file)
    /// </summary>
    public string FileUri { get; set; } = string.Empty;

    /// <summary>
    /// The MIME type of the file
    /// </summary>
    public string MimeType { get; set; } = string.Empty;

    /// <summary>
    /// Create a file reference from an uploaded file
    /// </summary>
    public static GeminiFileReference FromUploadedFile(GeminiUploadedFile file)
    {
        return new GeminiFileReference
        {
            FileUri = file.Uri,
            MimeType = file.MimeType
        };
    }
}

#endregion
