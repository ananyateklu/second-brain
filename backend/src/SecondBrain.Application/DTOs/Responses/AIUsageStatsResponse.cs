namespace SecondBrain.Application.DTOs.Responses;

public class AIUsageStatsResponse
{
    public int TotalConversations { get; set; }
    public int TotalMessages { get; set; }
    public int RagConversationsCount { get; set; }
    public int AgentConversationsCount { get; set; }
    public Dictionary<string, int> ModelUsageCounts { get; set; } = new();
    public Dictionary<string, int> ProviderUsageCounts { get; set; } = new();
    public Dictionary<string, long> ModelTokenUsageCounts { get; set; } = new();
    public Dictionary<string, int> DailyConversationCounts { get; set; } = new();
    public Dictionary<string, int> DailyRagConversationCounts { get; set; } = new();
    public Dictionary<string, int> DailyNonRagConversationCounts { get; set; } = new();
    public Dictionary<string, int> DailyAgentConversationCounts { get; set; } = new();
    public Dictionary<string, int> DailyNonAgentConversationCounts { get; set; } = new();
    public Dictionary<string, Dictionary<string, int>> DailyModelUsageCounts { get; set; } = new();
    public Dictionary<string, Dictionary<string, long>> DailyModelTokenUsageCounts { get; set; } = new();
}

