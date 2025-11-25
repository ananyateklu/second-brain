export interface AIUsageStats {
    totalConversations: number;
    totalMessages: number;
    ragConversationsCount: number;
    agentConversationsCount: number;
    modelUsageCounts: Record<string, number>;
    providerUsageCounts: Record<string, number>;
    modelTokenUsageCounts: Record<string, number>;
    dailyConversationCounts: Record<string, number>;
    dailyRagConversationCounts: Record<string, number>;
    dailyNonRagConversationCounts: Record<string, number>;
    dailyAgentConversationCounts: Record<string, number>;
    dailyNonAgentConversationCounts: Record<string, number>;
}

