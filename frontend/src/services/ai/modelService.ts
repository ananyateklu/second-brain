import { AIModel } from '../../types/ai';
import { AI_MODELS } from './models';
import { aiServiceInstance } from '../aiServiceInstance';

export class ModelService {
    private cachedModels: AIModel[] | null = null;
    private modelsLastFetched: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    getAllModels(): AIModel[] {
        return AI_MODELS;
    }

    async getAvailableModels(): Promise<AIModel[]> {
        // Check if we have cached models that are still valid
        const now = Date.now();
        if (this.cachedModels && (now - this.modelsLastFetched < this.CACHE_DURATION)) {
            return this.cachedModels;
        }

        try {
            // Get models from AIService
            const models = await aiServiceInstance.getAvailableModels();

            // Cache the result
            this.cachedModels = models;
            this.modelsLastFetched = now;

            return models;
        } catch (error) {
            console.error('Error fetching available models in modelService:', error);

            // Fall back to static models if AIService call fails
            return this.getAllModels();
        }
    }

    getAgentModels(): AIModel[] {
        return AI_MODELS.filter(model =>
            model.category === 'agent' &&
            model.endpoint === 'agent'
        );
    }

    getChatModels(): AIModel[] {
        return AI_MODELS.filter(model => model.category === 'chat');
    }

    getImageModels(): AIModel[] {
        return AI_MODELS.filter(model => model.category === 'image');
    }

    getAudioModels(): AIModel[] {
        return AI_MODELS.filter(model => model.category === 'audio');
    }

    getEmbeddingModels(): AIModel[] {
        return AI_MODELS.filter(model => model.category === 'embedding');
    }

    getRagModels(): AIModel[] {
        return AI_MODELS.filter(model => model.category === 'rag');
    }

    getFunctionModels(): AIModel[] {
        return [];
    }
}

export const modelService = new ModelService(); 