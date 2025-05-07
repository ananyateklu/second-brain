import api from '../api/api';
import { AIResponse } from '../../types/ai';
import { AgentChat, AgentMessage } from '../../types/agent';

export interface SearchRequest {
    query: string;
    temperature?: number;
    model?: string;
}

export interface SearchResponse {
    result: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model: string;
}

export interface PerplexityMessage {
    role: string;
    content: string;
}

export interface PerplexityRequest {
    model: string;
    messages: PerplexityMessage[];
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface PerplexityResponse {
    id: string;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finishReason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

class PerplexityService {
    // Basic search functionality
    async search(query: string, modelId: string, temperature: number = 0.7): Promise<AIResponse> {
        try {
            const response = await api.post<SearchResponse>('/api/perplexity/search', {
                query,
                model: modelId,
                temperature
            });

            return {
                content: response.data.result,
                type: 'text',
                inputText: query,
                metadata: {
                    model: response.data.model,
                    usage: {
                        input_tokens: response.data.usage.prompt_tokens,
                        output_tokens: response.data.usage.completion_tokens
                    }
                }
            };
        } catch (error) {
            console.error('Perplexity search error:', error);
            throw error;
        }
    }

    // Chat functionality
    async sendMessage(
        message: string,
        modelId: string,
        previousMessages: PerplexityMessage[] = []
    ): Promise<AIResponse> {
        try {
            // Prepare messages for API call
            const messages: PerplexityMessage[] = [
                ...previousMessages,
                { role: 'user', content: message }
            ];

            const response = await api.post<PerplexityResponse>('/api/perplexity/message', {
                model: modelId,
                messages,
                temperature: 0.7 // Default temperature
            });

            const assistantMessage = response.data.choices[0].message;

            return {
                content: assistantMessage.content,
                type: 'text',
                inputText: message,
                metadata: {
                    model: response.data.model,
                    usage: {
                        input_tokens: response.data.usage.prompt_tokens,
                        output_tokens: response.data.usage.completion_tokens
                    }
                }
            };
        } catch (error) {
            console.error('Perplexity chat error:', error);
            throw error;
        }
    }

    // Chat history integration with AgentChats
    async loadChats(): Promise<AgentChat[]> {
        try {
            const response = await api.get('/api/AgentChats');
            // Filter to only include Perplexity model chats
            return response.data.filter((chat: AgentChat) =>
            (chat.chatSource === 'perplexity' ||
                chat.modelId.startsWith('sonar') ||
                chat.modelId.includes('reasoning'))
            );
        } catch (error) {
            console.error('Error loading Perplexity chats:', error);
            throw error;
        }
    }

    async createChat(modelId: string, title?: string, chatSource: string = 'perplexity'): Promise<AgentChat> {
        try {
            // Use the general agent chat endpoint to create a chat
            const response = await api.post('/api/AgentChats', {
                modelId,
                title: title || `Perplexity ${modelId} Chat`,
                chatSource
            });
            return response.data;
        } catch (error) {
            console.error('Error creating Perplexity chat:', error);
            throw error;
        }
    }

    async addMessage(chatId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage> {
        try {
            const response = await api.post(`/api/AgentChats/${chatId}/messages`, message);
            return response.data;
        } catch (error) {
            console.error('Error adding message to Perplexity chat:', error);
            throw error;
        }
    }

    async deleteChat(chatId: string): Promise<void> {
        try {
            await api.delete(`/api/AgentChats/${chatId}`);
        } catch (error) {
            console.error('Error deleting Perplexity chat:', error);
            throw error;
        }
    }

    // Misc functions
    async testConnection(): Promise<boolean> {
        try {
            const response = await api.get('/api/perplexity/test-connection');
            return response.data.isConnected;
        } catch (error) {
            console.error('Perplexity connection test error:', error);
            return false;
        }
    }

    async getAvailableModels() {
        try {
            const response = await api.get('/api/perplexity/models');
            return response.data.models;
        } catch (error) {
            console.error('Failed to fetch Perplexity models:', error);
            return [];
        }
    }
}

const perplexityService = new PerplexityService();
export default perplexityService; 