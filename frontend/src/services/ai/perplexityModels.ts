import { AIModel } from '../../types/ai';

export const PERPLEXITY_MODELS: AIModel[] = [
    // Search Models
    {
        id: 'sonar',
        name: 'Sonar',
        provider: 'perplexity',
        category: 'search',
        description: 'Lightweight, cost-effective search model with grounding.',
        isConfigured: true,
        isReasoner: false,
        color: '#7049F0', // Perplexity Purple
        endpoint: 'search',
        rateLimits: {
            tpm: 60000,
            rpm: 30,
        },
    },
    {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        provider: 'perplexity',
        category: 'search',
        description: 'Advanced search offering with grounding, supporting complex queries and follow-ups.',
        isConfigured: true,
        isReasoner: false,
        color: '#7049F0', // Perplexity Purple
        endpoint: 'search',
        rateLimits: {
            tpm: 80000,
            rpm: 40,
        },
    },

    // Research Models
    {
        id: 'sonar-deep-research',
        name: 'Sonar Deep Research',
        provider: 'perplexity',
        category: 'research',
        description: 'Expert-level research model conducting exhaustive searches and generating comprehensive reports.',
        isConfigured: true,
        isReasoner: true,
        color: '#7049F0', // Perplexity Purple
        endpoint: 'search',
        rateLimits: {
            tpm: 100000,
            rpm: 50,
        },
    },

    // Reasoning Models
    {
        id: 'sonar-reasoning',
        name: 'Sonar Reasoning',
        provider: 'perplexity',
        category: 'reasoning',
        description: 'Fast, real-time reasoning model designed for quick problem-solving with search.',
        isConfigured: true,
        isReasoner: true,
        color: '#7049F0', // Perplexity Purple
        endpoint: 'search',
        rateLimits: {
            tpm: 90000,
            rpm: 45,
        },
    },
    {
        id: 'sonar-reasoning-pro',
        name: 'Sonar Reasoning Pro',
        provider: 'perplexity',
        category: 'reasoning',
        description: 'Premier reasoning offering powered by DeepSeek R1 with Chain of Thought (CoT).',
        isConfigured: true,
        isReasoner: true,
        color: '#7049F0', // Perplexity Purple
        endpoint: 'search',
        rateLimits: {
            tpm: 100000,
            rpm: 50,
        },
    }
]; 