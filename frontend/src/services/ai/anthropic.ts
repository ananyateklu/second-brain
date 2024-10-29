import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../../services/api/api';

export class AnthropicService {
  private isEnabled = false;

  async testConnection(): Promise<boolean> {
    try {
      const response = await api.get('/api/Claude/test-connection');
      this.isEnabled = response.data.isConnected;
      return response.data.isConnected;
    } catch (error) {
      console.error('Error testing Claude connection:', error);
      return false;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    // API key is managed on the backend, just test the connection
    return this.testConnection();
  }

  async sendMessage(message: string, modelId: string): Promise<AIResponse> {
    try {
      const request = {
        model: modelId,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        tools: [
          {
            name: "generate_content",
            description: "Generates detailed content (description) based on the provided title and/or tags. Use this tool whenever you need to expand a title or tags into full content.",
            input_schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the note, idea, task, or reminder."
                },
                tags: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "A list of tags associated with the item."
                }
              },
              required: []
            }
          },
          {
            name: "generate_title",
            description: "Generates a concise and relevant title based on the provided content and/or tags. Use this tool whenever you need to create a title from content or tags.",
            input_schema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "The content (description) of the note, idea, task, or reminder."
                },
                tags: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "A list of tags associated with the item."
                }
              },
              required: []
            }
          },
          {
            name: "generate_tags",
            description: "Generates a list of relevant tags based on the provided title and/or content. Use this tool whenever you need to identify key themes or topics.",
            input_schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the note, idea, task, or reminder."
                },
                content: {
                  type: "string",
                  description: "The content (description) of the item."
                }
              },
              required: []
            }
          }
        ]
      };

      console.log('Sending request to backend:', request);

      const response = await api.post('/api/Claude/send', request);

      console.log('Received response from backend:', response.data);

      // Process the response to extract the assistant's reply
      const assistantContent = response.data.content;
      let finalContent = '';

      // Process content blocks
      for (const contentBlock of assistantContent) {
        console.log('Processing content block:', contentBlock);
        if (contentBlock.type === 'text') {
          finalContent += contentBlock.text;
        } else if (contentBlock.type === 'tool_use') {
          console.log('Assistant is attempting to use a tool:', contentBlock.name);
        } else if (contentBlock.type === 'tool_result') {
          console.log('Received tool result:', contentBlock);
        }
        // Handle other content types if necessary
      }

      return {
        content: finalContent,
        type: 'text',
        metadata: {
          model: modelId,
          usage: {
            input_tokens: response.data.usage?.input_tokens || 0,
            output_tokens: response.data.usage?.output_tokens || 0,
          },
        },
      };
    } catch (error) {
      console.error('Error communicating with Claude API:', error);
      throw new Error('Failed to get response from Claude.');
    }
  }

  async generateMissingFields(modelId: string, contextData: any): Promise<AIResponse> {
    try {
      const request = {
        model: modelId,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: "Please generate the missing fields based on the provided information."
          }
        ],
        tools: [
          // Include the same tool definitions as in the backend
        ]
      };

      // Attach context data as a message
      request.messages.push({
        role: "user",
        content: `Context Data: ${JSON.stringify(contextData)}`
      });

      console.log('Sending request to backend:', request);

      const response = await api.post('/api/Claude/send', request);

      console.log('Received response from backend:', response.data);

      // Process the response to extract the generated data
      const assistantContent = response.data.content;
      let generatedData: any = {};

      for (const contentBlock of assistantContent) {
        // Handle text content
        if (contentBlock.type === 'text') {
          // Assuming Claude returns JSON in text block
          try {
            const data = JSON.parse(contentBlock.text);
            generatedData = { ...generatedData, ...data };
          } catch (e) {
            console.error('Failed to parse assistant response:', e);
          }
        }
        // Handle other content types if necessary
      }

      return {
        content: JSON.stringify(generatedData),
        type: 'text',
        metadata: {
          model: modelId,
          usage: {
            input_tokens: response.data.usage?.input_tokens || 0,
            output_tokens: response.data.usage?.output_tokens || 0,
          },
        },
      };
    } catch (error) {
      console.error('Error generating missing fields:', error);
      throw new Error('Failed to generate missing fields.');
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'anthropic');
  }
}
