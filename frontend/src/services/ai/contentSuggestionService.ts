// ContentSuggestionService.ts
import { PROMPT_CONFIG } from './promptConfig';
import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { OllamaService } from './ollama';
import { GrokService } from './grok';
import aiSettingsService from '../api/aiSettings.service';
import { AISettings } from '../../types/ai';

export type ContentType = 'note' | 'idea' | 'task' | 'reminder';

export class ContentSuggestionService {
  private readonly openai = new OpenAIService();
  private readonly anthropic = new AnthropicService();
  private readonly gemini = new GeminiService();
  private readonly ollama = new OllamaService();
  private readonly grok = new GrokService();

  // Cache for settings to avoid too many API calls
  private cachedSettings: AISettings | null = null;
  private settingsLastFetched: number = 0;
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute cache

  /**
   * Clears the cached settings to force fresh settings on next request
   */
  public clearCache(): void {
    this.cachedSettings = null;
    this.settingsLastFetched = 0;
    console.log('ContentSuggestionService: Cache cleared');
  }

  /**
   * Get cached or fresh AI settings
   */
  private async getSettings(): Promise<AISettings | null> {
    const now = Date.now();
    // Return cached settings if they're fresh
    if (this.cachedSettings && (now - this.settingsLastFetched < this.CACHE_DURATION)) {
      return this.cachedSettings;
    }

    try {
      // Fetch new settings from preferences
      const settings = await aiSettingsService.getAISettings();
      this.cachedSettings = settings;
      this.settingsLastFetched = now;
      return settings;
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      // If we have cached settings, return them even if expired
      if (this.cachedSettings) {
        return this.cachedSettings;
      }
      // Otherwise return null
      return null;
    }
  }

  /**
   * Get model ID from settings or return a default
   */
  private async getModelId() {
    try {
      // Get settings from preferences
      const settings = await this.getSettings();
      const provider = settings?.contentSuggestions?.provider || 'openai';
      const selectedModelId = settings?.contentSuggestions?.modelId;

      // If user selected a specific model, use it
      if (selectedModelId) {
        console.log(`Using selected model from settings: ${selectedModelId}`);
        return selectedModelId;
      }

      // Otherwise fall back to defaults
      switch (provider) {
        case 'openai':
          return 'gpt-4o';
        case 'anthropic':
          return 'claude-3-haiku-20240307';
        case 'gemini':
          return 'gemini-1.5-pro-latest';
        case 'ollama':
          return 'llama3.1:8b';
        case 'grok':
          return 'grok-beta';
        default:
          return 'gpt-4o';
      }
    } catch (error) {
      console.error('Error getting model ID:', error);
      return 'gpt-4o';
    }
  }

  /**
   * Get the provider from settings or use a fallback
   */
  private async getProvider(): Promise<'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok'> {
    try {
      // Get settings from preferences
      const settings = await this.getSettings();
      // Use provider from settings or default to openai
      return settings?.contentSuggestions?.provider || 'openai';
    } catch (error) {
      console.error('Error getting provider:', error);
      // Fallback to localStorage for backward compatibility
      return (localStorage.getItem('content_suggestions_provider') as
        'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok') || 'openai';
    }
  }

  /**
   * Get appropriate AI service based on provider saved in settings
   */
  private async getServiceForProvider() {
    try {
      // Get settings and provider from user preferences
      const settings = await this.getSettings();
      const provider = settings?.contentSuggestions?.provider || 'openai';

      switch (provider) {
        case 'openai':
          return this.openai;
        case 'anthropic':
          return this.anthropic;
        case 'gemini':
          return this.gemini;
        case 'ollama':
          return this.ollama;
        case 'grok':
          return this.grok;
        default:
          return this.openai;
      }
    } catch (error) {
      console.error('Error getting service provider:', error);
      return this.openai;
    }
  }

  /**
   * Get system message from settings or use default
   */
  private async getSystemMessage(): Promise<string | undefined> {
    try {
      const settings = await this.getSettings();
      return settings?.contentSuggestions?.systemMessage;
    } catch (error) {
      console.error('Error getting system message:', error);
      return localStorage.getItem('content_suggestions_system_message') || undefined;
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
    // Clear cache to ensure fresh settings
    this.clearCache();

    // Check if feature is enabled
    const settings = await this.getSettings();
    if (!settings?.contentSuggestions?.enabled) {
      throw new Error('Content suggestions are disabled in settings');
    }

    const prompt = await this.createTitlePrompt(content, type, context);
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
    // Clear cache to ensure fresh settings
    this.clearCache();

    // Check if feature is enabled
    const settings = await this.getSettings();
    if (!settings?.contentSuggestions?.enabled) {
      throw new Error('Content suggestions are disabled in settings');
    }

    const prompt = await this.createContentPrompt(title, type, context);
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
    // Clear cache to ensure fresh settings
    this.clearCache();

    // Check if feature is enabled
    const settings = await this.getSettings();
    if (!settings?.contentSuggestions?.enabled) {
      throw new Error('Content suggestions are disabled in settings');
    }

    const prompt = await this.createTagsPrompt(input, type, context);
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
      const modelId = await this.getModelId();
      const provider = await this.getProvider();
      const settings = await this.getSettings();

      console.log(`Using model ${modelId} for content suggestion with provider ${provider}`);

      // Get temperature and maxTokens from settings
      const temperature = settings?.contentSuggestions?.temperature ?? 0.7;
      const maxTokens = settings?.contentSuggestions?.maxTokens ?? 2000;
      const systemMessage = await this.getSystemMessage();

      // Use the appropriate service directly
      const service = await this.getServiceForProvider();

      // Build request parameters
      const parameters: Record<string, unknown> = {
        temperature,
        max_tokens: maxTokens,
      };

      // If there's a system message, prepend it to the prompt with appropriate formatting
      let enhancedPrompt = prompt;
      if (systemMessage) {
        // For different providers, we might need different formatting
        if (provider === 'openai' || provider === 'anthropic' || provider === 'grok') {
          // These providers handle system messages via parameters
          parameters.system_message = systemMessage;
        } else {
          // For other providers, prepend to the prompt
          enhancedPrompt = `${systemMessage}\n\n${prompt}`;
        }
      }

      const response = await service.sendMessage(
        enhancedPrompt,
        modelId,
        parameters
      );

      let suggestion = typeof response.content === 'string'
        ? response.content.trim()
        : String(response.content).trim();

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
        'Failed to generate suggestion:',
        { error }
      );
      throw new Error(
        `Failed to generate suggestion. Please try again later.`
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
      console.warn(`Prompt template is undefined. Using fallback prompt.`);

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
  private async createTitlePrompt(
    content: string,
    type: ContentType,
    context?: {
      currentTitle?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): Promise<string> {
    const provider = await this.getProvider();

    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.title[type];
    const promptTemplate = providerConfig?.[provider] ||
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
  private async createContentPrompt(
    title: string,
    type: ContentType,
    context?: {
      currentContent?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): Promise<string> {
    const provider = await this.getProvider();

    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.content[type];
    const promptTemplate = providerConfig?.[provider] ||
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
  private async createTagsPrompt(
    input: { title?: string; content?: string },
    type: ContentType,
    context?: {
      currentTags?: string[];
    }
  ): Promise<string> {
    const provider = await this.getProvider();

    // Get the prompt template, or use a fallback for providers not explicitly configured
    const providerConfig = PROMPT_CONFIG.tags[type];
    const promptTemplate = providerConfig?.[provider] ||
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

  /**
   * Generate content suggestions using the configured AI provider
   * @param contentType Type of content being generated
   * @param prompt User prompt or context for generation
   * @returns Generated content
   */
  async generateContentSuggestions(contentType: ContentType, prompt: string): Promise<string> {
    try {
      // Clear cache to ensure fresh settings
      this.clearCache();

      // Get settings (this will fetch fresh settings since cache was cleared)
      const settings = await this.getSettings();
      if (!settings?.contentSuggestions?.enabled) {
        console.log('Content suggestions are disabled');
        throw new Error('Content suggestions are disabled in settings');
      }

      // Extract settings
      const modelId = settings?.contentSuggestions?.modelId || '';
      const temperature = settings?.contentSuggestions?.temperature || 0.7;
      const maxTokens = settings?.contentSuggestions?.maxTokens || 1500;
      const systemMessage = settings?.contentSuggestions?.systemMessage || '';
      const provider = settings?.contentSuggestions?.provider || 'openai';

      // Get appropriate service
      const service = await this.getServiceForProvider();

      // Build request parameters
      const parameters: Record<string, unknown> = {
        temperature,
        max_tokens: maxTokens,
      };

      // Prepare the prompt using the appropriate template from PROMPT_CONFIG
      // This is a simplified implementation - you may need to adjust based on your actual usage
      const providerPrompt = this.getPromptForProvider(contentType, provider, prompt);

      // If there's a system message, prepend it
      const finalPrompt = systemMessage
        ? `${systemMessage}\n\n${providerPrompt}`
        : providerPrompt;

      // Send the formatted prompt to the configured AI model
      const response = await service.sendMessage(finalPrompt, modelId, parameters);
      return typeof response.content === 'string'
        ? response.content
        : String(response.content);
    } catch (error) {
      console.error('Error generating content suggestions:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate prompt for the given content type and provider
   */
  private getPromptForProvider(
    contentType: ContentType,
    provider: string,
    userPrompt: string
  ): string {
    try {
      // Access the prompt config based on content type and provider
      const contentSection = PROMPT_CONFIG.content;

      // Check if we have configuration for this content type
      if (!contentSection[contentType]) {
        console.warn(`No prompt configuration found for content type: ${contentType}`);
        return userPrompt;
      }

      // Get provider-specific prompt or fall back to OpenAI if not found
      const providerConfig = contentSection[contentType];
      const promptTemplate = providerConfig[provider as keyof typeof providerConfig] ||
        providerConfig.openai ||
        `Generate content for this ${contentType}:\n\n${userPrompt}`;

      // Use the prompt template, replacing {title} with the user prompt
      // This assumes the user prompt is a title in the case of content generation
      return this.replacePlaceholders(promptTemplate, {
        title: userPrompt,
        context: '',  // No context provided in this simple version
      });
    } catch (error) {
      console.error('Error formatting prompt for provider:', error);
      return userPrompt;
    }
  }
}

// Initialize the service instance
export const contentSuggestionService = new ContentSuggestionService();
