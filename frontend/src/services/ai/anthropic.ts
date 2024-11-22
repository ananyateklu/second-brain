import { AIModel, AIResponse } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';

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

  async sendMessage(
    message: string, 
    modelId: string,
    parameters?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    }
  ): Promise<AIResponse> {
    try {
      const isContentSuggestion = this.isContentSuggestionContext();
      
      const tools = isContentSuggestion ? [
        {
          name: "generate_content",
          description: "Generates detailed content based on the provided title and/or tags.",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        {
          name: "generate_title",
          description: "Generates a title based on the provided content and/or tags.",
          input_schema: {
            type: "object",
            properties: {
              content: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        {
          name: "generate_tags",
          description: "Generates relevant tags based on the title and/or content.",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" }
            }
          }
        }
      ] : [];

      const request = {
        model: modelId,
        max_tokens: parameters?.max_tokens ?? 1024,
        temperature: parameters?.temperature ?? 0.7,
        top_p: parameters?.top_p ?? 1,
        messages: [{
          role: "user",
          content: message
        }],
        tools: tools,
        tool_choice: "auto"
      };

      console.log('Sending request to Claude:', request);
      const response = await api.post('/api/Claude/send', request);
      console.log('Received response from Claude:', response.data);

      let finalContent = '';
      const toolResults: any[] = [];

      for (const contentBlock of response.data.content) {
        if (contentBlock.type === 'text') {
          finalContent += contentBlock.text;
        } 
        else if (contentBlock.type === 'tool_use' && isContentSuggestion) {
          console.log('Tool use requested:', contentBlock);
          
          const toolResult = await this.executeTool(
            contentBlock.name,
            contentBlock.input,
            contentBlock.id
          );
          toolResults.push(toolResult);

          const toolResponse = await api.post('/api/Claude/send', {
            ...request,
            messages: [
              ...request.messages,
              {
                role: "user",
                content: [{
                  type: "tool_result",
                  tool_use_id: contentBlock.id,
                  content: toolResult
                }]
              }
            ]
          });

          if (toolResponse.data.content) {
            for (const block of toolResponse.data.content) {
              if (block.type === 'text') {
                finalContent += block.text;
              }
            }
          }
        }
      }

      return {
        content: finalContent,
        type: 'text',
        metadata: {
          model: modelId,
          usage: response.data.usage || {},
          toolResults: isContentSuggestion ? toolResults : undefined
        },
      };
    } catch (error) {
      console.error('Error communicating with Claude:', error);
      throw new Error('Failed to get response from Claude.');
    }
  }

  private isContentSuggestionContext(): boolean {
    // Check if the call is coming from ContentSuggestionService
    const stack = new Error().stack;
    return stack?.includes('ContentSuggestionService') || false;
  }

  private async executeTool(name: string, input: any, toolUseId: string): Promise<any> {
    try {
      // Execute the appropriate tool based on name
      switch (name) {
        case 'generate_content':
          return await this.generateContent(input.title, input.tags);
        case 'generate_title':
          return await this.generateTitle(input.content, input.tags);
        case 'generate_tags':
          return await this.generateTags(input.title, input.content);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      // Return error result
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: `Error executing ${name}: ${error.message}`,
        is_error: true
      };
    }
  }

  // Implement actual tool functions
  private async generateContent(title?: string, tags?: string[]): Promise<string> {
    // Implementation for content generation
    return "Generated content...";
  }

  private async generateTitle(content?: string, tags?: string[]): Promise<string> {
    // Implementation for title generation
    return "Generated title...";
  }

  private async generateTags(title?: string, content?: string): Promise<string[]> {
    // Implementation for tag generation
    return ["tag1", "tag2"];
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

  async isConfigured(): Promise<boolean> {
    try {
      const isConnected = await this.testConnection();
      this.isEnabled = isConnected;
      return isConnected;
    } catch (error) {
      console.error('[AnthropicService] Configuration error:', error);
      this.isEnabled = false;
      return false;
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getModels(): AIModel[] {
    return AI_MODELS.filter(model => model.provider === 'anthropic');
  }
}
