import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/theme-store';
import { useSettingsStore } from '../../store/settings-store';
import { useAuthStore } from '../../store/auth-store';
import { useOllamaDownloadStore, formatBytes, formatSpeed, formatTimeRemaining } from '../../store/ollama-download-store';
import { Modal } from '../../components/ui/Modal';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../utils/model-name-formatter';
import { toast } from '../../hooks/use-toast';
import anthropicLight from '../../assets/anthropic-light.svg';
import anthropicDark from '../../assets/anthropic-dark.svg';
import googleLogo from '../../assets/google.svg';
import ollamaLogo from '../../assets/ollama.png';
import openaiLight from '../../assets/openai-light.svg';
import openaiDark from '../../assets/openai-dark.svg';
import xaiLight from '../../assets/xai-light.svg';
import xaiDark from '../../assets/xai-dark.svg';

const AI_PROVIDERS = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'google', name: 'Gemini' },
    { id: 'ollama', name: 'Ollama' },
    { id: 'xai', name: 'xAI' },
] as const;

const PROVIDER_DETAILS: Record<string, {
    tagline: string;
    description: string;
    highlights: string[];
    docsUrl?: string;
    billingNote?: string;
}> = {
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

type VectorProvider = 'PostgreSQL' | 'Pinecone';

const VECTOR_STORE_OPTIONS: Array<{
    id: VectorProvider;
    label: string;
    badge?: string;
    description: string;
    features: string[];
}> = [
        {
            id: 'PostgreSQL',
            label: 'PostgreSQL',
            badge: 'Default',
            description: 'Local PostgreSQL database with pgvector extension for fast, efficient vector similarity search.',
            features: ['Local storage', 'Fast queries', 'Full control'],
        },
        {
            id: 'Pinecone',
            label: 'Pinecone',
            badge: 'Scalable',
            description: 'Vector database tuned for high-volume and multi-tenant knowledge bases.',
            features: ['Billions of vectors', 'Metadata filters', 'Hybrid search ready'],
        },
    ];

// Curated list of popular Ollama models
const POPULAR_OLLAMA_MODELS: Array<{
    name: string;
    tag: string;
    description: string;
    size: string;
    category: 'language' | 'code' | 'vision' | 'embedding';
}> = [
        // Language Models
        { name: 'llama3.2', tag: '3b', description: 'Latest Llama model, great for general use', size: '2.0 GB', category: 'language' },
        { name: 'llama3.2', tag: '1b', description: 'Compact Llama model for quick responses', size: '1.3 GB', category: 'language' },
        { name: 'qwen2.5', tag: '7b', description: 'Strong multilingual model from Alibaba', size: '4.7 GB', category: 'language' },
        { name: 'qwen2.5', tag: '3b', description: 'Efficient multilingual model', size: '1.9 GB', category: 'language' },
        { name: 'gemma2', tag: '9b', description: 'Google DeepMind model for text generation', size: '5.4 GB', category: 'language' },
        { name: 'gemma2', tag: '2b', description: 'Lightweight Google model', size: '1.6 GB', category: 'language' },
        { name: 'mistral', tag: '7b', description: 'Fast and efficient open model', size: '4.1 GB', category: 'language' },
        { name: 'phi3', tag: 'mini', description: 'Microsoft small language model', size: '2.3 GB', category: 'language' },
        { name: 'deepseek-r1', tag: '8b', description: 'Reasoning-focused model', size: '4.9 GB', category: 'language' },

        // Code Models
        { name: 'qwen2.5-coder', tag: '7b', description: 'Specialized for code generation', size: '4.7 GB', category: 'code' },
        { name: 'qwen2.5-coder', tag: '3b', description: 'Compact code assistant', size: '1.9 GB', category: 'code' },
        { name: 'codellama', tag: '7b', description: 'Meta code generation model', size: '3.8 GB', category: 'code' },
        { name: 'deepseek-coder-v2', tag: '16b', description: 'Advanced coding model', size: '8.9 GB', category: 'code' },
        { name: 'starcoder2', tag: '7b', description: 'Open-source code model', size: '4.0 GB', category: 'code' },

        // Vision Models
        { name: 'llava', tag: '7b', description: 'Vision-language model for image understanding', size: '4.7 GB', category: 'vision' },
        { name: 'llama3.2-vision', tag: '11b', description: 'Meta vision model for image analysis', size: '7.9 GB', category: 'vision' },
        { name: 'moondream', tag: '1.8b', description: 'Tiny vision model, fast inference', size: '1.7 GB', category: 'vision' },

        // Embedding Models
        { name: 'nomic-embed-text', tag: 'latest', description: 'High-quality text embeddings', size: '274 MB', category: 'embedding' },
        { name: 'mxbai-embed-large', tag: 'latest', description: 'Large embedding model', size: '670 MB', category: 'embedding' },
        { name: 'all-minilm', tag: 'latest', description: 'Fast sentence embeddings', size: '46 MB', category: 'embedding' },
    ];

const MODEL_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    language: { label: 'Language', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    code: { label: 'Code', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    vision: { label: 'Vision', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    embedding: { label: 'Embedding', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
};

export function AISettings() {
    const { theme } = useThemeStore();
    const {
        vectorStoreProvider,
        setVectorStoreProvider,
        syncPreferencesToBackend,
        ollamaRemoteUrl,
        useRemoteOllama,
        setOllamaRemoteUrl,
        setUseRemoteOllama,
    } = useSettingsStore();
    const user = useAuthStore((state) => state.user);
    const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useAIHealth();
    const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(null);
    const [isSavingVectorStore, setIsSavingVectorStore] = useState(false);
    const [isSavingOllama, setIsSavingOllama] = useState(false);
    const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaRemoteUrl || '');
    const [modelToDownload, setModelToDownload] = useState('');
    const [showPopularModels, setShowPopularModels] = useState(false);
    const [selectedModelCategory, setSelectedModelCategory] = useState<string | null>(null);

    // Ollama download store
    const { downloads, startDownload, cancelDownload, clearDownload, clearCompletedDownloads } = useOllamaDownloadStore();
    const activeDownloads = Object.values(downloads).filter(d => d.status === 'downloading' || d.status === 'pending');
    const completedDownloads = Object.values(downloads).filter(d => d.status === 'completed' || d.status === 'error' || d.status === 'cancelled');

    // Get Ollama health data to check which models are already downloaded
    const ollamaHealth = healthData?.providers?.find(p => p.provider === 'Ollama');
    const downloadedModels = ollamaHealth?.availableModels || [];

    // Sync localOllamaUrl with store value when it changes
    useEffect(() => {
        setLocalOllamaUrl(ollamaRemoteUrl || '');
    }, [ollamaRemoteUrl]);

    const isDarkMode = theme === 'dark' || theme === 'blue';

    // Map backend provider names to frontend IDs
    const getProviderIdFromName = (providerName: string): string => {
        const mapping: Record<string, string> = {
            'OpenAI': 'openai',
            'Claude': 'anthropic',
            'Gemini': 'google',
            'Ollama': 'ollama',
            'Grok': 'xai',
        };
        return mapping[providerName] || providerName.toLowerCase();
    };

    // Get health status for a provider by its ID
    const getProviderHealth = (providerId: string) => {
        if (!healthData?.providers) return null;
        return healthData.providers.find(
            (h) => getProviderIdFromName(h.provider) === providerId
        );
    };

    const getProviderLogo = (provider: string) => {
        switch (provider) {
            case 'openai':
                return isDarkMode ? openaiDark : openaiLight;
            case 'anthropic':
                return isDarkMode ? anthropicDark : anthropicLight;
            case 'google':
                return googleLogo;
            case 'ollama':
                return ollamaLogo;
            case 'xai':
                return isDarkMode ? xaiDark : xaiLight;
            default:
                return null;
        }
    };

    // Get the config key name for a provider
    const getProviderConfigKey = (providerId: string): string => {
        const mapping: Record<string, string> = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'google': 'Gemini',
            'ollama': 'Ollama',
            'xai': 'XAI',
        };
        return mapping[providerId] || providerId;
    };

    const formatCheckedAt = (timestamp?: string) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const providerHealthList = AI_PROVIDERS.map((provider) => getProviderHealth(provider.id));
    const healthyCount = providerHealthList.filter((health) => health?.isHealthy).length;
    const totalProviders = AI_PROVIDERS.length;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                <div className="space-y-6">
                    <section
                        className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                        style={{
                            backgroundColor: 'var(--surface-card)',
                            borderColor: 'var(--border)',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                    }}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                                        Provider Grid
                                    </span>
                                    <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                                        Connected AI services
                                    </h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        Click a provider to view configuration steps, health, and troubleshooting notes.
                                    </p>
                                </div>
                            </div>
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                                style={{
                                    border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    color: 'var(--color-brand-600)',
                                }}
                            >
                                {isHealthLoading ? (
                                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                {isHealthLoading ? 'Checking health…' : `${healthyCount}/${totalProviders} healthy`}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {AI_PROVIDERS.map((provider) => {
                                const logo = getProviderLogo(provider.id);
                                const health = getProviderHealth(provider.id);
                                const isHealthy = health?.isHealthy ?? false;
                                const status = health?.status ?? (isHealthLoading ? 'Checking...' : 'Unknown');
                                const errorMessage = health?.errorMessage;
                                const isDisabled = status === 'Disabled';
                                const lastChecked = formatCheckedAt(health?.checkedAt);
                                const latency = health?.responseTimeMs && health.responseTimeMs > 0 ? `${health.responseTimeMs}ms` : null;

                                // Determine status color
                                const getStatusColor = () => {
                                    if (isHealthLoading) return { bg: '#9ca3af', shadow: 'rgba(156, 163, 175, 0.2)' }; // Gray for loading
                                    if (isHealthy) return { bg: '#10b981', shadow: 'rgba(16, 185, 129, 0.2)' }; // Green for healthy
                                    if (isDisabled) return { bg: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.2)' }; // Amber/orange for disabled
                                    return { bg: '#ef4444', shadow: 'rgba(239, 68, 68, 0.2)' }; // Red for unhealthy/error
                                };

                                const statusColor = getStatusColor();

                                return (
                                    <div
                                        key={provider.id}
                                        className="group"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProvider({ id: provider.id, name: provider.name })}
                                            className="w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] focus-visible:ring-offset-[color:var(--surface-card)] hover:-translate-y-1 hover:shadow-lg"
                                            style={{
                                                backgroundColor: 'var(--surface-elevated)',
                                                borderColor: 'var(--border)',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 40%, var(--border))';
                                                e.currentTarget.style.boxShadow = '0 8px 20px color-mix(in srgb, var(--color-brand-900) 12%, transparent)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="relative flex h-12 w-12 items-center justify-center rounded-xl border"
                                                        style={{
                                                            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
                                                            backgroundColor: 'color-mix(in srgb, var(--surface-card) 60%, transparent)',
                                                        }}
                                                    >
                                                        {logo && (
                                                            provider.id === 'ollama' ? (
                                                                <img src={logo} alt={provider.name} className="h-7 w-7 object-contain" />
                                                            ) : (
                                                                <img src={logo} alt={provider.name} className="h-5 w-auto object-contain" />
                                                            )
                                                        )}
                                                        <span
                                                            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
                                                            style={{
                                                                backgroundColor: statusColor.bg,
                                                                borderColor: 'var(--surface-elevated)',
                                                                boxShadow: `0 0 0 2px ${statusColor.shadow}`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                            {provider.name}
                                                        </p>
                                                        {isHealthLoading ? (
                                                            <p
                                                                className="text-xs mt-0.5 truncate"
                                                                style={{ color: 'var(--text-secondary)' }}
                                                                title="Checking status"
                                                            >
                                                                Checking status…
                                                            </p>
                                                        ) : (
                                                            <span
                                                                className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                                                style={{
                                                                    backgroundColor: 'color-mix(in srgb, var(--surface-card) 65%, transparent)',
                                                                    borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
                                                                    color: isHealthy ? '#10b981' : isDisabled ? '#f59e0b' : '#ef4444',
                                                                }}
                                                                title={errorMessage || status}
                                                            >
                                                                {status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {latency && (
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Latency:</span>
                                                            {latency}
                                                        </span>
                                                    )}
                                                    {lastChecked && (
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Checked:</span>
                                                            {lastChecked}
                                                        </span>
                                                    )}
                                                    {health?.availableModels?.length ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Models:</span>
                                                            {health.availableModels
                                                                .slice(0, 1)
                                                                .map(formatModelName)
                                                                .join(', ')}
                                                            {health.availableModels.length > 4 && '…'}
                                                        </span>
                                                    ) : health?.version ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Version:</span>
                                                            {health.version}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="text-xs font-semibold text-right whitespace-nowrap flex items-center gap-1" style={{ color: 'var(--color-brand-600)' }}>
                                                    Details
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {errorMessage && (
                                                <p
                                                    className="mt-3 rounded-xl border px-3 py-2 text-xs"
                                                    style={{
                                                        borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
                                                        backgroundColor: 'color-mix(in srgb, #ef4444 6%, transparent)',
                                                        color: '#ef4444',
                                                    }}
                                                >
                                                    {errorMessage}
                                                </p>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section
                        className="rounded-3xl border p-6 transition-all duration-200 hover:shadow-xl"
                        style={{
                            backgroundColor: 'var(--surface-card)',
                            borderColor: 'var(--border)',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                    }}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-secondary)' }}>
                                        Chat Preference
                                    </span>
                                    <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                                        Vector store provider
                                    </h3>
                                    <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                                        Choose which store powers Retrieval-Augmented responses in chat. Manual indexing can still target multiple stores.
                                    </p>
                                </div>
                            </div>
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                                style={{
                                    border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                    color: 'var(--color-brand-600)',
                                }}
                            >
                                {isSavingVectorStore ? (
                                    <>
                                        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Used in live conversations
                                    </>
                                )}
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 mt-6">
                            {VECTOR_STORE_OPTIONS.map((option) => {
                                const isActive = vectorStoreProvider === option.id;
                                return (
                                    <button
                                        type="button"
                                        key={option.id}
                                        onClick={async () => {
                                            if (!user?.userId) {
                                                console.error('User not authenticated');
                                                return;
                                            }

                                            setIsSavingVectorStore(true);
                                            try {
                                                // Update local state first
                                                await setVectorStoreProvider(option.id, false);

                                                // Then sync to backend explicitly with userId
                                                await syncPreferencesToBackend(user.userId);
                                            } catch (error) {
                                                console.error('Failed to update vector store provider:', { error });
                                                toast.error('Failed to save vector store preference', 'Please try again.');
                                            } finally {
                                                setIsSavingVectorStore(false);
                                            }
                                        }}
                                        disabled={isSavingVectorStore}
                                        className="w-full text-left rounded-2xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: isActive
                                                ? 'color-mix(in srgb, var(--color-brand-600) 15%, var(--surface-card))'
                                                : 'var(--surface-elevated)',
                                            borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                                            color: 'var(--text-primary)',
                                            boxShadow: isActive
                                                ? '0 18px 35px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                                                : 'none',
                                            transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-elevated))';
                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 50%, var(--border))';
                                                e.currentTarget.style.boxShadow = '0 8px 16px color-mix(in srgb, var(--color-brand-900) 15%, transparent)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
                                                            : 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
                                                        borderColor: isActive
                                                            ? 'var(--color-brand-600)'
                                                            : 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                                    }}
                                                >
                                                    {option.id === 'PostgreSQL' ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)' }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)' }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-semibold">{option.label}</p>
                                                        {option.badge && (
                                                            <span
                                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                                                style={{
                                                                    border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
                                                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                                                                    color: 'var(--color-brand-600)',
                                                                }}
                                                            >
                                                                {option.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                        {option.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {option.features.map((feature) => (
                                                <span
                                                    key={feature}
                                                    className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1"
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? (isDarkMode
                                                                ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
                                                                : 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)')
                                                            : (isDarkMode
                                                                ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                                                                : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)'),
                                                        color: isActive
                                                            ? 'var(--color-brand-600)'
                                                            : (isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)'),
                                                        opacity: isActive ? 1 : (isDarkMode ? 1 : 0.7),
                                                    }}
                                                >
                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>

            {/* Provider Configuration Modal */}
            {selectedProvider && (
                <Modal
                    isOpen={!!selectedProvider}
                    onClose={() => setSelectedProvider(null)}
                    title={`Configure ${selectedProvider.name}`}
                    maxWidth="max-w-7xl"
                    icon={
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                >
                    <div className="space-y-4">
                        {(() => {
                            const health = getProviderHealth(selectedProvider.id);
                            const isDisabled = health?.status === 'Disabled';
                            const configKey = getProviderConfigKey(selectedProvider.id);
                            const configPath = 'backend/src/SecondBrain.API/appsettings.json';
                            const devConfigPath = 'backend/src/SecondBrain.API/appsettings.Development.json';
                            const providerDetails = PROVIDER_DETAILS[selectedProvider.id];

                            return (
                                <>
                                    {providerDetails && (
                                        <div
                                            className="rounded-xl border p-3 space-y-3"
                                            style={{
                                                backgroundColor: 'var(--surface-elevated)',
                                                borderColor: 'var(--border)',
                                            }}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="flex items-start gap-2">
                                                    {(() => {
                                                        const logo = getProviderLogo(selectedProvider.id);
                                                        return logo ? (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                                                                {selectedProvider.id === 'ollama' ? (
                                                                    <img src={logo ?? undefined} alt={selectedProvider.name} className="h-5 w-5 object-contain" />
                                                                ) : (
                                                                    <img src={logo ?? undefined} alt={selectedProvider.name} className="h-4 w-auto object-contain" />
                                                                )}
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    <div>
                                                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                            {selectedProvider.name}
                                                        </p>
                                                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                            {providerDetails.tagline}
                                                        </p>
                                                    </div>
                                                </div>
                                                {providerDetails.docsUrl && (
                                                    <a
                                                        href={providerDetails.docsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:scale-105 flex items-center gap-1"
                                                        style={{
                                                            borderColor: 'color-mix(in srgb, var(--color-brand-500) 35%, transparent)',
                                                            color: 'var(--color-brand-600)',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)';
                                                            e.currentTarget.style.borderColor = 'var(--color-brand-600)';
                                                            e.currentTarget.style.color = 'var(--color-brand-700)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-500) 35%, transparent)';
                                                            e.currentTarget.style.color = 'var(--color-brand-600)';
                                                        }}
                                                    >
                                                        View docs
                                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {providerDetails.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {providerDetails.highlights.map((highlight) => (
                                                    <span
                                                        key={highlight}
                                                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1"
                                                        style={{
                                                            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
                                                            backgroundColor: 'var(--surface-card)',
                                                            color: 'var(--text-primary)',
                                                        }}
                                                    >
                                                        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        {highlight}
                                                    </span>
                                                ))}
                                            </div>
                                            {providerDetails.billingNote && (
                                                <div className="pt-2 border-t flex items-start gap-1.5" style={{ borderColor: 'var(--border)' }}>
                                                    <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                                        {providerDetails.billingNote}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Health Status & Available Models - For all providers */}
                                    <div
                                        className="p-2.5 rounded-xl border"
                                        style={{
                                            backgroundColor: 'var(--surface-elevated)',
                                            borderColor: 'var(--border)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor: isDisabled ? '#f59e0b' : health?.isHealthy ? '#10b981' : '#ef4444',
                                                        boxShadow: `0 0 0 2px ${isDisabled ? 'rgba(245, 158, 11, 0.2)' : health?.isHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                    }}
                                                />
                                                <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {health?.status || 'Unknown'}
                                                </p>
                                                {health?.responseTimeMs && health.responseTimeMs > 0 && (
                                                    <p className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        {health.responseTimeMs}ms
                                                    </p>
                                                )}
                                            </div>
                                            {health?.availableModels && health.availableModels.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {health.availableModels.length} models
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {health?.errorMessage && (
                                            <p className="text-[9px] truncate mb-2" style={{ color: '#ef4444' }}>
                                                {health.errorMessage}
                                            </p>
                                        )}
                                        {health?.availableModels && health.availableModels.length > 0 && (
                                            <div
                                                className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    scrollbarColor: 'var(--border) transparent',
                                                }}
                                            >
                                                {health.availableModels.map((model) => (
                                                    <code
                                                        key={model}
                                                        className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: 'var(--surface-card)',
                                                            color: 'var(--text-primary)',
                                                            border: '1px solid var(--border)',
                                                        }}
                                                    >
                                                        {formatModelName(model)}
                                                    </code>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ollama Configuration - Only shown for Ollama provider */}
                                    {selectedProvider.id === 'ollama' && (
                                        <div className="space-y-3">
                                            {/* Toggle Switch */}
                                            <div className="flex items-center justify-between p-3 rounded-xl border" style={{
                                                backgroundColor: 'var(--surface-elevated)',
                                                borderColor: 'var(--border)',
                                            }}>
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0"
                                                        style={{
                                                            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
                                                            borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                                                        }}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                            Use Remote Ollama
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!user?.userId) return;
                                                        setIsSavingOllama(true);
                                                        try {
                                                            setUseRemoteOllama(!useRemoteOllama);
                                                            setTimeout(() => {
                                                                refetchHealth();
                                                            }, 100);
                                                        } catch (error) {
                                                            console.error('Failed to toggle remote Ollama:', { error });
                                                            toast.error('Failed to save setting', 'Please try again.');
                                                        } finally {
                                                            setIsSavingOllama(false);
                                                        }
                                                    }}
                                                    disabled={isSavingOllama}
                                                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                                                    style={{
                                                        backgroundColor: useRemoteOllama ? 'var(--color-brand-600)' : 'var(--border)',
                                                    }}
                                                >
                                                    <span
                                                        className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
                                                        style={{
                                                            backgroundColor: 'white',
                                                            transform: useRemoteOllama ? 'translateX(20px)' : 'translateX(0)',
                                                        }}
                                                    />
                                                </button>
                                            </div>

                                            {/* Remote URL Input and Model Download - Side by Side */}
                                            <div className="flex gap-3 flex-col sm:flex-row">
                                                {/* Remote URL Input - Only shown when remote is enabled */}
                                                {useRemoteOllama && (
                                                    <div className="flex-1 p-3 rounded-xl border space-y-2" style={{
                                                        backgroundColor: 'var(--surface-elevated)',
                                                        borderColor: 'var(--border)',
                                                    }}>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                            </svg>
                                                            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                                Remote Ollama URL
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={localOllamaUrl}
                                                                onChange={(e) => setLocalOllamaUrl(e.target.value)}
                                                                placeholder="http://192.168.1.100:11434"
                                                                className="flex-1 px-3 py-2 rounded-xl border text-xs transition-all duration-200 focus:outline-none focus:ring-2"
                                                                style={{
                                                                    backgroundColor: 'var(--surface-card)',
                                                                    borderColor: 'var(--border)',
                                                                    color: 'var(--text-primary)',
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!user?.userId) return;
                                                                    setIsSavingOllama(true);
                                                                    try {
                                                                        setOllamaRemoteUrl(localOllamaUrl || null);
                                                                        toast.success('Ollama URL saved', 'Your remote Ollama URL has been updated.');
                                                                        setTimeout(() => {
                                                                            refetchHealth();
                                                                        }, 100);
                                                                    } catch (error) {
                                                                        console.error('Failed to save Ollama URL:', { error });
                                                                        toast.error('Failed to save URL', 'Please try again.');
                                                                    } finally {
                                                                        setIsSavingOllama(false);
                                                                    }
                                                                }}
                                                                disabled={isSavingOllama || localOllamaUrl === (ollamaRemoteUrl || '')}
                                                                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                style={{
                                                                    backgroundColor: localOllamaUrl !== (ollamaRemoteUrl || '') ? 'var(--color-brand-600)' : 'var(--surface-card)',
                                                                    color: localOllamaUrl !== (ollamaRemoteUrl || '') ? 'white' : 'var(--text-secondary)',
                                                                    borderColor: 'var(--border)',
                                                                    border: '1px solid',
                                                                }}
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                                            Enter the IP and port (e.g., http://192.168.1.100:11434)
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Model Download Section */}
                                                <div className={`p-3 rounded-xl border space-y-2.5 ${useRemoteOllama ? 'flex-1' : ''}`} style={{
                                                    backgroundColor: 'var(--surface-elevated)',
                                                    borderColor: 'var(--border)',
                                                }}>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                            Download Model
                                                        </label>
                                                    </div>

                                                    {/* Model Input */}
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={modelToDownload}
                                                            onChange={(e) => setModelToDownload(e.target.value)}
                                                            placeholder="e.g., llama3:8b, codellama:13b"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && modelToDownload.trim()) {
                                                                    startDownload({
                                                                        modelName: modelToDownload.trim(),
                                                                        ollamaBaseUrl: useRemoteOllama ? ollamaRemoteUrl : null,
                                                                    });
                                                                    toast.success('Download started', `Downloading ${modelToDownload.trim()}...`);
                                                                    setModelToDownload('');
                                                                }
                                                            }}
                                                            className="flex-1 px-3 py-2 rounded-xl border text-xs transition-all duration-200 focus:outline-none focus:ring-2"
                                                            style={{
                                                                backgroundColor: 'var(--surface-card)',
                                                                borderColor: 'var(--border)',
                                                                color: 'var(--text-primary)',
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!modelToDownload.trim()) return;
                                                                startDownload({
                                                                    modelName: modelToDownload.trim(),
                                                                    ollamaBaseUrl: useRemoteOllama ? ollamaRemoteUrl : null,
                                                                });
                                                                toast.success('Download started', `Downloading ${modelToDownload.trim()}...`);
                                                                setModelToDownload('');
                                                            }}
                                                            disabled={!modelToDownload.trim()}
                                                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                            style={{
                                                                backgroundColor: modelToDownload.trim() ? 'var(--color-brand-600)' : 'var(--surface-card)',
                                                                color: modelToDownload.trim() ? 'white' : 'var(--text-secondary)',
                                                                borderColor: 'var(--border)',
                                                                border: '1px solid',
                                                            }}
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            Download
                                                        </button>
                                                    </div>

                                                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                                        Enter model from <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: 'var(--color-brand-600)' }}>Ollama Library</a>. Downloads run in background.
                                                    </p>

                                                    {/* Popular Models Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPopularModels(!showPopularModels)}
                                                        className="w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-200 hover:border-opacity-60"
                                                        style={{
                                                            backgroundColor: 'var(--surface-card)',
                                                            borderColor: 'var(--border)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                            </svg>
                                                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                Browse Popular Models
                                                            </span>
                                                        </div>
                                                        <svg
                                                            className={`h-3.5 w-3.5 transition-transform duration-200 ${showPopularModels ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {/* Popular Models List */}
                                                    {showPopularModels && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {/* Category Tabs */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedModelCategory(null)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border-2 ${selectedModelCategory === null ? 'border-current' : 'border-transparent'}`}
                                                                    style={{
                                                                        backgroundColor: selectedModelCategory === null ? 'var(--color-brand-600)' : 'var(--surface-card)',
                                                                        color: selectedModelCategory === null ? 'white' : 'var(--text-secondary)',
                                                                    }}
                                                                >
                                                                    All
                                                                </button>
                                                                {Object.entries(MODEL_CATEGORY_LABELS).map(([key, { label }]) => (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        onClick={() => setSelectedModelCategory(key)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border-2 ${selectedModelCategory === key ? 'border-current' : 'border-transparent'}`}
                                                                        style={{
                                                                            backgroundColor: selectedModelCategory === key ? 'var(--color-brand-600)' : 'var(--surface-card)',
                                                                            color: selectedModelCategory === key ? 'white' : 'var(--text-secondary)',
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            {/* Models Grid */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                                                {POPULAR_OLLAMA_MODELS
                                                                    .filter(model => selectedModelCategory === null || model.category === selectedModelCategory)
                                                                    .map((model) => {
                                                                        const fullName = `${model.name}:${model.tag}`;
                                                                        const isDownloaded = downloadedModels.some(m =>
                                                                            m.toLowerCase().includes(model.name.toLowerCase()) &&
                                                                            m.toLowerCase().includes(model.tag.toLowerCase())
                                                                        );
                                                                        const isDownloading = downloads[fullName]?.status === 'downloading' || downloads[fullName]?.status === 'pending';

                                                                        return (
                                                                            <div
                                                                                key={fullName}
                                                                                className="flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 hover:border-opacity-80"
                                                                                style={{
                                                                                    backgroundColor: isDownloaded ? 'color-mix(in srgb, #10b981 8%, var(--surface-card))' : 'var(--surface-card)',
                                                                                    borderColor: isDownloaded ? 'color-mix(in srgb, #10b981 30%, var(--border))' : 'var(--border)',
                                                                                }}
                                                                            >
                                                                                <div className="flex-1 min-w-0 mr-2">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                                                            {model.name}
                                                                                        </span>
                                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                                                                            backgroundColor: 'var(--surface-elevated)',
                                                                                            color: 'var(--text-secondary)'
                                                                                        }}>
                                                                                            {model.tag}
                                                                                        </span>
                                                                                        {isDownloaded && (
                                                                                            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                            </svg>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                                                        {model.description} • {model.size}
                                                                                    </p>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (isDownloaded || isDownloading) return;
                                                                                        startDownload({
                                                                                            modelName: fullName,
                                                                                            ollamaBaseUrl: useRemoteOllama ? ollamaRemoteUrl : null,
                                                                                        });
                                                                                        toast.success('Download started', `Downloading ${fullName}...`);
                                                                                    }}
                                                                                    disabled={isDownloaded || isDownloading}
                                                                                    className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    style={{
                                                                                        backgroundColor: isDownloaded ? 'transparent' : 'var(--color-brand-600)',
                                                                                        color: isDownloaded ? '#10b981' : 'white',
                                                                                    }}
                                                                                    title={isDownloaded ? 'Already downloaded' : isDownloading ? 'Downloading...' : `Download ${fullName}`}
                                                                                >
                                                                                    {isDownloading ? (
                                                                                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                        </svg>
                                                                                    ) : isDownloaded ? (
                                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                        </svg>
                                                                                    ) : (
                                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                                        </svg>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Active Downloads */}
                                                    {activeDownloads.length > 0 && (
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                                    Active Downloads ({activeDownloads.length})
                                                                </p>
                                                            </div>
                                                            {activeDownloads.map((download) => (
                                                                <div
                                                                    key={download.modelName}
                                                                    className="p-3 rounded-xl border space-y-2"
                                                                    style={{
                                                                        backgroundColor: 'var(--surface-card)',
                                                                        borderColor: 'var(--border)',
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-brand-600)' }} />
                                                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                                {download.modelName}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => cancelDownload(download.modelName)}
                                                                            className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
                                                                            style={{ color: '#ef4444' }}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>

                                                                    {/* Progress Bar */}
                                                                    {download.progress && (
                                                                        <>
                                                                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                                                                <div
                                                                                    className="h-full rounded-full transition-all duration-300"
                                                                                    style={{
                                                                                        backgroundColor: 'var(--color-brand-600)',
                                                                                        width: `${download.progress.percentage || 0}%`,
                                                                                    }}
                                                                                />
                                                                            </div>

                                                                            {/* Progress Details */}
                                                                            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                                                <div className="flex items-center gap-3">
                                                                                    <span>{download.progress.percentage?.toFixed(1) || 0}%</span>
                                                                                    {download.progress.completedBytes !== undefined && download.progress.totalBytes !== undefined && (
                                                                                        <span>
                                                                                            {formatBytes(download.progress.completedBytes)} / {formatBytes(download.progress.totalBytes)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    {download.progress.bytesPerSecond !== undefined && download.progress.bytesPerSecond > 0 && (
                                                                                        <span>{formatSpeed(download.progress.bytesPerSecond)}</span>
                                                                                    )}
                                                                                    {download.progress.estimatedSecondsRemaining !== undefined && download.progress.estimatedSecondsRemaining > 0 && (
                                                                                        <span>ETA: {formatTimeRemaining(download.progress.estimatedSecondsRemaining)}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Status */}
                                                                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                                                {download.progress.status}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Completed Downloads */}
                                                    {completedDownloads.length > 0 && (
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                                    Recent Downloads
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clearCompletedDownloads()}
                                                                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>
                                                            {completedDownloads.slice(0, 3).map((download) => (
                                                                <div
                                                                    key={download.modelName}
                                                                    className="flex items-center justify-between p-2 rounded-lg"
                                                                    style={{
                                                                        backgroundColor: download.status === 'completed'
                                                                            ? 'color-mix(in srgb, #10b981 10%, transparent)'
                                                                            : 'color-mix(in srgb, #ef4444 10%, transparent)',
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {download.status === 'completed' ? (
                                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        )}
                                                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                                            {download.modelName}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => clearDownload(download.modelName)}
                                                                        className="text-xs px-2 py-1 rounded transition-colors hover:opacity-70"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    {isDisabled && (
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    How to Enable {selectedProvider.name}
                                                </h3>
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    To enable this provider, you need to update your backend configuration file:
                                                </p>
                                            </div>

                                            <div
                                                className="p-4 rounded-lg border font-mono text-xs"
                                                style={{
                                                    backgroundColor: 'var(--surface-elevated)',
                                                    borderColor: 'var(--border)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                <div className="mb-2">
                                                    <span style={{ color: 'var(--text-secondary)' }}>File:</span>{' '}
                                                    <span className="font-semibold">{configPath}</span>
                                                    <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        (or {devConfigPath} for development)
                                                    </span>
                                                </div>
                                                <div className="mt-3">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Change:</span>
                                                    <div className="mt-1">
                                                        <span style={{ color: '#10b981' }}>"Enabled"</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>: </span>
                                                        <span style={{ color: '#ef4444' }}>false</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}> → </span>
                                                        <span style={{ color: '#10b981' }}>true</span>
                                                    </div>
                                                    <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        In the <span className="font-semibold">"{configKey}"</span> section
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="p-4 rounded-lg border-l-4 flex gap-3"
                                                style={{
                                                    backgroundColor: 'var(--surface-elevated)',
                                                    borderLeftColor: '#3b82f6',
                                                }}
                                            >
                                                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#3b82f6' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                                        Important
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        After updating the configuration file, you'll need to restart the backend server for the changes to take effect.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isDisabled && !health?.isHealthy && (
                                        <div className="space-y-3">
                                            <div
                                                className="p-4 rounded-lg border-l-4 flex gap-3"
                                                style={{
                                                    backgroundColor: 'var(--surface-elevated)',
                                                    borderLeftColor: '#ef4444',
                                                }}
                                            >
                                                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#ef4444' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                                        Provider is enabled but not working
                                                    </p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                        {health?.errorMessage || 'There may be an issue with the API key or connection.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Troubleshooting Steps */}
                                            <div
                                                className="p-4 rounded-lg border"
                                                style={{
                                                    backgroundColor: 'var(--surface-elevated)',
                                                    borderColor: 'var(--border)',
                                                }}
                                            >
                                                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                    Troubleshooting Steps:
                                                </h4>
                                                <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    <li className="flex items-start gap-2.5">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>1</span>
                                                        <span>Verify your API key is valid and has the correct permissions</span>
                                                    </li>
                                                    <li className="flex items-start gap-2.5">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>2</span>
                                                        <span>Check that the model name in configuration matches available models</span>
                                                    </li>
                                                    <li className="flex items-start gap-2.5">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>3</span>
                                                        <span>Ensure your API key has access to the configured model</span>
                                                    </li>
                                                    <li className="flex items-start gap-2.5">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>4</span>
                                                        <span>Verify network connectivity and firewall settings</span>
                                                    </li>
                                                    {health?.status === 'Unavailable' && (
                                                        <li className="flex items-start gap-2.5">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>5</span>
                                                            <span>
                                                                The model "{health?.errorMessage?.includes('model:') ? health.errorMessage.split('model:')[1]?.split('"')[0]?.trim() : configKey}" may not be available. Try a different model version.
                                                            </span>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>

                                            {/* Model Suggestions */}
                                            {(() => {
                                                const modelSuggestions: Record<string, string[]> = {
                                                    'openai': ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
                                                    'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                                                    'google': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
                                                    'xai': ['grok-2', 'grok-2-vision-1212', 'grok-beta'],
                                                };

                                                const suggestions = modelSuggestions[selectedProvider.id];
                                                if (suggestions) {
                                                    return (
                                                        <div
                                                            className="p-3 rounded-lg border"
                                                            style={{
                                                                backgroundColor: 'var(--surface-elevated)',
                                                                borderColor: 'var(--border)',
                                                            }}
                                                        >
                                                            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                </svg>
                                                                Try these model names:
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {suggestions.map((model) => (
                                                                    <code
                                                                        key={model}
                                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                                                                        style={{
                                                                            backgroundColor: 'var(--surface-card)',
                                                                            color: 'var(--text-primary)',
                                                                            border: '1px solid var(--border)',
                                                                        }}
                                                                    >
                                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                                        </svg>
                                                                        {model}
                                                                    </code>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </Modal>
            )}
        </div>
    );
}

