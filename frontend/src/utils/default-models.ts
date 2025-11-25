/**
 * Default model selection utility
 * Returns the preferred default model for each provider when no saved preference exists
 */

const DEFAULT_MODELS: Record<string, string> = {
    // Case-insensitive keys for matching
    openai: 'gpt-5.1-2025-11-13',
    gemini: 'gemini-2.5-flash',
    anthropic: 'claude-haiku-4-5-20251001',
    ollama: 'qwen3:4b',
    xai: 'grok-3-mini',
};

/**
 * Gets the default model for a provider
 * @param provider - The provider name (e.g., 'openai', 'anthropic', 'gemini')
 * @param availableModels - List of available models for the provider
 * @returns The default model if found, otherwise the first available model
 */
export function getDefaultModelForProvider(
    provider: string,
    availableModels: string[]
): string {
    if (!provider || availableModels.length === 0) {
        return '';
    }

    const providerLower = provider.toLowerCase();

    // Try to find the preferred default model
    const preferredModel = DEFAULT_MODELS[providerLower];
    if (preferredModel && availableModels.includes(preferredModel)) {
        return preferredModel;
    }

    // Try partial matches (e.g., "gpt-5.1" might be "gpt-5.1-turbo" or similar)
    if (preferredModel) {
        const matchingModel = availableModels.find(model =>
            model.toLowerCase().includes(preferredModel.toLowerCase())
        );
        if (matchingModel) {
            return matchingModel;
        }
    }

    // Fallback to first available model
    return availableModels[0] || '';
}

/**
 * Gets all default models mapping
 */
export function getDefaultModels(): Record<string, string> {
    return { ...DEFAULT_MODELS };
}

