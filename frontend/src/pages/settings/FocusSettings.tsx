import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { toast } from '../../hooks/use-toast';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../utils/model-name-formatter';
import { DEFAULT_PREFERENCES } from '../../services/user-preferences.service';

// Provider name mapping for health data
const PROVIDER_NAME_MAP: Record<string, string> = {
  'OpenAI': 'OpenAI',
  'Claude': 'Anthropic',
  'Anthropic': 'Anthropic',
  'Gemini': 'Gemini',
  'Ollama': 'Ollama',
  'Grok': 'Grok',
};

// AI Provider options for Focus
// Note: IDs must match backend AIProviderFactory names: openai, gemini, claude, ollama, grok, xai, cohere
const FOCUS_AI_PROVIDERS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'GPT models for fast, reliable suggestions. Recommended for most users.' },
  { id: 'Claude', name: 'Anthropic', description: 'Claude models for nuanced, thoughtful suggestions.' },
  { id: 'Gemini', name: 'Gemini', description: 'Google Gemini models. Cost-effective with good performance.' },
  { id: 'Grok', name: 'xAI', description: 'xAI Grok models for conversational suggestions.' },
  { id: 'Ollama', name: 'Ollama', description: 'Local models. No API costs, fully private.' },
] as const;

// Focus AI Settings configuration
const FOCUS_GENERATION_SETTINGS = [
  {
    id: 'focusAITemperature',
    name: 'Temperature',
    description: 'Controls randomness in AI responses. Lower values (0.1-0.3) produce more focused, deterministic suggestions. Higher values (0.7-1.0) generate more creative, varied ideas. Default 0.7 balances creativity with relevance.',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.7,
    format: (v: number) => v.toFixed(2),
  },
  {
    id: 'focusAIMaxTokens',
    name: 'Max Tokens',
    description: 'Maximum length of AI-generated content. Higher values allow more detailed suggestions but increase response time and cost. 800 tokens is typically sufficient for 5 suggestions with descriptions.',
    min: 100,
    max: 4000,
    step: 50,
    default: 800,
  },
] as const;

const FOCUS_RAG_SETTINGS = [
  {
    id: 'focusAIRagTopK',
    name: 'Notes to Retrieve',
    description: 'Number of notes to fetch via RAG for generating Focus suggestions. Higher values (15-20) provide more context but may slow down suggestions. Lower values (5-10) are faster but may miss relevant notes.',
    min: 1,
    max: 20,
    step: 1,
    default: 10,
  },
  {
    id: 'focusAISimilarityThreshold',
    name: 'Similarity Threshold',
    description: 'Minimum semantic similarity score (0-1) for notes to be considered relevant. Lower values cast a wider net, higher values are stricter. 0.3 is a good balance for most note collections.',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.3,
    format: (v: number) => v.toFixed(2),
  },
] as const;

const FOCUS_SUGGESTION_SETTINGS = [
  {
    id: 'focusAIMaxSuggestions',
    name: 'Max Suggestions',
    description: 'Maximum number of Focus suggestions to generate. More suggestions provide variety but take longer to generate. 5 suggestions is a good balance for daily planning.',
    min: 1,
    max: 10,
    step: 1,
    default: 5,
  },
  {
    id: 'focusAIDedupThreshold',
    name: 'Dedup Threshold',
    description: 'Similarity threshold for suggestion deduplication. Suggestions more similar than this threshold are considered duplicates and filtered out. Higher values (0.85-0.95) allow more similar suggestions, lower values (0.7-0.8) are stricter.',
    min: 0.5,
    max: 1,
    step: 0.01,
    default: 0.85,
    format: (v: number) => v.toFixed(2),
  },
] as const;

export function FocusSettings() {
  const user = useBoundStore((state) => state.user);

  // Focus AI Settings
  const focusAIProvider = useBoundStore((state) => state.focusAIProvider);
  const focusAIModel = useBoundStore((state) => state.focusAIModel);
  const focusAITemperature = useBoundStore((state) => state.focusAITemperature);
  const focusAIMaxTokens = useBoundStore((state) => state.focusAIMaxTokens);
  const focusAIRagTopK = useBoundStore((state) => state.focusAIRagTopK);
  const focusAISimilarityThreshold = useBoundStore((state) => state.focusAISimilarityThreshold);
  const focusAIMaxSuggestions = useBoundStore((state) => state.focusAIMaxSuggestions);
  const focusAIDedupThreshold = useBoundStore((state) => state.focusAIDedupThreshold);

  // Setters
  const setFocusAIProvider = useBoundStore((state) => state.setFocusAIProvider);
  const setFocusAIModel = useBoundStore((state) => state.setFocusAIModel);
  const setFocusAITemperature = useBoundStore((state) => state.setFocusAITemperature);
  const setFocusAIMaxTokens = useBoundStore((state) => state.setFocusAIMaxTokens);
  const setFocusAIRagTopK = useBoundStore((state) => state.setFocusAIRagTopK);
  const setFocusAISimilarityThreshold = useBoundStore((state) => state.setFocusAISimilarityThreshold);
  const setFocusAIMaxSuggestions = useBoundStore((state) => state.setFocusAIMaxSuggestions);
  const setFocusAIDedupThreshold = useBoundStore((state) => state.setFocusAIDedupThreshold);

  // UI state
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Get AI health data for available models
  const { data: healthData, isLoading: isHealthLoading } = useAIHealth();

  // Get available models for selected provider
  const availableModels = useMemo(() => {
    if (!healthData?.providers || !focusAIProvider) return [];
    const providerData = healthData.providers.find(p => {
      const mappedName = PROVIDER_NAME_MAP[p.provider];
      return mappedName === focusAIProvider || p.provider === focusAIProvider;
    });
    return providerData?.availableModels || [];
  }, [healthData?.providers, focusAIProvider]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isModelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isModelOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModelOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModelOpen]);

  // Handle provider change
  const handleProviderChange = useCallback(async (providerId: string) => {
    if (!user?.userId) return;

    setIsSavingProvider(true);
    try {
      await setFocusAIProvider(providerId, true);
      // Reset model when provider changes
      await setFocusAIModel(null, true);
      toast.success('Focus AI Provider Updated', `Now using ${providerId}`);
    } catch (error) {
      console.error('Failed to update Focus AI provider:', { error });
      toast.error('Failed to save provider', 'Please try again.');
    } finally {
      setIsSavingProvider(false);
    }
  }, [user?.userId, setFocusAIProvider, setFocusAIModel]);

  // Handle model selection
  const handleModelSelect = useCallback(async (model: string) => {
    setIsModelOpen(false);
    try {
      await setFocusAIModel(model, true);
      toast.success('Focus AI Model Updated', `Now using ${formatModelName(model)}`);
    } catch (error) {
      console.error('Failed to update Focus AI model:', { error });
      toast.error('Failed to save model', 'Please try again.');
    }
  }, [setFocusAIModel]);

  // Get current value for a setting
  const getSettingValue = useCallback((id: string): number => {
    switch (id) {
      case 'focusAITemperature': return focusAITemperature;
      case 'focusAIMaxTokens': return focusAIMaxTokens;
      case 'focusAIRagTopK': return focusAIRagTopK;
      case 'focusAISimilarityThreshold': return focusAISimilarityThreshold;
      case 'focusAIMaxSuggestions': return focusAIMaxSuggestions;
      case 'focusAIDedupThreshold': return focusAIDedupThreshold;
      default: return 0;
    }
  }, [focusAITemperature, focusAIMaxTokens, focusAIRagTopK, focusAISimilarityThreshold, focusAIMaxSuggestions, focusAIDedupThreshold]);

  // Handle setting change
  const handleSettingChange = useCallback(async (id: string, value: number) => {
    if (!user?.userId) return;

    setSavingSetting(id);
    try {
      switch (id) {
        case 'focusAITemperature':
          await setFocusAITemperature(value);
          break;
        case 'focusAIMaxTokens':
          await setFocusAIMaxTokens(value);
          break;
        case 'focusAIRagTopK':
          await setFocusAIRagTopK(value);
          break;
        case 'focusAISimilarityThreshold':
          await setFocusAISimilarityThreshold(value);
          break;
        case 'focusAIMaxSuggestions':
          await setFocusAIMaxSuggestions(value);
          break;
        case 'focusAIDedupThreshold':
          await setFocusAIDedupThreshold(value);
          break;
      }
    } catch (error) {
      console.error(`Failed to update ${id}:`, { error });
      toast.error('Failed to save setting', 'Please try again.');
    } finally {
      setSavingSetting(null);
    }
  }, [user?.userId, setFocusAITemperature, setFocusAIMaxTokens, setFocusAIRagTopK, setFocusAISimilarityThreshold, setFocusAIMaxSuggestions, setFocusAIDedupThreshold]);

  // Check if settings differ from defaults
  const hasChangedSettings = useMemo(() => {
    return (
      focusAIProvider !== DEFAULT_PREFERENCES.focusAIProvider ||
      focusAIModel !== DEFAULT_PREFERENCES.focusAIModel ||
      focusAITemperature !== DEFAULT_PREFERENCES.focusAITemperature ||
      focusAIMaxTokens !== DEFAULT_PREFERENCES.focusAIMaxTokens ||
      focusAIRagTopK !== DEFAULT_PREFERENCES.focusAIRagTopK ||
      focusAISimilarityThreshold !== DEFAULT_PREFERENCES.focusAISimilarityThreshold ||
      focusAIMaxSuggestions !== DEFAULT_PREFERENCES.focusAIMaxSuggestions ||
      focusAIDedupThreshold !== DEFAULT_PREFERENCES.focusAIDedupThreshold
    );
  }, [focusAIProvider, focusAIModel, focusAITemperature, focusAIMaxTokens, focusAIRagTopK, focusAISimilarityThreshold, focusAIMaxSuggestions, focusAIDedupThreshold]);

  // Reset to defaults
  const handleResetToDefaults = useCallback(async () => {
    if (!user?.userId) return;

    try {
      await setFocusAIProvider(DEFAULT_PREFERENCES.focusAIProvider, true);
      await setFocusAIModel(DEFAULT_PREFERENCES.focusAIModel, true);
      await setFocusAITemperature(DEFAULT_PREFERENCES.focusAITemperature);
      await setFocusAIMaxTokens(DEFAULT_PREFERENCES.focusAIMaxTokens);
      await setFocusAIRagTopK(DEFAULT_PREFERENCES.focusAIRagTopK);
      await setFocusAISimilarityThreshold(DEFAULT_PREFERENCES.focusAISimilarityThreshold);
      await setFocusAIMaxSuggestions(DEFAULT_PREFERENCES.focusAIMaxSuggestions);
      await setFocusAIDedupThreshold(DEFAULT_PREFERENCES.focusAIDedupThreshold);
      toast.success('Settings Reset', 'Focus AI settings restored to defaults.');
    } catch (error) {
      console.error('Failed to reset settings:', { error });
      toast.error('Failed to reset settings', 'Please try again.');
    }
  }, [user?.userId, setFocusAIProvider, setFocusAIModel, setFocusAITemperature, setFocusAIMaxTokens, setFocusAIRagTopK, setFocusAISimilarityThreshold, setFocusAIMaxSuggestions, setFocusAIDedupThreshold]);

  // Render slider setting
  const renderSliderSetting = (setting: typeof FOCUS_GENERATION_SETTINGS[number] | typeof FOCUS_RAG_SETTINGS[number] | typeof FOCUS_SUGGESTION_SETTINGS[number]) => {
    const value = getSettingValue(setting.id);
    const displayValue = 'format' in setting ? setting.format(value) : value.toString();
    const isSaving = savingSetting === setting.id;
    const percentage = ((value - setting.min) / (setting.max - setting.min)) * 100;

    return (
      <div key={setting.id} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {setting.name}
            </span>
            <Tooltip content={setting.description}>
              <InfoIcon />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Saving...
              </span>
            )}
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-md"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                color: 'var(--color-brand-600)',
              }}
            >
              {displayValue}
            </span>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value}
            onChange={(e) => void handleSettingChange(setting.id, parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: `linear-gradient(to right, var(--btn-primary-bg) 0%, var(--btn-primary-bg) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
              accentColor: 'var(--btn-primary-bg)',
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{setting.min}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{setting.max}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* AI Provider & Model Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-600)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                AI Configuration
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Provider & Model
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Select the AI provider and model for Focus suggestions and summaries
            </p>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Provider</span>
            {isSavingProvider && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AI_PROVIDERS.map((provider) => {
              const isSelected = focusAIProvider === provider.id;
              const providerHealth = healthData?.providers?.find(p => {
                const mappedName = PROVIDER_NAME_MAP[p.provider];
                return mappedName === provider.id || p.provider === provider.id;
              });
              const isHealthy = providerHealth?.isHealthy ?? false;

              return (
                <Tooltip key={provider.id} content={provider.description}>
                  <button
                    onClick={() => void handleProviderChange(provider.id)}
                    disabled={isSavingProvider || !isHealthy}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                      !isHealthy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--btn-primary-bg)'
                        : 'var(--surface-elevated)',
                      borderColor: isSelected
                        ? 'var(--btn-primary-border)'
                        : 'var(--border)',
                      color: isSelected
                        ? 'var(--btn-primary-text)'
                        : 'var(--text-primary)',
                    }}
                  >
                    {provider.name}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        {focusAIProvider && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Model</span>
            </div>
            <div ref={modelDropdownRef} className="relative">
              <button
                onClick={() => setIsModelOpen(!isModelOpen)}
                disabled={isHealthLoading || availableModels.length === 0}
                className="w-full px-3 py-2 text-sm text-left rounded-xl border transition-all duration-200 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: focusAIModel ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <span>{focusAIModel ? formatModelName(focusAIModel) : 'Select a model...'}</span>
                <svg className={`h-4 w-4 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isModelOpen && availableModels.length > 0 && (
                <div
                  className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border shadow-lg"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {availableModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => void handleModelSelect(model)}
                      className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[color:var(--surface-hover)]"
                      style={{
                        color: model === focusAIModel ? 'var(--color-brand-600)' : 'var(--text-primary)',
                        backgroundColor: model === focusAIModel ? 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)' : 'transparent',
                      }}
                    >
                      {formatModelName(model)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Generation Settings Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-600)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Generation
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Response Settings
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Control how the AI generates Focus suggestions
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {FOCUS_GENERATION_SETTINGS.map(renderSliderSetting)}
        </div>
      </section>

      {/* RAG Settings Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-600)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Retrieval
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Note Retrieval Settings
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Control how notes are retrieved for generating suggestions
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {FOCUS_RAG_SETTINGS.map(renderSliderSetting)}
        </div>
      </section>

      {/* Suggestion Settings Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-600)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Suggestions
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Suggestion Output Settings
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Control how many suggestions are generated and filtered
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {FOCUS_SUGGESTION_SETTINGS.map(renderSliderSetting)}
        </div>
      </section>

      {/* Reset to Defaults */}
      {hasChangedSettings && (
        <div className="flex justify-end">
          <button
            onClick={() => void handleResetToDefaults()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
