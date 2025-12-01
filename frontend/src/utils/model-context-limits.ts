/**
 * Model Context Window Limits
 * Defines the maximum context window size (in tokens) for each supported AI model.
 */

/**
 * Context window limits by model name.
 * Uses pattern matching for model families (e.g., 'gpt-4o' matches 'gpt-4o-2024-08-06').
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
    // OpenAI Models
    'gpt-5.1': 128000,
    'gpt-5': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5-turbo-16k': 16385,
    'o1': 200000,
    'o1-mini': 128000,
    'o1-preview': 128000,
    'o3': 200000,
    'o3-mini': 200000,
    'chatgpt-4o-latest': 128000,
    'gpt-oss-120b': 128000,
    'gpt-oss-20b': 128000,

    // Anthropic Claude Models
    // Claude 4.x models
    'claude-sonnet-4': 200000,
    'claude-sonnet-4-20250514': 200000,
    'claude-opus-4': 200000,
    'claude-opus-4-20250514': 200000,
    // Claude 3.7 models
    'claude-3-7-sonnet': 200000,
    'claude-3-7-sonnet-20250219': 200000,
    'claude-3-7-sonnet-latest': 200000,
    // Claude 3.5 models
    'claude-3-5-sonnet': 200000,
    'claude-3-5-sonnet-latest': 200000,
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-sonnet-20240620': 200000,
    'claude-3-5-haiku': 200000,
    'claude-3-5-haiku-latest': 200000,
    'claude-3-5-haiku-20241022': 200000,
    // Claude 3.x models
    'claude-3-opus': 200000,
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku': 200000,
    'claude-3-haiku-20240307': 200000,
    // Legacy models
    'claude-2.1': 200000,
    'claude-2': 100000,

    // Google Gemini Models
    'gemini-3-pro': 1000000,
    'gemini-3': 1000000,
    'gemini-2.0-flash': 1000000,
    'gemini-2.0-flash-exp': 1000000,
    'gemini-1.5-pro': 2000000,
    'gemini-1.5-flash': 1000000,
    'gemini-1.0-pro': 32768,
    'gemini-pro': 32768,

    // X.AI Grok Models
    'grok-4': 256000,
    'grok-3': 131072,
    'grok-3-mini': 131072,
    'grok-2': 131072,
    'grok-beta': 131072,

    // Ollama Models (common defaults - actual limits vary)
    'llama4': 256000,
    'llama4-scout': 10000000,
    'llama4-maverick': 256000,
    'llama3.1': 128000,
    'llama3.1:8b': 128000,
    'llama3.1:70b': 128000,
    'llama3': 8192,
    'llama2': 4096,
    'mistral': 32768,
    'mixtral': 32768,
    'codellama': 16384,
    'qwen3-max': 128000,
    'qwen3': 32768,
    'qwen3:4b': 32768,
    'qwen2.5': 32768,
    'deepseek-coder': 16384,
    'phi-4': 128000,
    'phi-4-mini': 128000,
    'phi-4-mini-flash-reasoning': 128000,
    'phi3': 128000,
    'gemma2': 8192,
    'nomic-embed-text': 8192,
    'fara-7b': 32768,

    // Default fallback for unknown models
    'default': 8192,
};

/**
 * Get the context window limit for a given model.
 * Supports exact matches and prefix matching for model families.
 * 
 * @param model - The model name (e.g., 'gpt-4o-2024-08-06')
 * @returns The context window limit in tokens
 */
export function getModelContextLimit(model: string): number {
    if (!model) return MODEL_CONTEXT_LIMITS['default'];

    const normalizedModel = model.toLowerCase();

    // Try exact match first
    if (MODEL_CONTEXT_LIMITS[normalizedModel]) {
        return MODEL_CONTEXT_LIMITS[normalizedModel];
    }

    // Try prefix matching for versioned models (e.g., 'gpt-4o-2024-08-06' -> 'gpt-4o')
    for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
        if (key !== 'default' && normalizedModel.startsWith(key)) {
            return limit;
        }
    }

    // Try matching model families (order matters - more specific first)
    if (normalizedModel.includes('gpt-5')) return MODEL_CONTEXT_LIMITS['gpt-5.1'];
    if (normalizedModel.includes('gpt-4o')) return MODEL_CONTEXT_LIMITS['gpt-4o'];
    if (normalizedModel.includes('gpt-4-turbo')) return MODEL_CONTEXT_LIMITS['gpt-4-turbo'];
    if (normalizedModel.includes('gpt-4')) return MODEL_CONTEXT_LIMITS['gpt-4'];
    if (normalizedModel.includes('gpt-3.5')) return MODEL_CONTEXT_LIMITS['gpt-3.5-turbo'];
    if (normalizedModel.includes('claude-sonnet-4') || normalizedModel.includes('claude-4-sonnet')) return MODEL_CONTEXT_LIMITS['claude-sonnet-4'];
    if (normalizedModel.includes('claude-opus-4') || normalizedModel.includes('claude-4-opus')) return MODEL_CONTEXT_LIMITS['claude-opus-4'];
    if (normalizedModel.includes('claude-3-7-sonnet') || normalizedModel.includes('claude-3.7')) return MODEL_CONTEXT_LIMITS['claude-3-7-sonnet'];
    if (normalizedModel.includes('claude-3-5-sonnet')) return MODEL_CONTEXT_LIMITS['claude-3-5-sonnet'];
    if (normalizedModel.includes('claude-3-5-haiku')) return MODEL_CONTEXT_LIMITS['claude-3-5-haiku'];
    if (normalizedModel.includes('claude-3')) return MODEL_CONTEXT_LIMITS['claude-3-sonnet'];
    if (normalizedModel.includes('claude')) return MODEL_CONTEXT_LIMITS['claude-2.1'];
    if (normalizedModel.includes('gemini-3')) return MODEL_CONTEXT_LIMITS['gemini-3-pro'];
    if (normalizedModel.includes('gemini-2')) return MODEL_CONTEXT_LIMITS['gemini-2.0-flash'];
    if (normalizedModel.includes('gemini-1.5')) return MODEL_CONTEXT_LIMITS['gemini-1.5-flash'];
    if (normalizedModel.includes('gemini')) return MODEL_CONTEXT_LIMITS['gemini-pro'];
    if (normalizedModel.includes('grok-4')) return MODEL_CONTEXT_LIMITS['grok-4'];
    if (normalizedModel.includes('grok')) return MODEL_CONTEXT_LIMITS['grok-3'];
    if (normalizedModel.includes('llama4-scout')) return MODEL_CONTEXT_LIMITS['llama4-scout'];
    if (normalizedModel.includes('llama4')) return MODEL_CONTEXT_LIMITS['llama4'];
    if (normalizedModel.includes('llama3.1')) return MODEL_CONTEXT_LIMITS['llama3.1'];
    if (normalizedModel.includes('llama3')) return MODEL_CONTEXT_LIMITS['llama3'];
    if (normalizedModel.includes('llama')) return MODEL_CONTEXT_LIMITS['llama2'];
    if (normalizedModel.includes('mistral') || normalizedModel.includes('mixtral')) return MODEL_CONTEXT_LIMITS['mistral'];
    if (normalizedModel.includes('qwen3-max')) return MODEL_CONTEXT_LIMITS['qwen3-max'];
    if (normalizedModel.includes('qwen')) return MODEL_CONTEXT_LIMITS['qwen2.5'];
    if (normalizedModel.includes('phi-4')) return MODEL_CONTEXT_LIMITS['phi-4'];
    if (normalizedModel.includes('phi')) return MODEL_CONTEXT_LIMITS['phi3'];

    return MODEL_CONTEXT_LIMITS['default'];
}

/**
 * Format token count for display (e.g., 128000 -> "128K")
 */
export function formatTokenCount(tokens: number): string {
    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(tokens % 1000 === 0 ? 0 : 1)}K`;
    }
    return tokens.toString();
}

/**
 * Calculate warning level based on context usage percentage
 */
export function getContextWarningLevel(
    usedTokens: number,
    maxTokens: number
): 'normal' | 'warning' | 'critical' {
    const percentUsed = (usedTokens / maxTokens) * 100;

    if (percentUsed >= 85) return 'critical';
    if (percentUsed >= 60) return 'warning';
    return 'normal';
}

