import { useState, useEffect, useRef } from 'react';
import { Bot, Settings2, AlertCircle, CheckCircle, Loader, Save, ChevronDown, Sliders, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../contexts/AIContext';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AIModel, AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { modelService } from '../../../services/ai/modelService';

type AIProviderName = 'OpenAI' | 'Anthropic' | 'Gemini' | 'Ollama' | 'Grok';
type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok';

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

export function AISettingsSection({ onSave }: AISettingsSectionProps) {
  const {
    // Agent statuses
    isOpenAIConfigured,
    isAnthropicConfigured,
    isGeminiConfigured,
    isOllamaConfigured,
    isGrokConfigured,
    // Chat statuses
    isChatOpenAIConfigured,
    isChatAnthropicConfigured,
    isChatGeminiConfigured,
    isChatOllamaConfigured,
    isChatGrokConfigured,
    checkConfigurations,
    isLoadingConfigurations // Use loading state
  } = useAI();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AISettings>({
    contentSuggestions: {
      provider: (localStorage.getItem('content_suggestions_provider') as AIProviderKey) || 'openai',
      modelId: localStorage.getItem('content_suggestions_model') ?? 'gpt-4',
      temperature: Number(localStorage.getItem('content_suggestions_temperature')) || 0.7,
      maxTokens: Number(localStorage.getItem('content_suggestions_max_tokens')) || 2000,
    },
    promptEnhancement: {
      provider: (localStorage.getItem('prompt_enhancement_provider') as AIProviderKey) || 'openai',
      modelId: localStorage.getItem('prompt_enhancement_model') ?? 'gpt-4',
      temperature: Number(localStorage.getItem('prompt_enhancement_temperature')) || 0.7,
      maxTokens: Number(localStorage.getItem('prompt_enhancement_max_tokens')) || 2000,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<TestResult | null>(null);
  const [activeMode, setActiveMode] = useState<'content' | 'prompt'>('content');
  const [chatModels, setChatModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Fetch chat models when the component mounts
  useEffect(() => {
    const fetchChatModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await modelService.getChatModelsAsync();
        setChatModels(models);
      } catch (error) {
        console.error('Failed to fetch chat models:', error);
        // Fallback to the synchronous method if async fails
        setChatModels(modelService.getChatModels());
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchChatModels();
  }, []);

  // Re-fetch models when provider changes to ensure Ollama models are loaded
  useEffect(() => {
    const activeProvider = activeMode === 'content'
      ? settings.contentSuggestions?.provider
      : settings.promptEnhancement?.provider;

    if (activeProvider === 'ollama') {
      const fetchOllamaModels = async () => {
        setIsLoadingModels(true);
        try {
          const models = await modelService.getChatModelsAsync();
          setChatModels(models);
        } catch (error) {
          console.error('Failed to fetch Ollama models:', error);
        } finally {
          setIsLoadingModels(false);
        }
      };

      fetchOllamaModels();
    }
  }, [activeMode,
    settings.contentSuggestions?.provider,
    settings.promptEnhancement?.provider]);

  // Map provider names to their configuration statuses
  const configurationStatus: Record<AIProviderName, { agent: boolean; chat: boolean }> = {
    'OpenAI': { agent: isOpenAIConfigured, chat: isChatOpenAIConfigured },
    'Anthropic': { agent: isAnthropicConfigured, chat: isChatAnthropicConfigured },
    'Gemini': { agent: isGeminiConfigured, chat: isChatGeminiConfigured },
    'Ollama': { agent: isOllamaConfigured, chat: isChatOllamaConfigured },
    'Grok': { agent: isGrokConfigured, chat: isChatGrokConfigured }
  };

  const getActiveSettings = () => {
    return activeMode === 'content' ? settings.contentSuggestions : settings.promptEnhancement;
  };

  const handleProviderChange = (providerKey: AIProviderKey) => {
    // More accurate conversion from provider key to provider name with special cases
    let providerName: AIProviderName;

    // Handle special cases for provider names
    if (providerKey === 'openai') {
      providerName = 'OpenAI';
    } else if (providerKey === 'anthropic') {
      providerName = 'Anthropic';
    } else if (providerKey === 'gemini') {
      providerName = 'Gemini';
    } else if (providerKey === 'ollama') {
      providerName = 'Ollama';
    } else if (providerKey === 'grok') {
      providerName = 'Grok';
    } else {
      // If we get here, it means we have an unknown provider key
      // Since we've handled all known cases, this is just a fallback
      providerName = 'OpenAI'; // Default to OpenAI if unknown
      console.warn(`Unknown provider key: ${providerKey}`);
    }

    const providerStatuses = configurationStatus[providerName];

    // For content generation, we only need chat to be configured
    if (!providerStatuses.chat) return;

    // Find a valid chat model for this provider
    const availableModelsForProvider = chatModels.filter(m => m.provider === providerKey);
    const firstModelForProvider = availableModelsForProvider.length > 0 ?
      availableModelsForProvider[0].id : undefined;

    const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';

    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type]!,
        provider: providerKey,
        modelId: firstModelForProvider ?? prev[type]?.modelId ?? '',
      },
    }));

    localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_provider`, providerKey);

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
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] ';
  };

  const ProviderButton = ({
    providerName,
    isSelected,
    onClick,
    // isAgentConfigured is not used since we're focusing on chat models
    isChatConfigured
  }: {
    providerName: AIProviderName;
    isSelected: boolean;
    onClick: () => void;
    isAgentConfigured: boolean;
    isChatConfigured: boolean;
  }) => {
    // For content generation, we only care if chat is configured
    // Chat model is required for content generation
    const isDisabled = !isChatConfigured;

    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`
          relative px-3 py-2 rounded-lg transition-all duration-200
          ${isSelected
            ? 'bg-[var(--color-accent)] text-white'
            : `${getContainerBackground()} text-[var(--color-text)]`
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--color-accent)]/10'}
          border-[0.5px] border-white/10
          flex items-center justify-between
          group w-full
        `}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{providerName}</span>

          {/* Chat Status Indicator - only show if not selected */}
          {!isSelected && (
            <div className={`
              flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px]
              ${isChatConfigured
                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'bg-gray-500/10 text-gray-500'
              }
            `}>
              <MessageSquare className="w-2 h-2 mr-0.5" />
              <span>{isChatConfigured ? 'Configured' : 'Not Configured'}</span>
            </div>
          )}
        </div>

        {/* Selected Indicator */}
        {isSelected && <CheckCircle className="w-4 h-4 shrink-0" />}
      </button>
    );
  };


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
            onClick={() => checkConfigurations(true)} // Force refresh on click
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              ${getContainerBackground()}
              border-[0.5px] border-white/10
              text-[var(--color-text)] text-xs font-medium
              transition-all duration-200
              hover:bg-[var(--color-surfaceHover)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={isLoadingConfigurations} // Use loading state
          >
            <div className={`w-3 h-3 ${isLoadingConfigurations ? 'animate-spin' : ''}`}>
              {isLoadingConfigurations ? <Loader className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
            </div>
            {isLoadingConfigurations ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.entries(configurationStatus) as [AIProviderName, { agent: boolean; chat: boolean }][]).map(([name, { agent, chat }]) => {
            const isFullyConfigured = agent && chat;
            const isPartiallyConfigured = (agent || chat) && !isFullyConfigured;
            const isNotConfigured = !agent && !chat;

            // Set colors and icon based on status
            let statusColorClass = 'text-red-500';
            let bgColorClass = 'bg-red-500/10';
            let IconComponent = AlertCircle;

            if (isFullyConfigured) {
              statusColorClass = 'text-[var(--color-accent)]';
              bgColorClass = 'bg-[var(--color-accent)]/10';
              IconComponent = CheckCircle;
            } else if (isPartiallyConfigured) {
              statusColorClass = 'text-yellow-500';
              bgColorClass = 'bg-yellow-500/10';
              // Use a more appropriate icon for partial status
              IconComponent = agent ? Bot : MessageSquare;
            }

            return (
              <motion.div
                key={name}
                variants={cardVariants}
                className={`
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  backdrop-blur-xl rounded-lg p-3
                  flex flex-col gap-3
                  group relative
                  ${isNotConfigured ? 'opacity-70' : ''}
                `}
              >
                {/* Provider Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`
                      flex items-center justify-center w-6 h-6 rounded-md 
                      ${bgColorClass}
                      backdrop-blur-sm border-[0.5px] border-white/10
                      shrink-0
                    `}>
                      <IconComponent className={`w-3 h-3 ${statusColorClass}`} />
                    </div>
                    <p className="font-medium text-xs text-[var(--color-text)]">{name}</p>
                  </div>
                  {isFullyConfigured && (
                    <span className="text-[10px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-sm px-1.5 py-0.5 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>Configured</span>
                    </span>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {/* Agent Status */}
                  <div className={`
                    rounded px-1 py-1 flex items-center gap-1.5
                    ${agent
                      ? "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                      : "border-gray-500/10 bg-gray-500/5 text-gray-500/70"}
                  `}>
                    <Bot className="w-3 h-3 shrink-0" />
                    <span className="truncate">{agent ? "Agent" : "No Agent"}</span>
                  </div>

                  {/* Chat Status */}
                  <div className={`
                    rounded px-1 py-1 flex items-center gap-1.5
                    ${chat
                      ? "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                      : "border-gray-500/10 bg-gray-500/5 text-gray-500/70"}
                  `}>
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span className="truncate">{chat ? "Chat" : "No Chat"}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-[var(--color-text)]">
                Content suggestions use provider-specific API calls rather than the agent system to ensure reliability and proper endpoint routing.
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                When you select a provider below, only compatible chat models for that provider will be available for selection.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-medium text-[var(--color-text)]">
              AI Provider
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {(Object.entries(configurationStatus) as [AIProviderName, { agent: boolean; chat: boolean }][]).map(([name, { agent, chat }]) => {
                const providerKey = name.toLowerCase() as AIProviderKey;
                return (
                  <ProviderButton
                    key={name}
                    providerName={name}
                    isSelected={getActiveSettings()?.provider === providerKey}
                    onClick={() => handleProviderChange(providerKey)}
                    isAgentConfigured={agent}
                    isChatConfigured={chat}
                  />
                );
              })}
            </div>
          </div>


          <div className="space-y-4">
            <label className="block text-xs font-medium text-[var(--color-text)] flex items-center justify-between">
              <span>Model</span>
              {isLoadingModels &&
                <span className="text-xs flex items-center gap-1 text-[var(--color-textSecondary)]">
                  <Loader className="w-3 h-3 animate-spin" />
                  Loading models...
                </span>
              }
            </label>
            <ModelSelect
              models={chatModels.filter(
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
