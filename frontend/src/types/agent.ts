export interface AgentChat {
    id: string;
    modelId: string;
    title: string;
    lastUpdated: string;
    isActive: boolean;
    messages: AgentMessage[];
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    status: 'sending' | 'sent' | 'error';
    reactions?: string[];
    metadata?: Record<string, unknown>;
} 