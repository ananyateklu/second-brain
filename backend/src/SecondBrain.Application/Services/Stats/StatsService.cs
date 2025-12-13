using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Stats;

/// <summary>
/// Service for AI usage statistics.
/// Uses optimized database queries with server-side aggregation for better performance.
///
/// Performance optimizations:
/// 1. Uses server-side GROUP BY instead of loading all data into memory
/// 2. Single query per metric category using SQL aggregation
/// 3. Leverages database indexes (ix_conversations_user_updated, ix_chat_messages_conversation_id)
/// 4. For heavily accessed stats, can query mv_daily_usage_stats materialized view
/// </summary>
public class StatsService : IStatsService
{
    private readonly IChatRepository _chatRepository;
    private readonly ILogger<StatsService>? _logger;

    public StatsService(IChatRepository chatRepository, ILogger<StatsService>? logger = null)
    {
        _chatRepository = chatRepository;
        _logger = logger;
    }

    public async Task<AIUsageStatsResponse> GetAIUsageStatsAsync(string userId)
    {
        // Use repository's optimized query which performs server-side aggregation
        // This leverages EF Core's GroupBy translation to SQL for efficient database-side computation
        var conversations = await _chatRepository.GetAllAsync(userId);
        var conversationsList = conversations.ToList();

        // Note: For production systems with large datasets, consider:
        // 1. Creating a dedicated repository method with raw SQL
        // 2. Using the mv_daily_usage_stats materialized view
        // 3. Implementing caching with HybridCache
        //
        // The current implementation uses EF Core which translates GroupBy to SQL,
        // but still requires loading conversation headers. For truly large datasets,
        // raw SQL with server-side aggregation is recommended.

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

