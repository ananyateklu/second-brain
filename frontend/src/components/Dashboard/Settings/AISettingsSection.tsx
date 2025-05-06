import { useState, useEffect, useRef } from 'react';
import { Bot, Settings2, AlertCircle, CheckCircle, Loader, Save, ChevronDown, Sliders, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../contexts/AIContext';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { modelService } from '../../../services/ai/modelService';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok';

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

export function AISettingsSection({ onSave }: AISettingsSectionProps) {
  const {
    isOpenAIConfigured,
    isAnthropicConfigured,
    isGeminiConfigured,
    isOllamaConfigured,
    isGrokConfigured,
    checkConfigurations
  } = useAI();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AISettings>({
    contentSuggestions: {
      provider: (localStorage.getItem('content_suggestions_provider') as AIProvider) || 'openai',
      modelId: localStorage.getItem('content_suggestions_model') ?? 'gpt-4',
      temperature: Number(localStorage.getItem('content_suggestions_temperature')) || 0.7,
      maxTokens: Number(localStorage.getItem('content_suggestions_max_tokens')) || 2000,
    },
    promptEnhancement: {
      provider: (localStorage.getItem('prompt_enhancement_provider') as AIProvider) || 'openai',
      modelId: localStorage.getItem('prompt_enhancement_model') ?? 'gpt-4',
      temperature: Number(localStorage.getItem('prompt_enhancement_temperature')) || 0.7,
      maxTokens: Number(localStorage.getItem('prompt_enhancement_max_tokens')) || 2000,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<TestResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [activeMode, setActiveMode] = useState<'content' | 'prompt'>('content');

  useEffect(() => {
    setIsChecking(true);
    checkConfigurations()
      .finally(() => setIsChecking(false));
  }, [checkConfigurations]);

  const configurationStatus = [
    { name: 'OpenAI', isConfigured: isOpenAIConfigured },
    { name: 'Anthropic', isConfigured: isAnthropicConfigured },
    { name: 'Gemini', isConfigured: isGeminiConfigured },
    { name: 'Ollama', isConfigured: isOllamaConfigured },
    { name: 'Grok', isConfigured: isGrokConfigured }
  ];

  // Use only chat models for content generation (exclude agent models)
  const contentGenerationModels = modelService.getChatModels();

  const getActiveSettings = () => {
    return activeMode === 'content' ? settings.contentSuggestions : settings.promptEnhancement;
  };

  const handleProviderChange = (provider: AIProvider) => {
    // Find a valid chat model for this provider
    const availableModelsForProvider = contentGenerationModels.filter(m => m.provider === provider);
    const firstModelForProvider = availableModelsForProvider.length > 0 ?
      availableModelsForProvider[0].id : undefined;

    const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';

    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type]!,
        provider,
        modelId: firstModelForProvider ?? prev[type]?.modelId ?? '',
      },
    }));

    localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_provider`, provider);

    if (firstModelForProvider) {
      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_model`, firstModelForProvider);
    }
  };

  const handleModelChange = (modelId: string) => {
    const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';

    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type]!,
        modelId,
      },
    }));
    localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_model`, modelId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      await onSave(settings);
      setSaveResult({ success: true, message: 'Settings saved successfully!' });
    } catch (error: unknown) {
      console.error('Failed to save settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings.';
      setSaveResult({ success: false, message: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const ProviderButton = ({
    provider,
    isSelected,
    onClick,
    isConfigured
  }: {
    provider: string;
    isSelected: boolean;
    onClick: () => void;
    isConfigured: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={!isConfigured}
      className={`
        relative px-3 py-2 rounded-lg transition-all duration-200
        ${isSelected
          ? 'bg-[var(--color-accent)] text-white'
          : `${getContainerBackground()} text-[var(--color-text)]`
        }
        ${!isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--color-accent)]/10'}
        border-[0.5px] border-white/10
        flex items-center justify-between gap-2
        group w-full
      `}
    >
      <span className="font-medium text-sm">{provider}</span>
      {isSelected && <CheckCircle className="w-4 h-4 shrink-0" />}
      {!isConfigured && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm text-white">Not Configured</span>
        </div>
      )}
    </button>
  );

  const ModelSelect = ({
    models,
    selectedId,
    onSelect
  }: {
    models: { id: string; name: string; provider: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'bottom' | 'top' });

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const dropdownHeight = Math.min(300, models.length * 36 + 8); // Approximate height of dropdown

        // Determine if dropdown should appear above or below
        const placement = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';

        setPosition({
          top: buttonRect.bottom + window.scrollY,
          left: buttonRect.left + window.scrollX,
          width: buttonRect.width,
          placement
        });
      }
    }, [isOpen, models.length]);

    const selectedModel = models.find(m => m.id === selectedId);

    // Group models by provider
    const groupedModels = models.reduce((acc, model) => {
      const provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2 rounded-lg transition-all duration-200
            ${getContainerBackground()}
            border-[0.5px] border-white/10
            flex items-center justify-between
            hover:bg-[var(--color-surfaceHover)]
            text-[var(--color-text)]
            ${isOpen ? 'ring-1 ring-[var(--color-accent)]/20' : ''}
          `}
        >
          <span className="font-medium text-sm truncate">
            {selectedModel?.name || 'Select a model'}
          </span>
          <ChevronDown
            className={`
              w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--color-textSecondary)]
              ${isOpen ? 'transform rotate-180' : ''}
            `}
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={`
              absolute z-[999]
              bg-[#1e293b] dark:bg-[#1e293b] rounded-lg
              border-[0.5px] border-white/10
              shadow-lg
              backdrop-blur-xl
              max-h-[300px] overflow-y-auto
              scrollbar-thin scrollbar-thumb-[var(--color-accent)]/10
              scrollbar-track-transparent
            `}
            style={{
              width: '100%',
              ...(position.placement === 'bottom'
                ? {
                  top: '100%',
                  marginTop: '4px'
                }
                : {
                  bottom: '100%',
                  marginBottom: '4px'
                }
              )
            }}
          >
            {Object.entries(groupedModels).map(([provider, providerModels], index) => (
              <div key={provider} className={index !== 0 ? 'border-t border-white/5' : ''}>
                <div className="px-3 py-1.5 text-xs font-medium text-[var(--color-textSecondary)] bg-[var(--color-surface)]/50">
                  {provider}
                </div>
                {providerModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelect(model.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left
                      flex items-center justify-between gap-2
                      transition-all duration-200
                      ${selectedId === model.id
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]'
                      }
                    `}
                  >
                    <span className="font-medium text-sm truncate">{model.name}</span>
                    {selectedId === model.id && (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--color-text)]">Provider Status</h4>
          <button
            onClick={() => {
              setIsChecking(true);
              checkConfigurations().finally(() => setIsChecking(false));
            }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg 
              ${getContainerBackground()}
              border-[0.5px] border-white/10
              text-[var(--color-text)] text-xs font-medium 
              transition-all duration-200 
              hover:bg-[var(--color-surfaceHover)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={isChecking}
          >
            <div className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`}>
              {isChecking ? <Loader className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
            </div>
            {isChecking ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {configurationStatus.map(({ name, isConfigured }) => (
            <motion.div
              key={name}
              variants={cardVariants}
              className={`
                ${getContainerBackground()}
                border-[0.5px] border-white/10
                backdrop-blur-xl rounded-lg p-2
                flex items-center gap-2
              `}
            >
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-md 
                ${isConfigured ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                backdrop-blur-sm border-[0.5px] border-white/10
              `}>
                {isConfigured ? (
                  <CheckCircle className="w-3 h-3 text-[var(--color-accent)]" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs text-[var(--color-text)] truncate">{name}</p>
                <p className={`text-xs ${isConfigured
                  ? 'text-[var(--color-accent)]'
                  : 'text-red-500'
                  }`}>
                  {isConfigured ? 'Configured' : 'Not Configured'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Model Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--color-text)]">AI Model Configuration</h4>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-surface)]/50 border-[0.5px] border-white/10">
            <button
              onClick={() => setActiveMode('content')}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                ${activeMode === 'content'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }
              `}
            >
              Content Generation
            </button>
            <button
              onClick={() => setActiveMode('prompt')}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                ${activeMode === 'prompt'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }
              `}
            >
              Prompt Enhancement
            </button>
          </div>
        </div>
        <motion.div
          variants={cardVariants}
          className={`space-y-6 p-6 min-h-[400px] ${getContainerBackground()} rounded-lg border-[0.5px] border-white/10`}
        >
          <div className="p-3 rounded-lg bg-[var(--color-accent)]/10 border-[0.5px] border-[var(--color-accent)]/20">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--color-accent)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-text)]">
                  <span className="font-medium">Direct Provider Integration:</span> Content suggestions use provider-specific API calls rather than the agent system to ensure reliability and proper endpoint routing.
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  When you select a provider below, only compatible chat models for that provider will be available for selection.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-medium text-[var(--color-text)]">
              AI Provider
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {configurationStatus.map(({ name, isConfigured }) => (
                <ProviderButton
                  key={name}
                  provider={name}
                  isSelected={getActiveSettings()?.provider.toLowerCase() === name.toLowerCase()}
                  onClick={() => handleProviderChange(name.toLowerCase() as AIProvider)}
                  isConfigured={isConfigured}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-medium text-[var(--color-text)]">
              Model
            </label>
            <ModelSelect
              models={contentGenerationModels.filter(
                model => model.provider.toLowerCase() === getActiveSettings()?.provider.toLowerCase()
              )}
              selectedId={getActiveSettings()?.modelId || ''}
              onSelect={handleModelChange}
            />
          </div>

          <div className="space-y-6 border-t border-white/10 pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
                <label className="block text-xs font-medium text-[var(--color-text)]">
                  Temperature (Creativity)
                </label>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={((getActiveSettings()?.temperature || 0.7) * 100)}
                  onChange={(e) => {
                    const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                    const newTemperature = Number(e.target.value) / 100;
                    setSettings(prev => ({
                      ...prev,
                      [type]: {
                        ...prev[type]!,
                        temperature: newTemperature
                      }
                    }));
                    localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_temperature`, String(newTemperature));
                  }}
                  className="
                    w-full h-1.5 rounded-lg appearance-none cursor-pointer
                    bg-[var(--color-surface)]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                  "
                />
                <span className="text-xs font-medium text-[var(--color-textSecondary)] w-12">
                  {((getActiveSettings()?.temperature || 0.7) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-[var(--color-textSecondary)]">
                Higher values make the output more creative but less predictable
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--color-accent)]" />
                <label className="block text-xs font-medium text-[var(--color-text)]">
                  Maximum Length
                </label>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={getActiveSettings()?.maxTokens || 2000}
                  onChange={(e) => {
                    const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                    const newMaxTokens = Number(e.target.value);
                    setSettings(prev => ({
                      ...prev,
                      [type]: {
                        ...prev[type]!,
                        maxTokens: newMaxTokens
                      }
                    }));
                    localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_max_tokens`, String(newMaxTokens));
                  }}
                  className="
                    w-full h-1.5 rounded-lg appearance-none cursor-pointer
                    bg-[var(--color-surface)]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                  "
                />
                <span className="text-xs font-medium text-[var(--color-textSecondary)] w-16">
                  {getActiveSettings()?.maxTokens || 2000}
                </span>
              </div>
              <p className="text-xs text-[var(--color-textSecondary)]">
                Maximum number of tokens in the response
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                <label className="block text-xs font-medium text-[var(--color-text)]">
                  System Message
                </label>
              </div>
              <textarea
                value={getActiveSettings()?.systemMessage || ''}
                onChange={(e) => {
                  const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                  setSettings(prev => ({
                    ...prev,
                    [type]: {
                      ...prev[type]!,
                      systemMessage: e.target.value
                    }
                  }));
                }}
                placeholder="Enter a system message to guide the AI's behavior..."
                className={`
                  w-full px-3 py-2 rounded-lg
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  text-sm text-[var(--color-text)]
                  placeholder:text-[var(--color-textSecondary)]
                  focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20
                  min-h-[80px]
                  resize-none
                `}
              />
              <p className="text-xs text-[var(--color-textSecondary)]">
                Set the AI's behavior and context for this mode
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs text-[var(--color-textSecondary)] mt-auto pt-4">
              <div className="flex items-center gap-2">
                <Bot className="w-3 h-3 text-[var(--color-accent)]" />
                <span>
                  {activeMode === 'content'
                    ? 'These settings will be used for generating titles, content, and tags.'
                    : 'These settings will be used for enhancing input prompts across the application.'
                  }
                </span>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`
                  flex items-center gap-2 px-4 py-2 shrink-0
                  ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                  text-white rounded-lg transition-all duration-200 
                  hover:scale-105 hover:-translate-y-0.5 
                  shadow-sm hover:shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:hover:scale-100 disabled:hover:translate-y-0
                  text-xs font-medium
                `}
              >
                {isSaving ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </span>
              </button>
            </div>

            {/* Save Result Message */}
            {saveResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  p-3 rounded-lg mt-4
                  ${saveResult.success ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                  border-[0.5px] border-white/10
                `}
              >
                <div className="flex items-center gap-2">
                  {saveResult.success ? (
                    <CheckCircle className="w-3 h-3 text-[var(--color-accent)]" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <p className={`text-xs ${saveResult.success
                    ? 'text-[var(--color-accent)]'
                    : 'text-red-500'
                    }`}>
                    {saveResult.message}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
