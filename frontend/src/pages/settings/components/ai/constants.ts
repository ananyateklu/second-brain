/**
 * AI Settings Constants
 * Centralized configuration for AI providers
 */

export const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Gemini' },
  { id: 'ollama', name: 'Ollama' },
  { id: 'xai', name: 'xAI' },
] as const;

export type AIProviderId = typeof AI_PROVIDERS[number]['id'];

export interface ProviderDetails {
  tagline: string;
  description: string;
  highlights: string[];
  docsUrl?: string;
  billingNote?: string;
}

export const PROVIDER_DETAILS: Record<string, ProviderDetails> = {
  openai: {
    tagline: 'General-purpose GPT stack with streaming, audio, and vision support.',
    description: 'Flexible API for chat, assistants, audio, and multimodal workflows with enterprise controls.',
    highlights: ['Lowest-latency GPT-4o family', 'Vision + image generation', 'Tool calling + JSON mode'],
    docsUrl: 'https://platform.openai.com/docs/overview',
    billingNote: 'Usage-based billing per prompt + completion token.',
  },
  anthropic: {
    tagline: 'Claude models tuned for long-context reasoning and safety.',
    description: 'Best when you need grounded, constitutional responses or 200K+ token conversations.',
    highlights: ['Long-context memory', 'Structured tool use', 'Strong policy guardrails'],
    docsUrl: 'https://docs.anthropic.com/en/api',
    billingNote: 'Tiered usage billing by input/output token.',
  },
  google: {
    tagline: 'Gemini platform for multimodal reasoning, image, and code.',
    description: 'Great for multi-turn creation, image+text prompts, and fast flash models.',
    highlights: ['Native multimodal', '1.5 Flash for real-time UX', 'Cacheable prompt snippets'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    billingNote: 'Usage-based billing with per-model pricing.',
  },
  ollama: {
    tagline: 'Self-host local models next to your stack.',
    description: 'Bring-your-own-weights runtime for open models like Llama, Gemma, and Mistral.',
    highlights: ['Runs on your hardware', 'Simple model pulls', 'Fine control over privacy'],
    docsUrl: 'https://github.com/ollama/ollama',
    billingNote: 'No vendor billing—cost tied to your compute.',
  },
  xai: {
    tagline: 'Grok models focused on real-time knowledge and reasoning.',
    description: 'Use for fast news-aware answers or coding with Grok-2.',
    highlights: ['Live data grounding', 'Fast code iterations', 'Conversational tone'],
    docsUrl: 'https://docs.x.ai/docs',
    billingNote: 'Subscription-based access; follow account quota.',
  },
};

/** Map backend provider names to frontend IDs */
export const PROVIDER_NAME_TO_ID: Record<string, string> = {
  'OpenAI': 'openai',
  'Claude': 'anthropic',
  'Gemini': 'google',
  'Ollama': 'ollama',
  'Grok': 'xai',
};

/** Map frontend IDs to config key names */
export const PROVIDER_ID_TO_CONFIG_KEY: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Gemini',
  'ollama': 'Ollama',
  'xai': 'XAI',
};

/** Model suggestions for troubleshooting */
export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  'openai': ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  'google': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  'xai': ['grok-2', 'grok-2-vision-1212', 'grok-beta'],
};

/** Get provider ID from backend provider name */
export const getProviderIdFromName = (providerName: string): string => {
  return PROVIDER_NAME_TO_ID[providerName] || providerName.toLowerCase();
};

/** Get config key from provider ID */
export const getProviderConfigKey = (providerId: string): string => {
  return PROVIDER_ID_TO_CONFIG_KEY[providerId] || providerId;
};
