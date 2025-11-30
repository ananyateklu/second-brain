using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Stats;

public class StatsService : IStatsService
{
    private readonly IChatRepository _chatRepository;

    public StatsService(IChatRepository chatRepository)
    {
        _chatRepository = chatRepository;
    }

    public async Task<AIUsageStatsResponse> GetAIUsageStatsAsync(string userId)
    {
        var conversations = await _chatRepository.GetAllAsync(userId);
        var conversationsList = conversations.ToList();

        var stats = new AIUsageStatsResponse
        {
            TotalConversations = conversationsList.Count,
            TotalMessages = conversationsList.Sum(c => c.Messages.Count),
            RagConversationsCount = conversationsList.Count(c => c.RagEnabled),
            AgentConversationsCount = conversationsList.Count(c => c.AgentEnabled),
            ImageGenerationConversationsCount = conversationsList.Count(c => c.ImageGenerationEnabled),
            TotalImagesGenerated = conversationsList.Sum(c => c.Messages.Sum(m => m.GeneratedImages.Count)),
            ModelUsageCounts = conversationsList
                .GroupBy(c => c.Model)
                .Where(g => !string.IsNullOrEmpty(g.Key))
                .ToDictionary(g => g.Key, g => g.Count()),
            ProviderUsageCounts = conversationsList
                .GroupBy(c => c.Provider)
                .Where(g => !string.IsNullOrEmpty(g.Key))
                .ToDictionary(g => g.Key, g => g.Count()),
            ModelTokenUsageCounts = conversationsList
                .GroupBy(c => c.Model)
                .Where(g => !string.IsNullOrEmpty(g.Key))
                .ToDictionary(g => g.Key, g => g.Sum(c => c.Messages.Sum(m => (long)((m.InputTokens ?? 0) + (m.OutputTokens ?? 0))))),
            DailyConversationCounts = conversationsList
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyRagConversationCounts = conversationsList
                .Where(c => c.RagEnabled)
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyNonRagConversationCounts = conversationsList
                .Where(c => !c.RagEnabled)
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyAgentConversationCounts = conversationsList
                .Where(c => c.AgentEnabled)
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyNonAgentConversationCounts = conversationsList
                .Where(c => !c.AgentEnabled)
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyImageGenerationConversationCounts = conversationsList
                .Where(c => c.ImageGenerationEnabled)
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
            DailyModelUsageCounts = conversationsList
                .Where(c => !string.IsNullOrEmpty(c.Model))
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(
                    g => g.Key.ToString("yyyy-MM-dd"),
                    g => g.GroupBy(c => c.Model)
                        .ToDictionary(mg => mg.Key, mg => mg.Count())
                ),
            DailyModelTokenUsageCounts = conversationsList
                .Where(c => !string.IsNullOrEmpty(c.Model))
                .GroupBy(c => c.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToDictionary(
                    g => g.Key.ToString("yyyy-MM-dd"),
                    g => g.GroupBy(c => c.Model)
                        .ToDictionary(mg => mg.Key, mg => mg.Sum(c => c.Messages.Sum(m => (long)((m.InputTokens ?? 0) + (m.OutputTokens ?? 0)))))
                )
        };

        return stats;
    }
}

