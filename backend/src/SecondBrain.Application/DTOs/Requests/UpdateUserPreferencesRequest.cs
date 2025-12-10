namespace SecondBrain.Application.DTOs.Requests;

public class UpdateUserPreferencesRequest
{
    public string? ChatProvider { get; set; }
    public string? ChatModel { get; set; }
    public string? VectorStoreProvider { get; set; }
    public string? DefaultNoteView { get; set; }
    public int? ItemsPerPage { get; set; }
    public string? FontSize { get; set; }
    public bool? EnableNotifications { get; set; }
    public string? OllamaRemoteUrl { get; set; }
    public bool? UseRemoteOllama { get; set; }
    public string? RerankingProvider { get; set; }

    // Note Summary settings
    public bool? NoteSummaryEnabled { get; set; }
    public string? NoteSummaryProvider { get; set; }
    public string? NoteSummaryModel { get; set; }

    // RAG Feature Toggles
    public bool? RagEnableHyde { get; set; }
    public bool? RagEnableQueryExpansion { get; set; }
    public bool? RagEnableHybridSearch { get; set; }
    public bool? RagEnableReranking { get; set; }
    public bool? RagEnableAnalytics { get; set; }
}

