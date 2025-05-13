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

            // Get all chat models for the provider
            const availableChatModels = modelService.getChatModels()
                .filter(model => model.provider === provider && model.category === 'chat');

            if (availableChatModels.length === 0) {
                // Fallback if no models available for this provider
                return provider === 'ollama' ? 'llama3.1:8b' :
                    provider === 'grok' ? 'grok-beta' : 'gpt-4';
            }

            // Check if the selected model is valid
            const isValidModel = selectedModelId && availableChatModels.some(model => model.id === selectedModelId);

            if (isValidModel) {
                return selectedModelId!;
            }

            // Default to the first available model for the provider
            return availableChatModels[0]?.id ||
                (provider === 'ollama' ? 'llama3.1:8b' :
                    provider === 'grok' ? 'grok-beta' : 'gpt-4');
        } catch (error) {
            console.error('Error getting model ID:', error);
            // Fallback to a reasonable default based on provider
            return provider === 'ollama' ? 'llama3.1:8b' :
                provider === 'grok' ? 'grok-beta' : 'gpt-4';
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

    private async getServiceForProvider() {
        const provider = await this.getProvider();
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

    /**
     * Find similar items to the current note
     * @param currentNoteContent The content/context to find similar items for
     * @param availableNotes All notes in the system
     * @param availableIdeas All ideas in the system
     * @param availableTasks All tasks in the system
     * @param availableReminders All reminders in the system
     * @param excludeIds IDs to exclude from results (like already linked items)
     * @param maxResults Maximum number of results to return
     * @returns List of similar items with similarity scores
     */
    async findSimilarContent(
        currentItemContent: {
            id: string;
            title: string;
            content: string;
            tags: string[];
        },
        availableNotes: Note[],
        availableIdeas: Idea[],
        availableTasks: Task[],
        availableReminders: Reminder[] = [],
        excludeIds: string[] = [],
        maxResults: number = 5
    ): Promise<SimilarityResult[]> {
        try {
            console.log("findSimilarContent called with current item:", currentItemContent.title);

            // Combine all items that aren't already linked
            const allItems = [
                ...availableNotes
                    .filter(note => note.id !== currentItemContent.id && !excludeIds.includes(note.id))
                    .map(note => ({
                        id: note.id,
                        title: note.title,
                        content: note.content,
                        tags: note.tags,
                        type: 'note' as const
                    })),
                ...availableIdeas
                    .filter(idea => idea.id !== currentItemContent.id && !excludeIds.includes(idea.id))
                    .map(idea => ({
                        id: idea.id,
                        title: idea.title,
                        content: idea.content,
                        tags: idea.tags,
                        type: 'idea' as const
                    })),
                ...availableTasks
                    .filter(task => !excludeIds.includes(task.id))
                    .map(task => ({
                        id: task.id,
                        title: task.title,
                        content: task.description || '',
                        tags: task.tags || [],
                        type: 'task' as const,
                        status: task.status,
                        dueDate: task.dueDate
                    })),
                ...availableReminders
                    .filter(reminder => !excludeIds.includes(reminder.id))
                    .map(reminder => ({
                        id: reminder.id,
                        title: reminder.title,
                        content: reminder.description || '',
                        tags: [],
                        type: 'reminder' as const,
                        dueDate: reminder.dueDateTime
                    }))
            ];

            console.log("Total candidate items:", allItems.length);
            console.log("Sample of candidate items:", allItems.slice(0, 2));

            if (allItems.length === 0) {
                return [];
            }

            // If there are many items, use a more efficient approach with AI
            const results = await this.findSimilarItemsViaAI(currentItemContent, allItems, maxResults);
            console.log("Results from AI:", results);

            return results.map(item => ({
                id: item.id,
                title: item.title,
                similarity: item.similarity,
                type: item.type,
                status: 'status' in item ? item.status : undefined,
                dueDate: 'dueDate' in item ? item.dueDate : undefined
            }));
        } catch (error) {
            console.error('Failed to find similar content:', error);
            return [];
        }
    }

    /**
     * Use AI to find similar items by sending the current note and all candidates
     */
    private async findSimilarItemsViaAI(
        currentNote: {
            title: string;
            content: string;
            tags: string[];
        },
        candidates: Array<{
            id: string;
            title: string;
            content: string;
            tags: string[];
            type: 'note' | 'idea' | 'task' | 'reminder';
            status?: string;
            dueDate?: string | null;
        }>,
        maxResults: number
    ) {
        const prompt = await this.createSimilarItemsPrompt(currentNote, candidates, maxResults);
        const service = await this.getServiceForProvider();
        const modelId = await this.getModelId();
        const settings = await this.getSettings();

        try {
            console.log("Sending prompt to AI model:", modelId);

            // Get parameters from settings
            const parameters: Record<string, unknown> = {
                temperature: settings?.contentSuggestions?.temperature ?? 0.7,
                max_tokens: settings?.contentSuggestions?.maxTokens ?? 2000
            };

            const response = await service.sendMessage(prompt, modelId, parameters);
            // Convert response content to string to handle different types
            const responseContent = typeof response.content === 'string'
                ? response.content
                : String(response.content);

            console.log("Raw AI response:", responseContent);

            const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) ||
                responseContent.match(/\[([\s\S]*?)\]/) ||
                responseContent.match(/{[\s\S]*?}/);

            if (jsonMatch) {
                let jsonStr = jsonMatch[1] || jsonMatch[0];
                // Ensure we have proper JSON
                if (!jsonStr.startsWith('[')) {
                    jsonStr = `[${jsonStr}]`;
                }

                try {
                    console.log("Attempting to parse JSON:", jsonStr);
                    const results = JSON.parse(jsonStr);
                    console.log("Parsed results:", results);

                    // Validate results
                    if (Array.isArray(results)) {
                        const validResults = results
                            .filter(item =>
                                typeof item.id === 'string' &&
                                typeof item.similarity === 'number' &&
                                item.similarity >= 0 && item.similarity <= 1 &&
                                // Ensure type is one of the expected values
                                ['note', 'idea', 'task', 'reminder'].includes(item.type)
                            )
                            .map(item => {
                                // Try to find the original candidate to get the full details if AI misses some
                                const originalItem = candidates.find(c => c.id === item.id);
                                return {
                                    id: item.id,
                                    title: item.title || originalItem?.title || 'Title missing', // Prioritize AI title, then candidate, then fallback
                                    similarity: item.similarity,
                                    type: item.type,
                                    status: item.status || originalItem?.status,
                                    dueDate: item.dueDate || originalItem?.dueDate
                                };
                            })
                            .filter(item => item.title !== 'Title missing') // Remove items where title could not be found
                            .slice(0, maxResults);

                        console.log("Valid results after filtering and mapping:", validResults);
                        return validResults;
                    }
                } catch (jsonError) {
                    console.error('Error parsing JSON response:', jsonError);
                    // Fall back to simpler similarity matching
                    return this.fallbackSimilarityMatching(currentNote, candidates, maxResults);
                }
            }

            console.warn('AI response did not contain parseable JSON, falling back to simple matching');
            return this.fallbackSimilarityMatching(currentNote, candidates, maxResults);
        } catch (error) {
            console.error('Error with AI similarity matching:', error);
            // Fallback to simpler similarity matching on error
            return this.fallbackSimilarityMatching(currentNote, candidates, maxResults);
        }
    }

    private fallbackSimilarityMatching(
        currentNote: {
            title: string;
            content: string;
            tags: string[];
        },
        candidates: Array<{
            id: string;
            title: string;
            content: string;
            tags: string[];
            type: 'note' | 'idea' | 'task' | 'reminder';
            status?: string;
            dueDate?: string | null;
        }>,
        maxResults: number
    ) {
        // Combine all text from the current note
        const currentText = `${currentNote.title} ${currentNote.content} ${currentNote.tags.join(' ')}`.toLowerCase();
        const keywords = this.extractKeywords(currentText);

        // Score each candidate
        const scoredCandidates = candidates.map(candidate => {
            const candidateText = `${candidate.title} ${candidate.content} ${candidate.tags.join(' ')}`.toLowerCase();
            const similarity = this.calculateKeywordSimilarity(keywords, candidateText);

            return {
                ...candidate,
                similarity
            };
        });

        // Sort by similarity score and return top results
        return scoredCandidates
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }

    /**
     * Extract meaningful keywords from text
     */
    private extractKeywords(text: string): string[] {
        // Remove common words, keep words of length >= 4
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 4)
            .filter(word => !['this', 'that', 'with', 'from', 'have', 'what', 'when'].includes(word));
    }

    /**
     * Calculate similarity based on keyword matches
     */
    private calculateKeywordSimilarity(keywords: string[], targetText: string): number {
        if (keywords.length === 0) return 0;

        const matches = keywords.filter(keyword => targetText.includes(keyword)).length;
        return matches / keywords.length;
    }

    private async createSimilarItemsPrompt(
        currentNote: {
            title: string;
            content: string;
            tags: string[];
        },
        candidates: Array<{
            id: string;
            title: string;
            content: string;
            tags: string[];
            type: 'note' | 'idea' | 'task' | 'reminder';
        }>,
        maxResults: number
    ): Promise<string> {
        // Get system message if available
        const settings = await this.getSettings();
        const systemMessage = settings?.contentSuggestions?.systemMessage;

        // Base prompt
        let prompt = systemMessage ? `${systemMessage}\n\n` : '';

        prompt += `Find similar items to this content. Return a JSON array of the ${maxResults} most similar items, ranked by similarity (0-1 score).

Current item:
Title: ${currentNote.title}
Content: ${currentNote.content.length > 1000 ? currentNote.content.substring(0, 1000) + "..." : currentNote.content}
Tags: ${currentNote.tags?.join(', ') || 'None'}

Candidate items:
${candidates.slice(0, 50).map((item, index) => `
Item ${index + 1}:
ID: ${item.id}
Type: ${item.type}
Title: ${item.title}
Content: ${(item.content?.length || 0) > 200 ? item.content?.substring(0, 200) + "..." : item.content}
Tags: ${item.tags?.join(', ') || 'None'}
`).join('\n')}

Return ONLY a JSON array with the most similar items in this format:
[
    {
        "id": "item_id",
        "title": "Item Title",
        "type": "note/idea/task/reminder",
        "similarity": 0.95
    }
]

Include only the ${maxResults} most relevant items with the highest similarity score. Use a number between 0 and 1 for similarity.`;

        return prompt;
    }
}

// Create and export the service instance
export const similarContentService = new SimilarContentService(); 