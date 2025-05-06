// ContentSuggestionService.ts
import { PROMPT_CONFIG } from './promptConfig';
import { modelService } from './modelService';
import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { LlamaService } from './llama';
import { GrokService } from './grok';

export type ContentType = 'note' | 'idea' | 'task' | 'reminder';

export class ContentSuggestionService {
  private readonly openai = new OpenAIService();
  private readonly anthropic = new AnthropicService();
  private readonly gemini = new GeminiService();
  private readonly llama = new LlamaService();
  private readonly grok = new GrokService();

  // Use a getter to retrieve the modelId whenever needed - use core models only!
  private get modelId(): string {
    const provider = this.provider;
    // Get the selected model from local storage
    const selectedModelId = localStorage.getItem('content_suggestions_model');

    // Get all chat models (non-agent models)
    const availableChatModels = modelService.getChatModels()
      .filter(model => model.provider === provider && model.category === 'chat');

    if (availableChatModels.length === 0) {
      // Fallback if no models available for this provider
      return provider === 'llama' ? 'llama3.1:8b' :
        provider === 'grok' ? 'grok-beta' : 'gpt-4';
    }

    // Check if the selected model is valid and belongs to the right provider and is a chat model
    const isValidModel = availableChatModels.some(model => model.id === selectedModelId);

    if (selectedModelId && isValidModel) {
      return selectedModelId;
    }

    // Default to the first available model for the provider
    return availableChatModels[0]?.id ||
      (provider === 'llama' ? 'llama3.1:8b' :
        provider === 'grok' ? 'grok-beta' : 'gpt-4');
  }

  private get provider(): 'openai' | 'anthropic' | 'gemini' | 'llama' | 'grok' {
    return (
      (localStorage.getItem('content_suggestions_provider') as
        | 'openai'
        | 'anthropic'
        | 'gemini'
        | 'llama'
        | 'grok') || 'openai'
    );
  }

  /**
   * Get the appropriate service instance based on the selected provider
   */
  private getServiceForProvider() {
    const provider = this.provider;
    switch (provider) {
      case 'openai':
        return this.openai;
      case 'anthropic':
        return this.anthropic;
      case 'gemini':
        return this.gemini;
      case 'llama':
        return this.llama;
      case 'grok':
        return this.grok;
      default:
        return this.openai; // Default fallback
    }
  }

  /**
   * Generates a title for the given content type.
   */
  async generateTitle(
    content: string,
    type: ContentType,
    context?: {
      currentTitle?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): Promise<string> {
    const prompt = this.createTitlePrompt(content, type, context);
    return this.generateSuggestion(prompt, 60);
  }

  /**
   * Generates detailed content based on the title and type.
   */
  async generateContent(
    title: string,
    type: ContentType,
    context?: {
      currentContent?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): Promise<string> {
    const prompt = this.createContentPrompt(title, type, context);
    return this.generateSuggestion(prompt);
  }

  /**
   * Generates relevant tags for the given input and type.
   */
  async generateTags(
    input: { title?: string; content?: string },
    type: ContentType,
    context?: {
      currentTags?: string[];
    }
  ): Promise<string[]> {
    const prompt = this.createTagsPrompt(input, type, context);
    const suggestion = await this.generateSuggestion(prompt);
    return suggestion
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 tags
  }

  /**
   * Handles the AI response, including model-specific parsing and cleaning.
   */
  private async generateSuggestion(
    prompt: string,
    maxLength?: number
  ): Promise<string> {
    try {
      const modelId = this.modelId;
      console.log(`Using model ${modelId} for content suggestion with provider ${this.provider}`);

      // Use the appropriate service directly
      const service = this.getServiceForProvider();
      const response = await service.sendMessage(
        prompt,
        modelId
      );

      let suggestion = response.content.trim();

      // Remove unwanted characters and formatting
      suggestion = suggestion.replace(/```[^`]*```/g, '');
      suggestion = suggestion.replace(/`([^`]+)`/g, '$1');
      suggestion = suggestion.replace(/["'`]/g, '');

      // Clean up whitespace
      suggestion = suggestion.replace(/\s+/g, ' ').trim();

      // Truncate if necessary
      if (maxLength && suggestion.length > maxLength) {
        suggestion = suggestion.slice(0, maxLength - 3) + '...';
      }

      return suggestion;
    } catch (error) {
      console.error(
        `Failed to generate suggestion for model ${this.modelId}:`,
        error
      );
      throw new Error(
        `Failed to generate suggestion for the selected AI model (${this.modelId}). Please try again later.`
      );
    }
  }

  /**
   * Replaces placeholders in the prompt with actual values.
   */
  private replacePlaceholders(
    prompt: string,
    replacements: Record<string, string>
  ): string {
    // Check if prompt is undefined, if so use a fallback prompt for the provider
    if (!prompt) {
      console.warn(`Prompt template is undefined for provider ${this.provider}. Using fallback prompt.`);

      // Use a fallback prompt that works for any provider
      return `Please help with the following request based on this information:
${Object.entries(replacements)
          .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
          .join('\n')}`;
    }

    // Normal replacement logic for defined prompts
    let updatedPrompt = prompt;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      updatedPrompt = updatedPrompt.split(placeholder).join(value || '');
    }
    return updatedPrompt;
  }

  /**
   * Creates a prompt for title generation based on type and model.
   */
  private createTitlePrompt(
    content: string,
    type: ContentType,
    context?: {
      currentTitle?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): string {
    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.title[type];
    const promptTemplate = providerConfig?.[this.provider] ||
      providerConfig?.openai || // Fallback to OpenAI if specific provider not found
      `Generate a clear, concise title (under 60 characters) for this ${type}:\n\n{content}`;

    const contextInfo = context ? this.buildContext(context) : '';
    const replacements: Record<string, string> = {
      content,
      context: contextInfo,
    };
    return this.replacePlaceholders(promptTemplate, replacements);
  }

  /**
   * Creates a prompt for content generation based on type and model.
   */
  private createContentPrompt(
    title: string,
    type: ContentType,
    context?: {
      currentContent?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): string {
    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.content[type];
    const promptTemplate = providerConfig?.[this.provider] ||
      providerConfig?.openai || // Fallback to OpenAI if specific provider not found
      `Generate detailed content for this ${type} titled "{title}"{context}`;

    const contextInfo = context ? this.buildContext(context) : '';
    const replacements: Record<string, string> = {
      title,
      context: contextInfo,
    };
    return this.replacePlaceholders(promptTemplate, replacements);
  }

  /**
   * Creates a prompt for tag generation based on type and model.
   */
  private createTagsPrompt(
    input: { title?: string; content?: string },
    type: ContentType,
    context?: {
      currentTags?: string[];
    }
  ): string {
    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.tags[type];
    const promptTemplate = providerConfig?.[this.provider] ||
      providerConfig?.openai || // Fallback to OpenAI if specific provider not found
      `Generate 3-5 relevant tags for this ${type}, as a comma-separated list:\n\n{titleSection}{contentSection}{currentTagsSection}`;

    const titleSection = input.title
      ? `Title: ${input.title}\n`
      : '';
    const contentSection = input.content
      ? `Content: ${input.content}\n`
      : '';
    const currentTagsSection = context?.currentTags?.length
      ? `Current Tags: ${context.currentTags.join(', ')}\n`
      : '';

    const replacements: Record<string, string> = {
      titleSection,
      contentSection,
      currentTagsSection,
    };

    return this.replacePlaceholders(promptTemplate, replacements);
  }

  /**
   * Builds the context string for content prompts.
   */
  private buildContext(context: {
    currentContent?: string;
    tags?: string[];
    dueDate?: string;
    priority?: string;
  }): string {
    let contextInfo = '';
    if (context.currentContent) {
      contextInfo += `\nCurrent Content: ${context.currentContent}`;
    }
    if (context.tags && context.tags.length > 0) {
      contextInfo += `\nRelevant Tags: ${context.tags.join(', ')}`;
    }
    if (context.dueDate) {
      contextInfo += `\nDue Date: ${context.dueDate}`;
    }
    if (context.priority) {
      contextInfo += `\nPriority Level: ${context.priority}`;
    }
    return contextInfo;
  }
}

// Initialize the service instance
export const contentSuggestionService = new ContentSuggestionService();
