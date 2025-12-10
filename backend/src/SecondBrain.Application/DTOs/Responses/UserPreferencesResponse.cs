namespace SecondBrain.Application.DTOs.Responses;

public class UserPreferencesResponse
{
    public string? ChatProvider { get; set; }
    public string? ChatModel { get; set; }
    public string VectorStoreProvider { get; set; } = "PostgreSQL";
    public string DefaultNoteView { get; set; } = "list";
    public int ItemsPerPage { get; set; } = 20;
    public string FontSize { get; set; } = "medium";
    public bool EnableNotifications { get; set; } = true;
    public string? OllamaRemoteUrl { get; set; }
    public bool UseRemoteOllama { get; set; } = false;
    public string? RerankingProvider { get; set; }

    // Note Summary settings
    public bool NoteSummaryEnabled { get; set; } = true;
    public string? NoteSummaryProvider { get; set; } = "OpenAI";
    public string? NoteSummaryModel { get; set; } = "gpt-4o-mini";

    // RAG Feature Toggles
    public bool RagEnableHyde { get; set; } = true;
    public bool RagEnableQueryExpansion { get; set; } = true;
    public bool RagEnableHybridSearch { get; set; } = true;
    public bool RagEnableReranking { get; set; } = true;
    public bool RagEnableAnalytics { get; set; } = true;
}

