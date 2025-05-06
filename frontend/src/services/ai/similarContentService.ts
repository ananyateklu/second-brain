import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';
import { OllamaService } from './ollama';
import { GrokService } from './grok';
import { modelService } from './modelService';
import { Note } from '../../types/note';
import { Task } from '../../types/task';
import { Reminder } from '../../types/reminder';

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

    // Use the same model configuration as contentSuggestionService
    private get modelId(): string {
        const provider = this.provider;
        const selectedModelId = localStorage.getItem('content_suggestions_model');

        const availableChatModels = modelService.getChatModels()
            .filter(model => model.provider === provider && model.category === 'chat');

        if (availableChatModels.length === 0) {
            return provider === 'ollama' ? 'llama3.1:8b' :
                provider === 'grok' ? 'grok-beta' : 'gpt-4';
        }

        const isValidModel = availableChatModels.some(model => model.id === selectedModelId);
        if (selectedModelId && isValidModel) {
            return selectedModelId;
        }

        return availableChatModels[0]?.id ||
            (provider === 'ollama' ? 'llama3.1:8b' :
                provider === 'grok' ? 'grok-beta' : 'gpt-4');
    }

    private get provider(): 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok' {
        return (
            (localStorage.getItem('content_suggestions_provider') as
                | 'openai'
                | 'anthropic'
                | 'gemini'
                | 'ollama'
                | 'grok') || 'openai'
        );
    }

    private getServiceForProvider() {
        const provider = this.provider;
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
     * @param availableTasks All tasks in the system
     * @param availableReminders All reminders in the system
     * @param excludeIds IDs to exclude from results (like already linked items)
     * @param maxResults Maximum number of results to return
     * @returns List of similar items with similarity scores
     */
    async findSimilarContent(
        currentNoteContent: {
            id: string;
            title: string;
            content: string;
            tags: string[];
        },
        availableNotes: Note[],
        availableTasks: Task[],
        availableReminders: Reminder[] = [],
        excludeIds: string[] = [],
        maxResults: number = 5
    ): Promise<SimilarityResult[]> {
        try {
            console.log("findSimilarContent called with current note:", currentNoteContent.title);

            // Combine all items that aren't already linked
            const allItems = [
                ...availableNotes
                    .filter(note => note.id !== currentNoteContent.id && !excludeIds.includes(note.id))
                    .map(note => ({
                        id: note.id,
                        title: note.title,
                        content: note.content,
                        tags: note.tags,
                        type: note.isIdea ? 'idea' as const : 'note' as const
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
            const results = await this.findSimilarItemsViaAI(currentNoteContent, allItems, maxResults);
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
        const prompt = this.createSimilarItemsPrompt(currentNote, candidates, maxResults);
        const service = this.getServiceForProvider();

        try {
            console.log("Sending prompt to AI model:", this.modelId);

            const response = await service.sendMessage(prompt, this.modelId);
            console.log("Raw AI response:", response.content);

            const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                response.content.match(/\[([\s\S]*?)\]/) ||
                response.content.match(/{[\s\S]*?}/);

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
                }
            }

            // Fallback to a simple approach if AI response is not parseable
            console.log("Using fallback similarity matching");
            return this.fallbackSimilarityMatching(currentNote, candidates, maxResults);
        } catch (error) {
            console.error('Error getting AI recommendations:', error);
            return this.fallbackSimilarityMatching(currentNote, candidates, maxResults);
        }
    }

    /**
     * Fallback similarity matching using simple text matching when AI fails
     */
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

    /**
     * Create a prompt to find similar items using AI
     */
    private createSimilarItemsPrompt(
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
    ): string {
        return `I have a note in my Second Brain app and I need to find other items (notes, ideas, tasks, reminders) that are semantically similar or related to this note. Please analyze the content and identify the most relevant items to suggest linking.

CURRENT NOTE:
Title: ${currentNote.title}
Content: ${currentNote.content.slice(0, 1000)}${currentNote.content.length > 1000 ? '...' : ''}
Tags: ${currentNote.tags.join(', ')}

CANDIDATE ITEMS:
${candidates.map((item, index) => `
[Item ${index + 1}]
ID: ${item.id}
Type: ${item.type}
Title: ${item.title}
Content: ${item.content.slice(0, 400)}${item.content.length > 400 ? '...' : ''}
Tags: ${item.tags.join(', ')}
`).join('\n')}

For each candidate item, calculate a similarity score between 0 and 1 where:
- 1 means very closely related or almost identical in topic/content
- 0.7-0.9 means strongly related 
- 0.4-0.6 means moderately related or has some conceptual overlap
- 0.1-0.3 means weakly related
- 0 means completely unrelated

Return the top ${maxResults} most similar items in JSON format. Each item in the JSON array MUST include "id", "title", "similarity", and "type".
Example:
[
  {
    "id": "item_id_1",
    "title": "Example Note Title",
    "similarity": 0.85,
    "type": "note"
  },
  {
    "id": "item_id_2",
    "title": "Related Task Name",
    "similarity": 0.72,
    "type": "task"
  }
]

Only include items with meaningful similarity (score > 0.3). Ensure your response is a valid JSON array. If a title is long, you can truncate it, but it must be present.`;
    }
}

// Create and export the service instance
export const similarContentService = new SimilarContentService(); 