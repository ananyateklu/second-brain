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
    validItem?: boolean; // for pre-validated items
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

            // For link suggestions, prefer models with higher reasoning capabilities
            const isLinkSuggestionModelSelection = settings?.contentSuggestions?.systemMessage?.includes('Find meaningful connections') ||
                settings?.contentSuggestions?.systemMessage?.includes('Help identify connections') ||
                settings?.contentSuggestions?.systemMessage?.includes('semantic connection specialist') ||
                settings?.contentSuggestions?.systemMessage?.includes('connection discovery');

            if (isLinkSuggestionModelSelection) {

                // For different providers, select optimal models for semantic tasks
                if (provider === 'openai') {
                    // Prefer GPT-4 models for link suggestions
                    const gpt4Models = availableChatModels.filter(m => m.id.includes('gpt-4'));
                    if (gpt4Models.length > 0) {
                        return gpt4Models[0].id;
                    }
                } else if (provider === 'anthropic') {
                    // Prefer Claude 3 models for link suggestions
                    const claude3Models = availableChatModels.filter(m => m.id.includes('claude-3'));
                    if (claude3Models.length > 0) {
                        return claude3Models[0].id;
                    }
                } else if (provider === 'gemini') {
                    // Prefer Gemini Pro or Ultra models
                    const geminiAdvancedModels = availableChatModels.filter(m =>
                        m.id.includes('pro') || m.id.includes('ultra') || m.id.includes('1.5')
                    );
                    if (geminiAdvancedModels.length > 0) {
                        return geminiAdvancedModels[0].id;
                    }
                } else if (provider === 'ollama') {
                    // For Ollama, prefer larger models or models known for reasoning
                    const ollamaPreferredModels = availableChatModels.filter(m =>
                        m.id.includes('llama3') ||
                        m.id.includes('mistral') ||
                        m.id.includes('mixtral') ||
                        m.id.includes('wizard')
                    );
                    if (ollamaPreferredModels.length > 0) {
                        return ollamaPreferredModels[0].id;
                    }
                } else if (provider === 'grok') {
                    // Grok typically only has one model available
                    return availableChatModels[0]?.id || 'grok-beta';
                }
            }

            if (availableChatModels.length > 0) {
                return availableChatModels[0].id;
            }

            // Fallback to default models if no models available for this provider
            return provider === 'ollama' ? 'llama3:latest' :
                provider === 'grok' ? 'grok-beta' :
                    provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                        provider === 'gemini' ? 'gemini-1.5-pro-latest' :
                            'gpt-4';
        } catch (error) {
            console.error('Error getting model ID:', error);
            // Fallback to a reasonable default based on provider
            return provider === 'ollama' ? 'llama3:latest' :
                provider === 'grok' ? 'grok-beta' :
                    provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                        provider === 'gemini' ? 'gemini-1.5-pro-latest' :
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

            // Always use provider from settings or default to openai
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
                return [];
            }

            const provider = await this.getProvider();
            const modelId = await this.getModelId();

            // Create prompt with instructions
            const basePrompt = this.createSimilarityPrompt(currentItem, allContent, settings?.contentSuggestions?.maxTokens);

            // Get the system message from settings
            const systemMessage = settings?.contentSuggestions?.systemMessage;

            // Combine system message with the prompt if available
            const prompt = systemMessage
                ? `${systemMessage}\n\n${basePrompt}`
                : basePrompt;

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

            // Extract JSON content from the response, handling markdown code blocks
            let jsonContent = '';

            // Check if response is wrapped in markdown code blocks (more flexible pattern)
            const markdownMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch) {
                // Extract content from within the code block
                jsonContent = markdownMatch[1].trim();
            } else {
                // Try to find JSON array directly with a more robust pattern
                // This handles both arrays and objects, even with nested content
                const jsonArrayMatch = responseContent.match(/(\[[\s\S]*?\])/g);
                if (jsonArrayMatch && jsonArrayMatch.length > 0) {
                    // Take the largest match which is likely the full result
                    jsonContent = jsonArrayMatch.sort((a, b) => b.length - a.length)[0];
                } else {
                    // Try to find JSON object directly
                    const jsonObjectMatch = responseContent.match(/(\{[\s\S]*?\})/g);
                    if (jsonObjectMatch && jsonObjectMatch.length > 0) {
                        // Take the largest match which is likely the full result
                        jsonContent = jsonObjectMatch.sort((a, b) => b.length - a.length)[0];
                    } else {
                        console.error("No JSON found in response:", responseContent);
                        throw new Error("Invalid response format from AI service");
                    }
                }
            }

            // Perform additional cleanup on extracted JSON
            jsonContent = jsonContent.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '');

            try {
                // Parse the JSON content
                const parsedResult = JSON.parse(jsonContent);

                // Verify we have an array result
                if (!Array.isArray(parsedResult)) {
                    console.error("Parsed result is not an array:", parsedResult);
                    // If the result is an object with a specific expected property, try to extract array
                    if (parsedResult && typeof parsedResult === 'object' && 'results' in parsedResult) {
                        if (Array.isArray(parsedResult.results)) {
                            const results = parsedResult.results as SimilarityResult[];
                            const sortedResults = results
                                .sort((a, b) => b.similarity - a.similarity)
                                .slice(0, maxResults);

                            return sortedResults;
                        }
                    }

                    // If it's not an array but a single item, wrap it in an array
                    if (parsedResult && typeof parsedResult === 'object' && 'id' in parsedResult && 'similarity' in parsedResult) {
                        const singleItemArray = [parsedResult] as SimilarityResult[];
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

                // Validate and correct types by cross-checking against original arrays
                const correctedResults = validResults.map(item => {
                    // Make a copy to avoid modifying the original
                    const correctedItem = { ...item };

                    // Check if this item exists in one of our arrays to validate its type
                    const noteMatch = notes.find(note => note.id === item.id);
                    const ideaMatch = ideas.find(idea => idea.id === item.id);
                    const taskMatch = tasks.find(task => task.id === item.id);

                    // If the item exists in one of our arrays but has the wrong type, fix it
                    if (noteMatch && item.type !== 'note') {
                        correctedItem.type = 'note';
                    } else if (ideaMatch && item.type !== 'idea') {
                        correctedItem.type = 'idea';
                    } else if (taskMatch && item.type !== 'task') {
                        correctedItem.type = 'task';
                    }

                    return correctedItem;
                });

                // Remove fallback logic as requested by the user.
                // The new prompt should be effective enough.
                const enhancedResults = [...correctedResults];

                // Sort by similarity score (highest first) and limit results
                const sortedAndLimitedResults = enhancedResults
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, maxResults);

                return sortedAndLimitedResults;
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
        }>,
        maxTokens?: number
    ): string {
        // Count the number of each type for context
        const typeCounts = candidates.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const contentTypesMessage = `Available content for comparison: ${typeCounts['note'] || 0} notes, ${typeCounts['idea'] || 0} ideas, ${typeCounts['task'] || 0} tasks, ${typeCounts['reminder'] || 0} reminders.`;

        // Simplified and more effective prompt
        const prompt = `
Analyze the CURRENT ITEM and find the most semantically similar items from the CANDIDATE ITEMS.
Consider the title, content, and tags for similarity.
All content types (note, idea, task, reminder) are equally important.
Return up to ${maxTokens && maxTokens > 1000 ? 10 : 5} of the most relevant items.
The similarity score (0 to 1) must reflect genuine semantic similarity.

CURRENT ITEM:
ID: ${currentItem.id}
Title: ${currentItem.title}
Content: ${currentItem.content.substring(0, Math.min(500, currentItem.content.length))}${currentItem.content.length > 500 ? '...' : ''}
Tags: ${currentItem.tags?.join(', ') || 'None'}

${contentTypesMessage}

CANDIDATE ITEMS TO COMPARE (sample, full list provided to the model):
${candidates.slice(0, 30).map((item, index) => `
${index + 1}. ID: ${item.id} | Type: ${item.type} | Title: ${item.title}
   Content: ${item.content.substring(0, Math.min(100, item.content.length))}${item.content.length > 100 ? '...' : ''}
   ${item.type === 'task' && item.status ? `Status: ${item.status}` : ''}${item.type === 'task' && item.dueDate ? ` | Due Date: ${item.dueDate}` : ''}
`).join('\n')}

RESPONSE FORMAT:
Return ONLY a JSON array of objects. Each object must have these properties:
- id: string (exact ID from input)
- title: string (item title)
- type: "note" | "idea" | "task" | "reminder" (correct type for the ID)
- similarity: number (0.0 to 1.0, reflecting true semantic similarity)
- status?: string (for tasks, if applicable)
- dueDate?: string (for tasks or reminders, if applicable)

Example:
[
  {"id": "abc123", "title": "Related Note Title", "type": "note", "similarity": 0.88},
  {"id": "def456", "title": "Relevant Project Task", "type": "task", "similarity": 0.75, "status": "pending"},
  {"id": "ghi789", "title": "Connected Idea", "type": "idea", "similarity": 0.92}
]

Focus on high-quality, diverse suggestions if relevant items exist across types. Do not invent items or use placeholder similarities.
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