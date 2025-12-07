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
}

