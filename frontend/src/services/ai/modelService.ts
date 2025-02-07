import { AIModel } from '../../types/ai';
import { AI_MODELS } from './models';

export class ModelService {
    getAllModels(): AIModel[] {
        return AI_MODELS;
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
        return AI_MODELS.filter(model => model.category === 'function');
    }
}

export const modelService = new ModelService(); 