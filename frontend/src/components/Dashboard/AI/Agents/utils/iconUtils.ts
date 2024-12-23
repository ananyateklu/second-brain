import { Bot, Sparkles, Brain, Zap, Atom, Glasses } from 'lucide-react';

// Bot icon mapping based on provider personality
export const getBotIcon = (provider: string) => {
    // Convert provider to lowercase for case-insensitive matching
    const providerLower = provider.toLowerCase();

    if (providerLower.includes('gpt') || providerLower.includes('openai')) {
        return Sparkles; // OpenAI: Sparkly and magical
    } else if (providerLower.includes('claude') || providerLower.includes('anthropic')) {
        return Glasses; // Claude: Intellectual and thoughtful
    } else if (providerLower.includes('gemini') || providerLower.includes('google')) {
        return Brain; // Google: Analytical and knowledge-focused
    } else if (providerLower.includes('llama') || providerLower.includes('meta') || providerLower.includes('local')) {
        return Atom; // Local/Meta/Llama: Scientific and experimental
    } else if (providerLower.includes('grok') || providerLower.includes('x.ai')) {
        return Zap; // Grok: Quick-witted and playful
    }

    return Bot; // Default fallback
}; 