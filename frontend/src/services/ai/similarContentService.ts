import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { OllamaService } from './ollama';
import { GrokService } from './grok';
import { modelService } from './modelService';
import { Note } from '../../types/note';
import { Task } from '../../types/task';
import { Reminder } from '../../types/reminder';
import { Idea } from '../../types/idea';
import aiSettingsService from '../api/aiSettings.service';
import { AISettings } from '../../types/ai';

interface SimilarityResult {
    id: string;
    title: string;
    similarity: number; // 0-1 score
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string; // for tasks
    dueDate?: string | null; // for tasks and reminders
}

export class SimilarContentService {
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
     * Get model ID from settings or use a fallback
     */
    private async getModelId(): Promise<string> {
        const provider = await this.getProvider();

        try {
            // Get settings from preferences
            const settings = await this.getSettings();
            const selectedModelId = settings?.contentSuggestions?.modelId;

            if (selectedModelId) {
                console.log(`Using selected model from settings: ${selectedModelId}`);
                return selectedModelId;
            }

            // If no model is selected, get a list of available models
            const availableChatModels = await modelService.getChatModelsAsync()
                .then(models => models.filter(model => model.provider === provider && model.category === 'chat'))
                .catch(error => {
                    console.error('Error fetching async models:', error);
                    // Fallback to synchronous method if async fails
                    return modelService.getChatModels()
                        .filter(model => model.provider === provider && model.category === 'chat');
                });

            if (availableChatModels.length > 0) {
                console.log(`Using first available ${provider} model: ${availableChatModels[0].id}`);
                return availableChatModels[0].id;
            }

            // Fallback to default models if no models available for this provider
            console.log(`No available models for ${provider}, using fallback`);
            return provider === 'ollama' ? 'llama3:latest' :
                provider === 'grok' ? 'grok-beta' :
                    provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                        'gpt-4';
        } catch (error) {
            console.error('Error getting model ID:', error);
            // Fallback to a reasonable default based on provider
            return provider === 'ollama' ? 'llama3:latest' :
                provider === 'grok' ? 'grok-beta' :
                    provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                        'gpt-4';
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

    // Using the non-async version of getServiceForProvider for efficiency

    /**
     * Find content similar to the given item
     */
    public async findSimilarContent(
        currentItem: { id: string; title: string; content: string; tags?: string[] },
        notes: Note[],
        ideas: Idea[],
        tasks: Task[],
        reminders: Reminder[],
        excludeIds: string[] = [],
        maxResults: number = 5
    ): Promise<SimilarityResult[]> {
        try {
            // Clear cache to ensure fresh settings
            this.clearCache();

            // Get settings with fresh data
            const settings = await this.getSettings();

            // Skip if disabled
            if (settings?.contentSuggestions?.enabled === false) {
                console.log("Content suggestions are disabled in user settings");
                return [];
            }

            // Prepare content for embedding
            const allContent = [
                ...notes.map(note => ({
                    id: note.id,
                    title: note.title,
                    content: note.content || '',
                    type: 'note' as const,
                    status: note.isArchived ? 'archived' : undefined
                })),
                ...ideas.map(idea => ({
                    id: idea.id,
                    title: idea.title,
                    content: idea.content || '',
                    type: 'idea' as const,
                    status: idea.isArchived ? 'archived' : undefined
                })),
                ...tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    content: task.description || '',
                    type: 'task' as const,
                    status: task.status,
                    dueDate: task.dueDate
                })),
                ...reminders.map(reminder => ({
                    id: reminder.id,
                    title: reminder.title,
                    content: reminder.description || '',
                    type: 'reminder' as const
                }))
            ]
                // Filter out the current item and any excluded IDs
                .filter(item =>
                    item.id !== currentItem.id &&
                    !excludeIds.includes(item.id)
                );

            // If no content to compare, return empty results
            if (allContent.length === 0) {
                console.log("No content available to find similarities");
                return [];
            }

            const provider = await this.getProvider();
            const modelId = await this.getModelId();

            // Create prompt with instructions
            const prompt = this.createSimilarityPrompt(currentItem, allContent);
            console.log("Sending prompt to AI model:", modelId);

            // Get parameters from settings
            const parameters: Record<string, unknown> = {
                temperature: settings?.contentSuggestions?.temperature ?? 0.7,
                max_tokens: settings?.contentSuggestions?.maxTokens ?? 2000
            };

            const service = this.getServiceForProvider(provider);
            const response = await service.sendMessage(prompt, modelId, parameters);
            // Convert response content to string to handle different types
            const responseContent = typeof response.content === 'string'
                ? response.content
                : String(response.content);

            console.log("Raw AI response:", responseContent);

            // Extract JSON content from the response, handling markdown code blocks
            let jsonContent = '';

            // Check if response is wrapped in markdown code blocks (more flexible pattern)
            const markdownMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch) {
                // Extract content from within the code block
                jsonContent = markdownMatch[1].trim();
                console.log("Extracted JSON from markdown code block");
            } else {
                // Try to find JSON array directly with a more robust pattern
                // This handles both arrays and objects, even with nested content
                const jsonArrayMatch = responseContent.match(/(\[[\s\S]*?\])/g);
                if (jsonArrayMatch && jsonArrayMatch.length > 0) {
                    // Take the largest match which is likely the full result
                    jsonContent = jsonArrayMatch.sort((a, b) => b.length - a.length)[0];
                    console.log("Extracted JSON array directly");
                } else {
                    // Try to find JSON object directly
                    const jsonObjectMatch = responseContent.match(/(\{[\s\S]*?\})/g);
                    if (jsonObjectMatch && jsonObjectMatch.length > 0) {
                        // Take the largest match which is likely the full result
                        jsonContent = jsonObjectMatch.sort((a, b) => b.length - a.length)[0];
                        console.log("Extracted JSON object directly");
                    } else {
                        console.error("No JSON found in response:", responseContent);
                        throw new Error("Invalid response format from AI service");
                    }
                }
            }

            // Perform additional cleanup on extracted JSON
            jsonContent = jsonContent.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '');

            // Log what we found for debugging
            console.log("Extracted JSON content:", jsonContent.substring(0, 100) + (jsonContent.length > 100 ? "..." : ""));

            try {
                // Parse the JSON content
                const parsedResult = JSON.parse(jsonContent);

                // Verify we have an array result
                if (!Array.isArray(parsedResult)) {
                    console.error("Parsed result is not an array:", parsedResult);
                    // If the result is an object with a specific expected property, try to extract array
                    if (parsedResult && typeof parsedResult === 'object' && 'results' in parsedResult) {
                        console.log("Trying to extract results array from object");
                        if (Array.isArray(parsedResult.results)) {
                            const results = parsedResult.results as SimilarityResult[];
                            const sortedResults = results
                                .sort((a, b) => b.similarity - a.similarity)
                                .slice(0, maxResults);

                            console.log("Parsed similarity results from nested property:", sortedResults);
                            return sortedResults;
                        }
                    }

                    // If it's not an array but a single item, wrap it in an array
                    if (parsedResult && typeof parsedResult === 'object' && 'id' in parsedResult && 'similarity' in parsedResult) {
                        console.log("Converting single result to array");
                        const singleItemArray = [parsedResult] as SimilarityResult[];
                        console.log("Parsed similarity result as single item:", singleItemArray);
                        return singleItemArray.slice(0, maxResults);
                    }

                    throw new Error("Expected an array of results but received a different format");
                }

                // Process array results
                const results = parsedResult as SimilarityResult[];

                // Verify array elements have required properties
                const validResults = results.filter(item =>
                    item &&
                    typeof item === 'object' &&
                    'id' in item &&
                    'title' in item &&
                    'similarity' in item &&
                    'type' in item
                );

                if (validResults.length === 0) {
                    console.error("No valid items found in results array:", results);
                    throw new Error("Results array contains no valid items");
                }

                // Sort by similarity score (highest first)
                const sortedResults = validResults
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, maxResults);

                console.log("Parsed similarity results:", sortedResults);
                return sortedResults;
            } catch (jsonError) {
                console.error("Failed to parse JSON response:", jsonError);
                throw new Error("Invalid response format from AI service");
            }
        } catch (error) {
            console.error("Error finding similar content:", error);
            throw error;
        }
    }

    /**
     * Force refresh of cached settings
     */
    public clearCache(): void {
        this.cachedSettings = null;
        this.settingsLastFetched = 0;
        console.log('Cleared similarContentService settings cache');
    }

    /**
     * Create a prompt for finding similar content
     */
    private createSimilarityPrompt(
        currentItem: { id: string; title: string; content: string; tags?: string[] },
        candidates: Array<{
            id: string;
            title: string;
            content: string;
            type: 'note' | 'idea' | 'task' | 'reminder';
            status?: string;
            dueDate?: string | null;
        }>
    ): string {
        // Create a similarity prompt based on the current item and candidates
        const prompt = `Your task is to find items similar to the following content. Return ONLY a JSON array of similar items.

Current Item:
ID: ${currentItem.id}
Title: ${currentItem.title}
Content: ${currentItem.content.substring(0, Math.min(1000, currentItem.content.length))}
Tags: ${currentItem.tags?.join(', ') || 'None'}

Candidate Items:
${candidates.slice(0, 50).map((item, index) => `
Item ${index + 1}:
ID: ${item.id}
Type: ${item.type}
Title: ${item.title}
Content: ${item.content.substring(0, Math.min(200, item.content.length))}
${item.status ? `Status: ${item.status}` : ''}
${item.dueDate ? `Due Date: ${item.dueDate}` : ''}
`).join('\n')}

IMPORTANT: You MUST return a valid JSON array containing objects with these properties:
- id: string (ID of the item)
- title: string (title of the item)
- type: string (type of the item - "note", "idea", "task", or "reminder")
- similarity: number (between 0-1, with 1 being most similar)
- status: string (optional - status of the item if available)
- dueDate: string (optional - due date if available)

Example of the EXACT format to return:
[
    {
        "id": "abc123",
        "title": "Example Title",
        "type": "note",
        "similarity": 0.95,
        "status": "active" 
    },
    {
        "id": "def456",
        "title": "Another Title",
        "type": "task",
        "similarity": 0.82,
        "status": "pending",
        "dueDate": "2023-06-15"
    }
]

Return ONLY the JSON array - no additional text, explanation, or markdown formatting.
`;
        return prompt;
    }

    /**
     * Get the appropriate service for the specified provider
     */
    private getServiceForProvider(provider: string): OpenAIService | AnthropicService | GeminiService | OllamaService | GrokService {
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
    }
}

// Create and export the service instance
export const similarContentService = new SimilarContentService(); 