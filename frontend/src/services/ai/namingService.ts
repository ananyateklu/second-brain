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
      const suggestion = response.content.trim();
      
      // Ensure the suggestion meets our requirements
      if (suggestion.length > 60) {
        return suggestion.slice(0, 57) + '...';
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
      note: `Generate a concise, descriptive title for this note. The title should:
- Be clear and under 60 characters
- Capture the main topic or purpose
- Use natural language
- Be specific but not verbose`,
      idea: `Create a captivating, memorable title for this idea. The title should:
- Be creative but clear, under 60 characters
- Capture the innovative aspect
- Be engaging and memorable
- Reflect the potential impact`,
      task: `Generate a clear, action-oriented title for this task. The title should:
- Be specific and under 60 characters
- Start with a verb when possible
- Clearly state the objective
- Include key context`,
      reminder: `Create a clear, time-relevant title for this reminder. The title should:
- Be specific and under 60 characters
- Include relevant timing context
- Be action-oriented
- Be immediately understandable`
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

    return `${prompts[type]}

Content to analyze:${contextInfo}\n\n${content}\n\nGenerated Title:`;
  }
}

export const namingService = new NamingService();