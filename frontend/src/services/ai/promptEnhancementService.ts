import { AIService } from './index';

export class PromptEnhancementService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  private get modelId(): string {
    const provider = this.provider;
    if (provider === 'llama') {
      return localStorage.getItem('prompt_enhancement_model') || 'llama3.1:8b';
    }
    return localStorage.getItem('prompt_enhancement_model') || 'gpt-4';
  }

  private get provider(): 'openai' | 'anthropic' | 'gemini' | 'llama' {
    return (
      (localStorage.getItem('prompt_enhancement_provider') as
        | 'openai'
        | 'anthropic'
        | 'gemini'
        | 'llama') || 'openai'
    );
  }

  async enhancePrompt(input: string, context?: string): Promise<string> {
    try {
      // Truncate input if it's too long (e.g., more than 1000 characters)
      const truncatedInput = input.slice(0, 1000);
      const truncatedContext = context?.slice(0, 500);

      const prompt = this.createEnhancementPrompt(truncatedInput, truncatedContext);
      
      const response = await this.aiService.sendMessage(
        prompt,
        this.modelId,
        {
          max_tokens: 150, 
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }
      );
      
      return response.content.trim()
        .replace(/```[^`]*```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/["'`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      throw new Error('Failed to enhance prompt. Please try again.');
    }
  }

  private createEnhancementPrompt(input: string, context?: string): string {
    const basePrompt = `Enhance this input to be more specific and professional while keeping it concise (max 100 words):

Input: "${input}"
${context ? `Context: ${context}` : ''}

Enhanced version:`;

    return basePrompt;
  }
}

export const promptEnhancementService = new PromptEnhancementService(); 