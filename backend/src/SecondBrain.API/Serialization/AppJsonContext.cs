using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.API.Serialization;

/// <summary>
/// Source-generated JSON serializer context for improved performance.
/// Uses compile-time code generation for faster serialization with lower allocations.
/// </summary>
/// <remarks>
/// Note: We intentionally exclude types that reference entity classes with duplicate names
/// (ChatCompletionRequest, ChatResponseWithRag) to avoid SYSLIB1031 warnings about
/// ChatMessage/MessageImage type name collisions between Application.Services.AI.Models
/// and Core.Entities namespaces. These types will use reflection-based serialization.
/// </remarks>
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false)]
// Note responses
[JsonSerializable(typeof(NoteResponse))]
[JsonSerializable(typeof(NoteResponse[]))]
[JsonSerializable(typeof(List<NoteResponse>))]
[JsonSerializable(typeof(IEnumerable<NoteResponse>))]
// Note list responses (lightweight, with summary instead of content)
[JsonSerializable(typeof(NoteListResponse))]
[JsonSerializable(typeof(NoteListResponse[]))]
[JsonSerializable(typeof(List<NoteListResponse>))]
[JsonSerializable(typeof(IEnumerable<NoteListResponse>))]
// Note requests
[JsonSerializable(typeof(CreateNoteRequest))]
[JsonSerializable(typeof(UpdateNoteRequest))]
[JsonSerializable(typeof(BulkDeleteNotesRequest))]
[JsonSerializable(typeof(ImportNoteRequest))]
[JsonSerializable(typeof(ImportNoteRequest[]))]
[JsonSerializable(typeof(List<ImportNoteRequest>))]
// Note import responses
[JsonSerializable(typeof(ImportNotesResponse))]
[JsonSerializable(typeof(ImportNoteResult))]
[JsonSerializable(typeof(List<ImportNoteResult>))]
// Note summary generation
[JsonSerializable(typeof(GenerateSummariesRequest))]
[JsonSerializable(typeof(GenerateSummariesResponse))]
[JsonSerializable(typeof(SummaryGenerationResult))]
[JsonSerializable(typeof(List<SummaryGenerationResult>))]
// Note version responses (PostgreSQL 18 temporal)
[JsonSerializable(typeof(NoteVersionResponse))]
[JsonSerializable(typeof(NoteVersionResponse[]))]
[JsonSerializable(typeof(List<NoteVersionResponse>))]
[JsonSerializable(typeof(IEnumerable<NoteVersionResponse>))]
[JsonSerializable(typeof(NoteVersionHistoryResponse))]
[JsonSerializable(typeof(NoteVersionDiffResponse))]
// Chat conversation requests (excluding types with entity references)
[JsonSerializable(typeof(CreateConversationRequest))]
[JsonSerializable(typeof(SendMessageRequest))]
[JsonSerializable(typeof(UpdateConversationSettingsRequest))]
[JsonSerializable(typeof(BulkDeleteConversationsRequest))]
// Chat session responses (PostgreSQL 18 temporal)
[JsonSerializable(typeof(ChatSessionResponse))]
[JsonSerializable(typeof(ChatSessionResponse[]))]
[JsonSerializable(typeof(List<ChatSessionResponse>))]
[JsonSerializable(typeof(IEnumerable<ChatSessionResponse>))]
// Image generation
[JsonSerializable(typeof(GenerateImageRequest))]
[JsonSerializable(typeof(ImageGenerationResponse))]
[JsonSerializable(typeof(ImageGenerationResponse[]))]
[JsonSerializable(typeof(List<ImageGenerationResponse>))]
// AI health
[JsonSerializable(typeof(AIHealthResponse))]
[JsonSerializable(typeof(AIProviderHealth))]
[JsonSerializable(typeof(AIProviderHealth[]))]
[JsonSerializable(typeof(List<AIProviderHealth>))]
[JsonSerializable(typeof(IEnumerable<AIProviderHealth>))]
[JsonSerializable(typeof(ProviderInfo))]
[JsonSerializable(typeof(List<ProviderInfo>))]
// RAG context
[JsonSerializable(typeof(RagContextResponse))]
[JsonSerializable(typeof(RagContextResponse[]))]
[JsonSerializable(typeof(List<RagContextResponse>))]
// RAG analytics
[JsonSerializable(typeof(RagPerformanceStatsResponse))]
[JsonSerializable(typeof(RagQueryLogResponse))]
[JsonSerializable(typeof(RagQueryLogResponse[]))]
[JsonSerializable(typeof(List<RagQueryLogResponse>))]
[JsonSerializable(typeof(RagQueryLogsResponse))]
[JsonSerializable(typeof(TopicStatsResponse))]
[JsonSerializable(typeof(TopicStatsResponse[]))]
[JsonSerializable(typeof(List<TopicStatsResponse>))]
[JsonSerializable(typeof(TopicAnalyticsResponse))]
[JsonSerializable(typeof(RagFeedbackRequest))]
// AI usage stats
[JsonSerializable(typeof(AIUsageStatsResponse))]
// User preferences
[JsonSerializable(typeof(UserPreferencesResponse))]
[JsonSerializable(typeof(UpdateUserPreferencesRequest))]
// User
[JsonSerializable(typeof(UserResponse))]
// Suggested prompts
[JsonSerializable(typeof(SuggestedPromptsResponse))]
[JsonSerializable(typeof(GenerateSuggestedPromptsRequest))]
// Tool call analytics (PostgreSQL 18 JSON_TABLE)
[JsonSerializable(typeof(ToolCallAnalyticsResponse))]
[JsonSerializable(typeof(ToolUsageStats))]
[JsonSerializable(typeof(List<ToolUsageStats>))]
[JsonSerializable(typeof(ToolActionStats))]
[JsonSerializable(typeof(List<ToolActionStats>))]
[JsonSerializable(typeof(ToolErrorStats))]
[JsonSerializable(typeof(List<ToolErrorStats>))]
// Indexing responses
[JsonSerializable(typeof(IndexStatsResponse))]
[JsonSerializable(typeof(IndexStatsData))]
[JsonSerializable(typeof(IndexingJobResponse))]
[JsonSerializable(typeof(IndexingJobResponse[]))]
[JsonSerializable(typeof(List<IndexingJobResponse>))]
// Summary job responses
[JsonSerializable(typeof(SummaryJobResponse))]
[JsonSerializable(typeof(SummaryJobResponse[]))]
[JsonSerializable(typeof(List<SummaryJobResponse>))]
// Error responses
[JsonSerializable(typeof(ErrorResponse))]
[JsonSerializable(typeof(ApiResponse<object>))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSerializable(typeof(ValidationProblemDetails))]
// Common types
[JsonSerializable(typeof(Dictionary<string, object>))]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSerializable(typeof(Dictionary<string, int>))]
[JsonSerializable(typeof(Dictionary<string, long>))]
[JsonSerializable(typeof(Dictionary<string, Dictionary<string, int>>))]
[JsonSerializable(typeof(Dictionary<string, Dictionary<string, long>>))]
[JsonSerializable(typeof(List<string>))]
[JsonSerializable(typeof(string[]))]
[JsonSerializable(typeof(System.Text.Json.JsonElement))]
[JsonSerializable(typeof(System.Text.Json.JsonElement?))]
// Health check response
[JsonSerializable(typeof(HealthCheckResponse))]
[JsonSerializable(typeof(HealthCheckEntry))]
[JsonSerializable(typeof(List<HealthCheckEntry>))]
public partial class AppJsonContext : JsonSerializerContext
{
}

/// <summary>
/// Health check response for JSON serialization
/// </summary>
public class HealthCheckResponse
{
    public string Status { get; set; } = string.Empty;
    public double Duration { get; set; }
    public List<HealthCheckEntry> Checks { get; set; } = new();
}

/// <summary>
/// Individual health check entry
/// </summary>
public class HealthCheckEntry
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public double Duration { get; set; }
    public string? Description { get; set; }
    public Dictionary<string, object>? Data { get; set; }
    public string? Exception { get; set; }
}
