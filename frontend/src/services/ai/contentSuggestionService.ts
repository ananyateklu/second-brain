import { AIService } from './index';

export class ContentSuggestionService {
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
    const prompt = this.createTitlePrompt(content, type, context);
    return this.generateSuggestion(prompt, 60);
  }

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
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 tags
  }

  private async generateSuggestion(prompt: string, maxLength?: number): Promise<string> {
    try {
      const response = await this.aiService.sendMessage(prompt, this.MODEL_ID);
      let suggestion = response.content.trim();
      
      if (maxLength && suggestion.length > maxLength) {
        suggestion = suggestion.slice(0, maxLength - 3) + '...';
      }
      
      return suggestion;
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
      throw new Error('Failed to generate suggestion');
    }
  }

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

    return this.createPrompt(prompts[type], content, context);
  }

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
    const prompts = {
      note: `Generate detailed, well-structured content for this note. The content should:
- Expand on the title's topic
- Be informative and clear
- Include relevant details
- Use proper formatting`,
      idea: `Develop this idea with compelling content. The description should:
- Explain the core concept
- Highlight potential benefits
- Address key considerations
- Suggest possible next steps`,
      task: `Create a clear task description. The content should:
- Detail the specific requirements
- Include any important steps
- Mention relevant dependencies
- Set clear success criteria`,
      reminder: `Write a helpful reminder description. The content should:
- Specify what needs to be done
- Include important details
- Mention any prerequisites
- Note any related deadlines`
    };

    return this.createPrompt(prompts[type], title, context);
  }

  private createTagsPrompt(
    input: { title?: string; content?: string },
    type: 'note' | 'idea' | 'task' | 'reminder',
    context?: {
      currentTags?: string[];
    }
  ): string {
    const prompt = `Generate relevant tags for this ${type}. The tags should:
- Be concise and specific
- Cover key themes and categories
- Be useful for organization
- Include 3-5 tags total

Content to analyze:
${input.title ? `Title: ${input.title}\n` : ''}${input.content ? `Content: ${input.content}\n` : ''}${
      context?.currentTags?.length ? `Current Tags: ${context.currentTags.join(', ')}\n` : ''
    }
Generate tags as a comma-separated list:`;

    return prompt;
  }

  private createPrompt(
    basePrompt: string,
    content: string,
    context?: Record<string, any>
  ): string {
    let contextInfo = '';
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            contextInfo += `\n${key}: ${value.join(', ')}`;
          } else {
            contextInfo += `\n${key}: ${value}`;
          }
        }
      });
    }

    return `${basePrompt}

Content to analyze:${contextInfo}\n\n${content}\n\nGenerated Response:`;
  }
}

export const contentSuggestionService = new ContentSuggestionService();