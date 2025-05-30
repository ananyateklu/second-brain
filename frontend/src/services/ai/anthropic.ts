import { AIModel, AIResponse, AnthropicToolResult, AnthropicResponse, AnthropicGeneratedFields, AccumulatedContext } from '../../types/ai';
// import { AI_MODELS } from './models'; // This line is removed as it's unused
import api from '../api/api';
import { agentService } from './agent';

interface BackendAnthropicModelInfo {
  id: string;
  display_name: string;
  created_at?: string;
  type: string;
  description?: string;
  input_token_limit?: number;
  output_token_limit?: number;
  context_window_size?: number;
  max_output_tokens?: number;
  capabilities?: string[];
}

interface BackendAnthropicModelsResponse {
  data: BackendAnthropicModelInfo[];
  first_id?: string;
  has_more: boolean;
  last_id?: string;
}

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
  private fetchedModels: AIModel[] | null = null;

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

      // Check if this is a simple generation request by looking at the prompt content
      const isSimpleTitleGeneration = message.includes("title for") && !message.includes("tool");
      const isSimpleTagGeneration = message.includes("tags for") && !message.includes("tool");

      // Only add tools for complex scenarios, not for simple title/tag generation
      const shouldUseTools = isContentSuggestion && !isSimpleTitleGeneration && !isSimpleTagGeneration;
      const tools = shouldUseTools ? this.getContentSuggestionTools() : [];

      console.log(`Claude request: ${modelId}, using tools: ${shouldUseTools}`);

      const request = this.createInitialRequest(message, modelId, parameters, tools);

      const response = await api.post<AnthropicResponse>('/api/Claude/send', request);

      let finalContent = '';
      const toolResults: AnthropicToolResult[] = [];

      if (response.data.content) {
        for (const block of response.data.content) {
          const { content, toolResult } = await this.processContentBlock(
            block,
            shouldUseTools,
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
          toolResults: shouldUseTools ? toolResults : undefined,
          context: shouldUseTools ? accumulatedContext : undefined
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
      console.error('Error executing tool:', { name, error });
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

      return this.cleanContent(response.content as string);
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

      return this.cleanTitle(response.content as string);
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

      return this.cleanAndParseTags(response.content as string);
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

      const response = await api.post<AnthropicResponse>('/api/Claude/send', request);


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

  private async fetchModelsFromAPI(): Promise<AIModel[]> {
    try {
      const response = await api.get<BackendAnthropicModelsResponse>('/api/Claude/models');
      if (response.data && response.data.data) {
        return response.data.data.map(modelInfo => ({
          id: modelInfo.id,
          name: modelInfo.display_name || modelInfo.id,
          provider: 'anthropic',
          category: 'chat',
          description: modelInfo.description || `Anthropic model: ${modelInfo.display_name || modelInfo.id}`,
          isConfigured: true,
          isReasoner: false,
          color: '#F97316',
          endpoint: 'chat',
          rateLimits: {
            maxInputTokens: modelInfo.input_token_limit || modelInfo.context_window_size || 200000,
            maxOutputTokens: modelInfo.output_token_limit || modelInfo.max_output_tokens || 4096,
          },
          size: '',
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching Anthropic models from backend:', error);
      return [];
    }
  }

  async getModels(): Promise<AIModel[]> {
    if (this.fetchedModels) {
      return this.fetchedModels;
    }
    const apiModels = await this.fetchModelsFromAPI();
    if (apiModels.length > 0) {
      this.fetchedModels = apiModels;
      return apiModels;
    }
    console.warn("Falling back to static Anthropic models as API fetch failed or returned no models.");
    const staticModels = (await import('./anthropicModels')).ANTHROPIC_MODELS;
    this.fetchedModels = staticModels;
    return staticModels;
  }

  async isConfigured(): Promise<boolean> {
    try {
      const isAgentConfigured = await agentService.isAnthropicConfigured();
      this.isEnabled = isAgentConfigured;
      if (isAgentConfigured) {
        const models = await this.getModels();
        this.isEnabled = models.length > 0;
      }
      return this.isEnabled;
    } catch (error) {
      console.error('Error checking Anthropic configuration:', error);
      this.isEnabled = false;
      return false;
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }
}
