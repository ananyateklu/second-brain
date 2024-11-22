// ContentSuggestionService.ts
import { AIService } from '../aiService';
import { PROMPT_CONFIG } from './promptConfig';

export class ContentSuggestionService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Use a getter to retrieve the modelId whenever needed
  private get modelId(): string {
    const provider = this.provider;
    if (provider === 'llama') {
      return localStorage.getItem('content_suggestions_model') || 'llama3.1:8b';
    }
    return localStorage.getItem('content_suggestions_model') || 'gpt-4';
  }

  private get provider(): 'openai' | 'anthropic' | 'gemini' | 'llama' {
    return (
      (localStorage.getItem('content_suggestions_provider') as
        | 'openai'
        | 'anthropic'
        | 'gemini'
        | 'llama') || 'openai'
    );
  }

  /**
   * Generates a title for the given content type.
   */
  async generateTitle(
    content: string,
    type: 'note' | 'idea' | 'task' | 'reminder',
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
    type: 'note' | 'idea' | 'task' | 'reminder',
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
    type: 'note' | 'idea' | 'task' | 'reminder',
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
      console.log(`Sending prompt to ${this.modelId}:`, prompt);
      const response = await this.aiService.sendMessage(
        prompt,
        this.modelId
      );
      console.log(
        `Received response from ${this.modelId}:`,
        response.content
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
    let updatedPrompt = prompt;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      updatedPrompt = updatedPrompt.split(placeholder).join(value);
    }
    return updatedPrompt;
  }

  /**
   * Creates a prompt for title generation based on type and model.
   */
  private createTitlePrompt(
    content: string,
    type: 'note' | 'idea' | 'task' | 'reminder',
    context?: {
      currentTitle?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): string {
    const promptTemplate =
      PROMPT_CONFIG.title[type][this.provider];
    const replacements: Record<string, string> = {
      content,
    };
    return this.replacePlaceholders(promptTemplate, replacements);
  }

  /**
   * Creates a prompt for content generation based on type and model.
   */
  private createContentPrompt(
    title: string,
    type: 'note' | 'idea' | 'task' | 'reminder',
    context?: {
      currentContent?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): string {
    const promptTemplate =
      PROMPT_CONFIG.content[type][this.provider];
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
    type: 'note' | 'idea' | 'task' | 'reminder',
    context?: {
      currentTags?: string[];
    }
  ): string {
    const promptTemplate =
      PROMPT_CONFIG.tags[type][this.provider];

    const titleSection = input.title
      ? `Title: ${input.title}\n`
      : '';
    const contentSection = input.content
      ? `Content: ${input.content}\n`
      : '';
    const currentTagsSection =
      context && context.currentTags && context.currentTags.length > 0
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
