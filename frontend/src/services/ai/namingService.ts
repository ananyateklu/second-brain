import { AIService } from './index';

export class NamingService {
  private aiService: AIService;
  private readonly MODEL_ID = 'gpt-4o-mini';

  constructor() {
    this.aiService = new AIService();
  }

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
    const prompt = this.createPrompt(content, type, context);
    
    try {
      const response = await this.aiService.sendMessage(prompt, this.MODEL_ID);
      let suggestion = response.content;

      // Remove any markdown or code formatting
      suggestion = suggestion.replace(/```[^`]*```/g, '');
      suggestion = suggestion.replace(/`([^`]+)`/g, '$1');

      // Remove any response prefixes
      suggestion = suggestion.replace(/^(Title:|Suggested Title:|Generated Title:|Response:|Here's a title:|How about:|I suggest:|Try this:|Result:)/i, '');

      // Remove all types of quotes and apostrophes
      suggestion = suggestion.replace(/["''""`]/g, '');

      // Clean up whitespace
      suggestion = suggestion.trim();
      suggestion = suggestion.replace(/\s+/g, ' ');
      
      // Ensure the suggestion meets our requirements
      if (suggestion.length > 60) {
        suggestion = suggestion.slice(0, 57) + '...';
      }
      
      return suggestion;
    } catch (error) {
      console.error('Failed to generate title:', error);
      throw new Error('Failed to generate title suggestion');
    }
  }

  private createPrompt(
    content: string, 
    type: 'note' | 'idea' | 'task' | 'reminder',
    context?: {
      currentTitle?: string;
      tags?: string[];
      dueDate?: string;
      priority?: string;
    }
  ): string {
    const prompts = {
      note: `Write a title for this note. IMPORTANT RULES:
- DO NOT use any quotes or punctuation marks
- DO NOT prefix with Title: or similar
- Keep it under 60 characters
- Make it clear and descriptive
- Write the title as plain text only
- Respond with just the title text`,

      idea: `Write a title for this idea. IMPORTANT RULES:
- DO NOT use any quotes or punctuation marks
- DO NOT prefix with Title: or similar
- Keep it under 60 characters
- Make it creative but clear
- Write the title as plain text only
- Respond with just the title text`,

      task: `Write a title for this task. IMPORTANT RULES:
- DO NOT use any quotes or punctuation marks
- DO NOT prefix with Title: or similar
- Keep it under 60 characters
- Start with a verb
- Write the title as plain text only
- Respond with just the title text`,

      reminder: `Write a title for this reminder. IMPORTANT RULES:
- DO NOT use any quotes or punctuation marks
- DO NOT prefix with Title: or similar
- Keep it under 60 characters
- Make it time-relevant
- Write the title as plain text only
- Respond with just the title text`
    };

    let contextInfo = '';
    if (context) {
      if (context.currentTitle) {
        contextInfo += `\nCurrent Title: ${context.currentTitle}`;
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
    }

    return `${prompts[type]}\n\nContent:${contextInfo}\n\n${content}`;
  }
}

export const namingService = new NamingService();