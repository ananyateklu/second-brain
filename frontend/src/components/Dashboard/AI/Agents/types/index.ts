import { AIModel } from '../../../../../types/ai';

export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status: 'sending' | 'sent' | 'error';
    reactions?: string[];
}

export interface AgentConversation {
    id: string;
    messages: AIMessage[];
    model: AIModel;
    isActive: boolean;
    lastUpdated: Date;
    title?: string;
}

export interface StoredConversation extends Omit<AgentConversation, 'lastUpdated' | 'messages'> {
    lastUpdated: string;
    messages: Array<Omit<AIMessage, 'timestamp'> & { timestamp: string }>;
}

export interface SendMessageParams {
    e: React.FormEvent;
    selectedAgent: AIModel | null;
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    setIsSending: (isSending: boolean) => void;
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>;
    sendMessage: (message: string, modelId: string) => Promise<{ content: string; metadata?: any }>;
    isSending: boolean;
    conversations: AgentConversation[];
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status: 'sending' | 'sent' | 'error';
    reactions?: string[];
    metadata?: Record<string, unknown>;
} 