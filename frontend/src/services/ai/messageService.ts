import { AIModel, AIResponse } from '../../types/ai';
import api from '../api/api';

interface Tool {
    name: string;
    type: string;
    description: string;
    parameters?: Record<string, unknown>;
    required_permissions?: string[];
}

interface MessageParameters {
    maxTokens?: number;
    temperature?: number;
    tools?: Tool[];
}

export class MessageService {
    async sendMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        try {
            switch (model.category) {
                case 'chat':
                    return this.sendChatMessage(message, model, parameters);
                case 'function':
                    return this.sendFunctionMessage(message, model, parameters);
                case 'image':
                    return this.sendImageMessage(message, model);
                case 'audio':
                    return this.sendAudioMessage(message, model, parameters);
                case 'rag':
                    return this.sendRAGMessage(message, model, parameters);
                case 'embedding':
                    return this.sendEmbeddingMessage(message, model, parameters);
                default:
                    throw new Error(`Unsupported model category: ${model.category}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    private async sendChatMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        const endpoint = this.getProviderEndpoint(model.provider);
        let response;

        switch (model.provider.toLowerCase()) {
            case 'openai':
                response = await api.post(`/api/${endpoint}/chat`, {
                    model: model.id,
                    messages: [{ role: 'user', content: message }],
                    max_tokens: parameters?.maxTokens ?? 1000,
                    temperature: parameters?.temperature ?? 0.7
                });
                return {
                    content: response.data.choices[0].message.content,
                    type: 'text',
                    metadata: response.data.metadata || {},
                    executionSteps: response.data.metadata?.execution_steps || []
                };

            case 'anthropic': {
                response = await api.post(`/api/${endpoint}/send`, {
                    model: model.id,
                    messages: [{ role: 'user', content: message }],
                    max_tokens: parameters?.maxTokens ?? 1000,
                    temperature: parameters?.temperature ?? 0.7,
                    tools: []
                });
                return {
                    content: response.data.content[0]?.text || '',
                    type: 'text',
                    metadata: {
                        model: model.id,
                        usage: response.data.usage
                    },
                    executionSteps: []
                };
            }

            case 'gemini': {
                response = await api.post(`/api/${endpoint}/chat`, {
                    message,
                    modelId: model.id,
                    maxTokens: parameters?.maxTokens ?? 1000,
                    temperature: parameters?.temperature ?? 0.7
                });

                // Handle nested content structure from Gemini
                const geminiContent = typeof response.data === 'string'
                    ? response.data
                    : typeof response.data.content === 'string'
                        ? response.data.content
                        : response.data.content?.content || '';

                return {
                    content: geminiContent,
                    type: 'text',
                    metadata: response.data.content?.metadata || response.data.metadata || {},
                    executionSteps: response.data.content?.metadata?.execution_steps || response.data.metadata?.execution_steps || []
                };
            }

            case 'llama': {
                response = await api.get(`/api/${endpoint}/stream`, {
                    params: {
                        prompt: message,
                        modelId: model.id
                    }
                });

                // Parse the streamed data response
                const streamData = response.data.split('\n')
                    .filter((line: string) => line.startsWith('data: '))
                    .map((line: string) => line.replace('data: ', ''))
                    .filter((line: string) => line && line !== '{}')
                    .map((line: string) => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter((data: unknown) => data !== null)[0] || {};

                return {
                    content: streamData.Content || '',
                    type: 'text',
                    metadata: {
                        model: model.id,
                        parameters: {
                            timestamp: streamData.Timestamp,
                            type: streamData.Type
                        }
                    },
                    executionSteps: []
                };
            }

            case 'grok': {
                response = await api.post(`/api/${endpoint}/send`, {
                    model: model.id,
                    messages: [{ role: 'user', content: message }],
                    max_tokens: parameters?.maxTokens ?? 1000,
                    temperature: parameters?.temperature ?? 0.7,
                    stream: false
                });
                return {
                    content: response.data.choices[0].message.content,
                    type: 'text',
                    metadata: {
                        model: model.id,
                        usage: response.data.usage
                    },
                    executionSteps: []
                };
            }

            default:
                throw new Error(`Unsupported provider: ${model.provider}`);
        }
    }

    private async sendFunctionMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        const response = await api.post('/api/NexusStorage/execute', {
            prompt: message,
            messageId: Date.now().toString(),
            modelId: model.id,
            maxTokens: parameters?.maxTokens ?? 1000,
            temperature: parameters?.temperature ?? 0.7,
            tools: parameters?.tools ?? []
        });

        return {
            content: response.data.content || '',
            type: 'text',
            metadata: response.data.metadata || {},
            executionSteps: response.data.metadata?.execution_steps || []
        };
    }

    private async sendImageMessage(
        message: string,
        model: AIModel
    ): Promise<AIResponse> {
        const endpoint = this.getProviderEndpoint(model.provider);
        const response = await api.post(`/api/${endpoint}/images/generate`, {
            model: model.id,
            prompt: message,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
        });

        return {
            content: response.data.data[0].url,
            type: 'image',
            metadata: {
                model: model.id,
                prompt: message,
                parameters: {
                    size: "1024x1024",
                    quality: "standard",
                    style: "natural"
                }
            }
        };
    }

    private async sendAudioMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        const endpoint = model.id === 'whisper-1' ? 'transcribe' : 'speech';
        const response = await api.post(`/api/ai/openai/audio/${endpoint}`, {
            text: message,
            modelId: model.id,
            ...parameters
        });

        return {
            content: model.id === 'whisper-1' ? response.data.text || '' : response.data || '',
            type: 'audio',
            metadata: response.data.metadata || {}
        };
    }

    private async sendRAGMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        const response = await api.post('/api/AIAgents/execute', {
            prompt: message,
            modelId: model.id,
            maxTokens: parameters?.maxTokens ?? 1000,
            temperature: parameters?.temperature ?? 0.7
        });

        return {
            content: response.data.content || '',
            type: 'text',
            metadata: response.data.metadata || {},
            executionSteps: response.data.metadata?.execution_steps || []
        };
    }

    private async sendEmbeddingMessage(
        message: string,
        model: AIModel,
        parameters?: MessageParameters
    ): Promise<AIResponse> {
        const endpoint = this.getProviderEndpoint(model.provider);
        const response = await api.post(`/api/${endpoint}/embeddings`, {
            input: message,
            model: model.id,
            encoding_format: 'float',
            ...parameters
        });

        // Handle different response formats from different providers
        let embedding;
        if (Array.isArray(response.data)) {
            embedding = response.data;
        } else if (response.data.data?.[0]?.embedding) {
            embedding = response.data.data[0].embedding;
        } else if (response.data.embeddings) {
            embedding = response.data.embeddings;
        } else {
            throw new Error('Invalid embedding response format');
        }

        return {
            content: JSON.stringify(embedding),
            type: 'embedding',
            metadata: {
                model: model.id,
                usage: response.data.usage,
                parameters: {
                    dimensions: embedding.length
                }
            },
            executionSteps: []
        };
    }

    private getProviderEndpoint(provider: string): string {
        switch (provider.toLowerCase()) {
            case 'openai':
                return 'ai/openai';
            case 'anthropic':
                return 'claude';
            case 'gemini':
                return 'gemini';
            case 'llama':
                return 'llama';
            case 'grok':
                return 'grok';
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
}

export const messageService = new MessageService(); 