import { AIModel, AIResponse, AnthropicToolResult, AnthropicResponse, AnthropicGeneratedFields, AccumulatedContext } from '../../types/ai';
import { AI_MODELS } from './models';
import api from '../api/api';
import { agentService } from './agent';

interface RequestParameters {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface AccumulatedContextData {
  title: string;
  content: string;
  tags: string[];
}

interface ContentBlock {
  type: string;
  name?: string;
  id?: string;
  text?: string;
  input?: Record<string, unknown>;
}

interface RequestData {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  messages: Array<{ role: string; content: string | unknown[] }>;
  tools: unknown[];
  tool_choice: string;
}

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

  private getContentSuggestionTools() {
    return [
      {
        name: "generate_content",
        description: "Generates detailed content based on the provided title and/or tags.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
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
            tags: { type: "array", items: { type: "string" } }
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
    ];
  }

  private createInitialRequest(
    message: string,
    modelId: string,
    parameters?: RequestParameters,
    tools: unknown[] = []
  ): RequestData {
    return {
      model: modelId,
      max_tokens: parameters?.max_tokens ?? 1024,
      temperature: parameters?.temperature ?? 0.7,
      top_p: parameters?.top_p ?? 1,
      messages: [{ role: "user", content: message }],
      tools,
      tool_choice: "auto"
    };
  }

  private async handleToolUse(
    contentBlock: ContentBlock,
    accumulatedContext: AccumulatedContextData,
    request: RequestData
  ) {
    const toolResult = await this.executeTool(
      contentBlock.name!,
      { ...contentBlock.input!, accumulatedContext },
      contentBlock.id!
    );

    this.updateAccumulatedContext(accumulatedContext, contentBlock.name!, toolResult.content);

    const toolResponse = await api.post<AnthropicResponse>('/api/Claude/send', {
      ...request,
      messages: [
        ...request.messages,
        { role: "assistant", content: JSON.stringify(accumulatedContext) },
        { role: "user", content: [toolResult] }
      ]
    });

    return { toolResult, toolResponse };
  }

  private updateAccumulatedContext(
    context: AccumulatedContextData,
    toolName: string,
    content: unknown
  ) {
    switch (toolName) {
      case 'generate_content':
        context.content = content as string;
        break;
      case 'generate_title':
        context.title = content as string;
        break;
      case 'generate_tags':
        context.tags = content as string[];
        break;
    }
  }

  private async processContentBlock(
    contentBlock: ContentBlock,
    isContentSuggestion: boolean,
    accumulatedContext: AccumulatedContextData,
    request: RequestData
  ): Promise<{ content: string; toolResult?: AnthropicToolResult }> {
    if (contentBlock.type === 'text') {
      return { content: contentBlock.text ?? '' };
    }

    if (contentBlock.type === 'tool_use' && isContentSuggestion) {
      console.log('Tool use requested:', contentBlock);

      if (contentBlock.input) {
        this.updateAccumulatedContext(accumulatedContext, contentBlock.name!, contentBlock.input);
      }

      const { toolResult, toolResponse } = await this.handleToolUse(
        contentBlock,
        accumulatedContext,
        request
      );

      let content = '';
      if (toolResponse.data.content) {
        content = toolResponse.data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('');
      }

      return { content, toolResult };
    }

    return { content: '' };
  }

  async sendMessage(
    message: string,
    modelId: string,
    parameters?: RequestParameters
  ): Promise<AIResponse> {
    try {
      const isContentSuggestion = this.isContentSuggestionContext();
      const accumulatedContext = { title: '', content: '', tags: [] as string[] };
      const tools = isContentSuggestion ? this.getContentSuggestionTools() : [];
      const request = this.createInitialRequest(message, modelId, parameters, tools);

      console.log('Sending request to Claude:', request);
      const response = await api.post<AnthropicResponse>('/api/Claude/send', request);
      console.log('Received response from Claude:', response.data);

      let finalContent = '';
      const toolResults: AnthropicToolResult[] = [];

      if (response.data.content) {
        for (const block of response.data.content) {
          const { content, toolResult } = await this.processContentBlock(
            block,
            isContentSuggestion,
            accumulatedContext,
            request
          );

          finalContent += content;
          if (toolResult) {
            toolResults.push(toolResult);
          }
        }
      }

      return {
        content: finalContent,
        type: 'text',
        metadata: {
          model: modelId,
          usage: response.data.usage,
          toolResults: isContentSuggestion ? toolResults : undefined,
          context: isContentSuggestion ? accumulatedContext : undefined
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

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    toolUseId: string
  ): Promise<AnthropicToolResult> {
    try {
      let content: unknown;

      // Execute the appropriate tool based on name
      switch (name) {
        case 'generate_content':
          content = await this.generateContent(
            input.title as string,
            input.tags as string[]
          );
          break;
        case 'generate_title':
          content = await this.generateTitle(
            input.content as string,
            input.tags as string[]
          );
          break;
        case 'generate_tags':
          content = await this.generateTags(
            input.title as string,
            input.content as string
          );
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content
      };
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: `Error executing ${name}: ${errorMessage}`,
        is_error: true
      };
    }
  }

  private createContentPrompt(title?: string, tags?: string[]): string {
    const titleLine = title ? `Title: ${title}` : '';
    const tagsLine = tags?.length ? `Tags: ${tags.join(', ')}` : '';

    return `Generate detailed, well-structured content directly:
      ${titleLine}
      ${tagsLine}
      
      Requirements:
      - Start with the main content immediately (no introduction or meta-commentary)
      - Be comprehensive and informative
      - Use clear structure with headers where appropriate
      - Maintain professional tone
      - Stay relevant to the title and tags`;
  }

  private cleanContent(content: string): string {
    return content
      .replace(/^(I'll|Let me|Here's|I will|I have|I've|I can|Sure|Certainly|Here is|Based on|Below is).+?\n/i, '')
      .replace(/^(The following|This|Here are).+?\n/i, '')
      .trim();
  }

  private async generateContent(title?: string, tags?: string[]): Promise<string> {
    try {
      const prompt = this.createContentPrompt(title, tags);
      const response = await this.sendMessage(prompt, 'claude-3-5-haiku-20241022', {
        max_tokens: 1024,
        temperature: 0.7
      });

      return this.cleanContent(response.content);
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content');
    }
  }

  private createTitlePrompt(contextContent?: string, contextTags?: string[]): string {
    const contentLine = contextContent ? `Content: ${contextContent}` : '';
    const tagsLine = contextTags?.length ? `Tags: ${contextTags.join(', ')}` : '';

    return `Generate only a title (no explanation or context):
      ${contentLine}
      ${tagsLine}
      
      Requirements:
      - Respond with only the title text
      - Keep it under 60 characters
      - Make it specific but not verbose
      - Use natural language
      - No explanations or meta-commentary`;
  }

  private createTagsPrompt(title?: string, content?: string): string {
    const titleLine = title ? `Title: ${title}` : '';
    const contentLine = content ? `Content: ${content}` : '';

    return `Generate only tags as a comma-separated list (no explanations):
      ${titleLine}
      ${contentLine}
      
      Requirements:
      - Respond with only the tags, separated by commas
      - Generate 3-5 tags
      - Make tags concise and specific
      - No introductory text or explanations`;
  }

  private cleanTitle(response: string): string {
    return response
      .replace(/^((Here's|Suggested|Proposed|The|A|An) title:?\s*)/i, '')
      .replace(/^["']/g, '')
      .replace(/["']$/g, '')
      .split('\n')[0]
      .trim();
  }

  private cleanAndParseTags(response: string): string[] {
    const cleanedResponse = response
      .replace(/^((Here are|Suggested|Proposed|The|Generated) tags:?\s*)/i, '')
      .replace(/^["']/g, '')
      .replace(/["']$/g, '')
      .split('\n')[0];

    return cleanedResponse
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  private async generateTitle(
    content?: string,
    tags?: string[],
    accumulatedContext?: AccumulatedContext
  ): Promise<string> {
    try {
      const contextContent = accumulatedContext?.content ?? content;
      const contextTags = accumulatedContext?.tags || tags;

      const prompt = this.createTitlePrompt(contextContent, contextTags);
      const response = await this.sendMessage(prompt, 'claude-3-5-haiku-20241022', {
        max_tokens: 100,
        temperature: 0.7
      });

      return this.cleanTitle(response.content);
    } catch (error) {
      console.error('Error generating title:', error);
      throw new Error('Failed to generate title');
    }
  }

  private async generateTags(title?: string, content?: string): Promise<string[]> {
    try {
      const prompt = this.createTagsPrompt(title, content);
      const response = await this.sendMessage(prompt, 'claude-3-5-haiku-20241022', {
        max_tokens: 100,
        temperature: 0.7
      });

      return this.cleanAndParseTags(response.content);
    } catch (error) {
      console.error('Error generating tags:', error);
      throw new Error('Failed to generate tags');
    }
  }

  async generateMissingFields(modelId: string, contextData: Partial<AnthropicGeneratedFields>): Promise<AIResponse> {
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

      const response = await api.post<AnthropicResponse>('/api/Claude/send', request);

      console.log('Received response from backend:', response.data);

      // Process the response to extract the generated data
      const assistantContent = response.data.content;
      let generatedData: AnthropicGeneratedFields = {};

      for (const contentBlock of assistantContent) {
        // Handle text content
        if (contentBlock.type === 'text') {
          // Assuming Claude returns JSON in text block
          try {
            const data = JSON.parse(contentBlock.text!) as Partial<AnthropicGeneratedFields>;
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
      const isConfigured = await agentService.isAnthropicConfigured();
      this.isEnabled = isConfigured;
      return isConfigured;
    } catch (error) {
      console.error('Error checking Anthropic configuration:', error);
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
