import { AIModel } from '../../../../../types/ai';
import { AgentConversation, StoredConversation } from '../types';

export const STORAGE_KEY = 'ai_agent_conversations';
export const SELECTED_AGENT_KEY = 'ai_selected_agent';
export const SELECTED_PROVIDER_KEY = 'ai_selected_provider';

export const saveConversationsToStorage = (conversations: AgentConversation[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversations to storage:', error);
    }
};

export const loadConversationsFromStorage = (): AgentConversation[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        
        const parsed = JSON.parse(stored) as StoredConversation[];
        return parsed.map((conv) => ({
            ...conv,
            lastUpdated: new Date(conv.lastUpdated),
            messages: conv.messages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }))
        }));
    } catch (error) {
        console.error('Error loading conversations from storage:', error);
        return [];
    }
};

export const loadSelectedAgentFromStorage = (availableModels: AIModel[]): AIModel | null => {
    try {
        const storedId = localStorage.getItem(SELECTED_AGENT_KEY);
        if (!storedId) return null;
        return availableModels.find(model => model.id === storedId) || null;
    } catch (error) {
        console.error('Error loading selected agent from storage:', error);
        return null;
    }
};

export const loadSelectedProviderFromStorage = (availableProviders: string[]): string | null => {
    try {
        const stored = localStorage.getItem(SELECTED_PROVIDER_KEY);
        return availableProviders.includes(stored || '') ? stored : availableProviders[0] || null;
    } catch (error) {
        console.error('Error loading selected provider from storage:', error);
        return null;
    }
}; 