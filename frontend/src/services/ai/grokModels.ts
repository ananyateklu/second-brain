import { AIModel } from '../../types/ai';

export const GROK_MODELS: AIModel[] = [
    {
        id: 'grok-beta',
        name: 'Grok Beta',
        provider: 'grok',
        category: 'chat',
        description: 'Comparable performance to Grok 2 but with improved efficiency, speed and capabilities',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2', // X/Twitter blue color
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
        },
        size: '314B',
    },
    {
        id: 'grok-beta-agent',
        name: 'Grok Beta (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Comparable performance to Grok 2 but with improved efficiency, speed and capabilities',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2', // X/Twitter blue color
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
        },
        size: '314B',
    },
    // New Models from Table
    {
        id: 'grok-3-beta',
        name: 'Grok 3 Beta',
        provider: 'grok',
        category: 'chat',
        description: 'Flagship model for enterprise tasks: data extraction, programming, text summarization. Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-3-beta-agent',
        name: 'Grok 3 Beta (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Flagship model for enterprise tasks: data extraction, programming, text summarization. Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-3-mini-beta',
        name: 'Grok 3 Mini Beta',
        provider: 'grok',
        category: 'chat',
        description: 'Lightweight model that thinks before responding. Excels at quantitative tasks, math, and reasoning. Context: 131072.',
        isConfigured: true,
        isReasoner: true,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-3-mini-beta-agent',
        name: 'Grok 3 Mini Beta (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Lightweight model that thinks before responding. Excels at quantitative tasks, math, and reasoning. Context: 131072.',
        isConfigured: true,
        isReasoner: true,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-2-vision-1212',
        name: 'Grok 2 Vision 1212',
        provider: 'grok',
        category: 'chat',
        description: 'Latest multimodal model (processes documents, diagrams, charts, screenshots, photos). Context: 8192.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-2-vision-1212-agent',
        name: 'Grok 2 Vision 1212 (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Latest multimodal model (processes documents, diagrams, charts, screenshots, photos). Context: 8192.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-2-image-1212',
        name: 'Grok 2 Image 1212',
        provider: 'grok',
        category: 'image',
        description: 'Latest image generation model. Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'images',
        rateLimits: {
            rpm: 500, // Adapted from DALL-E like structure
            imagesPerMinute: 5, // Placeholder, adapt as needed
            maxInputTokens: 131072,
            // Including other typical Grok limits for completeness if applicable for text part of prompt
            tpm: 100000,
            rpd: 10000,
            tpd: 1000000,
        },
    },
    {
        id: 'grok-2-1212',
        name: 'Grok 2 1212',
        provider: 'grok',
        category: 'chat',
        description: 'Latest text model with improved efficiency, speed and capabilities. Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-2-1212-agent',
        name: 'Grok 2 1212 (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Latest text model with improved efficiency, speed and capabilities. Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-vision-beta',
        name: 'Grok Vision Beta',
        provider: 'grok',
        category: 'chat',
        description: 'Previous image understanding model. Context: 8192.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-vision-beta-agent',
        name: 'Grok Vision Beta (Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Previous image understanding model. Context: 8192.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-beta-vision-131k', // Unique ID for table's "grok-beta" vision model
        name: 'Grok Beta (Vision 131k)',
        provider: 'grok',
        category: 'chat',
        description: 'Latest image understanding model (documents, diagrams, charts, screenshots, photos). Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'chat',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
    {
        id: 'grok-beta-vision-131k-agent', // Unique ID for agent version
        name: 'Grok Beta (Vision 131k, Agent)',
        provider: 'grok',
        category: 'agent',
        description: 'Latest image understanding model (documents, diagrams, charts, screenshots, photos). Context: 131072.',
        isConfigured: true,
        isReasoner: false,
        color: '#1DA1F2',
        endpoint: 'agent',
        rateLimits: {
            tpm: 100000,
            rpm: 500,
            rpd: 10000,
            tpd: 1000000,
            maxInputTokens: 131072,
            maxOutputTokens: 8192,
        },
    },
]; 