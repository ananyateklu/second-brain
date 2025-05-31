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
    onStreamUpdate?: (content: string, stats?: { tokenCount: number, tokensPerSecond: string, elapsedSeconds: number }) => void;
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
                case 'function': // Redirect function category models to chat
                    return this.sendChatMessage(message, model, parameters);
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
                // Use streaming if onStreamUpdate callback is provided
                if (parameters?.onStreamUpdate) {
                    return this.sendGeminiStreamingMessage(message, model, parameters);
                }

                // Fallback to regular chat for backward compatibility
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

            case 'ollama': {
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
            type: 'text',
            metadata: {
                model: model.id,
                usage: response.data.usage,
                parameters: {
                    dimensions: embedding.length,
                    responseType: 'embedding'
                }
            },
            executionSteps: []
        };
    }

    private async sendGeminiStreamingMessage(
        message: string,
        model: AIModel,
        parameters: MessageParameters
    ): Promise<AIResponse> {
        const startTime = Date.now();
        let accumulatedContent = '';
        let tokenCount = 0;

        try {
            const request = {
                message,
                modelId: model.id,
                generationConfig: {
                    maxOutputTokens: parameters.maxTokens || 2048,
                    temperature: parameters.temperature || 0.7,
                    topP: 0.8,
                    topK: 40,
                    stopSequences: []
                },
                safetySettings: []
            };

            // Get the authorization token - try multiple sources
            let authHeader = api.defaults.headers.common?.Authorization as string;

            // Fallback to getting token from localStorage if not in api headers
            if (!authHeader) {
                const token = localStorage.getItem('access_token');
                if (token) {
                    authHeader = `Bearer ${token}`;
                }
            }

            if (!authHeader) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${api.defaults.baseURL}/api/gemini/stream-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { value, done } = await reader.read();

                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');

                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);

                            if (data === '[DONE]') {
                                break;
                            }

                            try {
                                const update = JSON.parse(data);
                                if (update.Content) {
                                    accumulatedContent += update.Content;
                                    tokenCount++;

                                    const elapsedSeconds = (Date.now() - startTime) / 1000;
                                    const tokensPerSecond = (tokenCount / elapsedSeconds).toFixed(1);

                                    // Call the streaming update callback
                                    parameters.onStreamUpdate?.(accumulatedContent, {
                                        tokenCount,
                                        tokensPerSecond,
                                        elapsedSeconds
                                    });
                                }
                            } catch (parseError) {
                                console.error('Error parsing SSE data:', parseError);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            return {
                content: accumulatedContent,
                type: 'text',
                metadata: {
                    model: model.id,
                    stats: {
                        tokenCount,
                        totalTimeSeconds: (Date.now() - startTime) / 1000,
                        tokensPerSecond: (tokenCount / ((Date.now() - startTime) / 1000)).toFixed(1),
                        startTime,
                        endTime: Date.now()
                    }
                },
                executionSteps: []
            };
        } catch (error) {
            console.error('Error in streaming request:', error);
            throw error;
        }
    }

    private getProviderEndpoint(provider: string): string {
        switch (provider.toLowerCase()) {
            case 'openai':
                return 'ai/openai';
            case 'anthropic':
                return 'claude';
            case 'gemini':
                return 'gemini';
            case 'ollama':
                return 'ollama';
            case 'grok':
                return 'grok';
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
}

export const messageService = new MessageService(); 