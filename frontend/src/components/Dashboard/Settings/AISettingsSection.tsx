import { useState, useEffect, useRef } from 'react';
import { Bot, Settings2, AlertCircle, CheckCircle, Loader, Save, ChevronDown, Sliders, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../contexts/AIContext';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AIModel, AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { modelService } from '../../../services/ai/modelService';

// Import provider logos
import OpenAILightLogo from '../../../assets/openai-light.svg';
import OpenAIDarkLogo from '../../../assets/openai-dark.svg';
import AnthropicLightLogo from '../../../assets/anthropic-light.svg';
import AnthropicDarkLogo from '../../../assets/anthropic-dark.svg';
import GoogleLogo from '../../../assets/google.svg';
import XAILightLogo from '../../../assets/xai-light.svg';
import XAIDarkLogo from '../../../assets/xai-dark.svg';
import OllamaLogo from '../../../assets/ollama.png';

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

  // Get provider logo based on name and theme
  const getProviderLogo = (name: AIProviderName) => {
    const isDarkTheme = theme === 'dark' || theme === 'midnight' || theme === 'full-dark';

    switch (name) {
      case 'OpenAI':
        return isDarkTheme ? OpenAILightLogo : OpenAIDarkLogo;
      case 'Anthropic':
        return isDarkTheme ? AnthropicLightLogo : AnthropicDarkLogo;
      case 'Gemini':
        return GoogleLogo;
      case 'Grok':
        return isDarkTheme ? XAILightLogo : XAIDarkLogo;
      case 'Ollama':
        return OllamaLogo;
      default:
        return null;
    }
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
          relative px-2 py-1.5 rounded-lg transition-all duration-200
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
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs truncate">{providerName}</span>

          {/* Chat Status Indicator - only show if not selected */}
          {!isSelected && (
            <div className={`
              flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px]
              ${isChatConfigured
                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'bg-gray-500/10 text-gray-500'
              }
            `}>
              <MessageSquare className="w-2 h-2 mr-0.5" />
              <span className="truncate">{isChatConfigured ? 'Ready' : 'Not Set'}</span>
            </div>
          )}
        </div>

        {/* Selected Indicator */}
        {isSelected && <CheckCircle className="w-3 h-3 shrink-0" />}
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
        const dropdownHeight = Math.min(250, models.length * 32 + 8); // Smaller dropdown height

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
            w-full px-2 py-1.5 rounded-lg transition-all duration-200
            ${getContainerBackground()}
            border-[0.5px] border-white/10
            flex items-center justify-between
            hover:bg-[var(--color-surfaceHover)]
            text-[var(--color-text)]
            ${isOpen ? 'ring-1 ring-[var(--color-accent)]/20' : ''}
          `}
        >
          <span className="font-medium text-xs truncate">
            {selectedModel?.name || 'Select a model'}
          </span>
          <ChevronDown
            className={`
              w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-[var(--color-textSecondary)]
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
              max-h-[250px] overflow-y-auto
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
                <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-textSecondary)] bg-[var(--color-surface)]/50">
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
                      w-full px-2 py-1.5 text-left
                      flex items-center justify-between gap-1.5
                      transition-all duration-200 text-xs
                      ${selectedId === model.id
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]'
                      }
                    `}
                  >
                    <span className="font-medium truncate">{model.name}</span>
                    {selectedId === model.id && (
                      <CheckCircle className="w-3 h-3 shrink-0" />
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
    <div className="space-y-4">
      {/* Configuration Status - Redesigned as a more compact horizontal layout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--color-text)]">Provider Status</h4>
          <button
            onClick={() => checkConfigurations(true)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-lg
              ${getContainerBackground()}
              border-[0.5px] border-white/10
              text-[var(--color-text)] text-xs font-medium
              transition-all duration-200
              hover:bg-[var(--color-surfaceHover)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={isLoadingConfigurations}
          >
            <div className={`w-3 h-3 ${isLoadingConfigurations ? 'animate-spin' : ''}`}>
              {isLoadingConfigurations ? <Loader className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
            </div>
            {isLoadingConfigurations ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        {/* Compact Provider Status Cards */}
        <div className="grid grid-cols-5 gap-2">
          {(Object.entries(configurationStatus) as [AIProviderName, { agent: boolean; chat: boolean }][]).map(([name, { agent, chat }]) => {
            const isNotConfigured = !agent && !chat;

            // Get the provider logo
            const logoSrc = getProviderLogo(name);

            return (
              <motion.div
                key={name}
                variants={cardVariants}
                className={`
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  rounded-lg p-2
                  flex flex-col
                  ${isNotConfigured ? 'opacity-70' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {/* Provider logo */}
                    {logoSrc ? (
                      <div className="w-5 h-5 rounded-md flex items-center justify-center overflow-hidden bg-white/5">
                        <img
                          src={logoSrc}
                          alt={`${name} logo`}
                          className={`w-4 h-4 object-contain ${name === 'Ollama' ? 'scale-125' : ''}`}
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-gray-500/50 flex items-center justify-center overflow-hidden text-white">
                        <span className="text-xs font-semibold">{name.charAt(0)}</span>
                      </div>
                    )}
                    <p className="font-medium text-xs text-[var(--color-text)]">{name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div className={`
                    rounded px-1 py-0.5 flex items-center justify-center gap-1
                    ${agent
                      ? "bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                      : "bg-red-500/10 text-red-500"}
                    h-5 min-w-0 relative
                  `}>
                    <Bot className="w-2 h-2 shrink-0" />
                    <span className="truncate">{agent ? "Agent" : "None"}</span>
                    {agent && <CheckCircle className="w-2 h-2 absolute right-1" />}
                    {!agent && <AlertCircle className="w-2 h-2 absolute right-1 text-red-500" />}
                  </div>
                  <div className={`
                    rounded px-1 py-0.5 flex items-center justify-center gap-1
                    ${chat
                      ? "bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                      : "bg-red-500/10 text-red-500"}
                    h-5 min-w-0 relative
                  `}>
                    <MessageSquare className="w-2 h-2 shrink-0" />
                    <span className="truncate">{chat ? "Chat" : "None"}</span>
                    {chat && <CheckCircle className="w-2 h-2 absolute right-1" />}
                    {!chat && <AlertCircle className="w-2 h-2 absolute right-1 text-red-500" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Model Configuration - More compact layout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--color-text)]">AI Model Configuration</h4>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-surface)]/50 border-[0.5px] border-white/10">
            <button
              onClick={() => setActiveMode('content')}
              className={`
                px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
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
                px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
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
          className={`space-y-4 p-4 ${getContainerBackground()} rounded-lg border-[0.5px] border-white/10`}
        >
          {/* Info Message - More compact */}
          <div className="flex items-start gap-2 mb-2">
            <MessageSquare className="w-3 h-3 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--color-textSecondary)]">
              Content suggestions use provider-specific API calls rather than the agent system to ensure reliability and proper endpoint routing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Provider & Model Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[var(--color-text)]">
                AI Provider
              </label>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-1.5">
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

              <div className="space-y-2 mt-4">
                <label className="block text-xs font-medium text-[var(--color-text)] flex items-center justify-between">
                  <span>Model</span>
                  {isLoadingModels && (
                    <span className="text-xs flex items-center gap-1 text-[var(--color-textSecondary)]">
                      <Loader className="w-3 h-3 animate-spin" />
                      Loading...
                    </span>
                  )}
                </label>
                <ModelSelect
                  models={chatModels.filter(
                    model => model.provider.toLowerCase() === getActiveSettings()?.provider.toLowerCase()
                  )}
                  selectedId={getActiveSettings()?.modelId || ''}
                  onSelect={handleModelChange}
                />
              </div>
            </div>

            {/* Column 2: Temperature & Max Length */}
            <div className="space-y-3">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-[var(--color-accent)]" />
                  <label className="block text-xs font-medium text-[var(--color-text)]">
                    Temperature (Creativity)
                  </label>
                </div>
                <div className="flex items-center gap-3">
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
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                    "
                  />
                  <span className="text-xs font-medium text-[var(--color-textSecondary)] w-8 text-right">
                    {((getActiveSettings()?.temperature || 0.7) * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[9px] text-[var(--color-textSecondary)]">
                  Higher values make the output more creative but less predictable
                </p>
              </div>

              {/* Maximum Length */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[var(--color-accent)]" />
                  <label className="block text-xs font-medium text-[var(--color-text)]">
                    Maximum Length
                  </label>
                </div>
                <div className="flex items-center gap-3">
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
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                    "
                  />
                  <span className="text-xs font-medium text-[var(--color-textSecondary)] w-12 text-right">
                    {getActiveSettings()?.maxTokens || 2000}
                  </span>
                </div>
                <p className="text-[9px] text-[var(--color-textSecondary)]">
                  Maximum number of tokens in the response
                </p>
              </div>
            </div>

            {/* Column 3: System Message */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-[var(--color-accent)]" />
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
                  w-full px-2 py-1.5 rounded-lg
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                  text-xs text-[var(--color-text)]
                  placeholder:text-[var(--color-textSecondary)]
                  focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20
                  min-h-[100px]
                  resize-none
                `}
              />
              <p className="text-[9px] text-[var(--color-textSecondary)]">
                Set the AI's behavior and context for this mode
              </p>
            </div>
          </div>

          {/* Footer: Info Text & Save Button */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--color-textSecondary)]">
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
                flex items-center gap-1.5 px-3 py-1.5 shrink-0
                ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                text-white rounded-lg transition-all duration-200 
                hover:scale-105
                shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100
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
                p-2 rounded-lg
                ${saveResult.success ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                border-[0.5px] border-white/10
              `}
            >
              <div className="flex items-center gap-1.5">
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
        </motion.div>
      </div>
    </div>
  );
}
