import { useState, useEffect, useRef } from 'react';
import { Bot, Settings2, AlertCircle, CheckCircle, Loader, Save, ChevronDown, Sliders, MessageSquare, Zap, Info, Star, UserCheck, Lightbulb, HelpCircle, Sparkles, Code, Eye, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAI } from '../../../contexts/AIContext';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AIModel, AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { modelService } from '../../../services/ai/modelService';
import aiSettingsService from '../../../services/api/aiSettings.service';

// Import provider logos
import OpenAILightLogo from '../../../assets/openai-light.svg';
import OpenAIDarkLogo from '../../../assets/openai-dark.svg';
import AnthropicLightLogo from '../../../assets/anthropic-light.svg';
import AnthropicDarkLogo from '../../../assets/anthropic-dark.svg';
import GoogleLogo from '../../../assets/google.svg';
import XAILightLogo from '../../../assets/xai-light.svg';
import XAIDarkLogo from '../../../assets/xai-dark.svg';
import OllamaLogo from '../../../assets/ollama.png';

// Helper functions for system message effectiveness
const getEffectivenessPercent = (message: string): number => {
  if (!message || message.length === 0) return 0;
  if (message.length < 20) return 20;
  if (message.length < 50) return 40;
  if (message.length < 100) return 60;
  if (message.length < 200) return 80;
  return 100;
};

const getEffectivenessColor = (message: string): string => {
  const percent = getEffectivenessPercent(message);
  if (percent <= 20) return 'bg-[var(--color-accent)]/20';
  if (percent <= 40) return 'bg-[var(--color-accent)]/40';
  if (percent <= 60) return 'bg-[var(--color-accent)]/60';
  if (percent <= 80) return 'bg-[var(--color-accent)]/80';
  return 'bg-[var(--color-accent)]';
};

const getEffectivenessLabel = (message: string): string => {
  const percent = getEffectivenessPercent(message);
  if (percent <= 20) return 'Basic';
  if (percent <= 40) return 'Fair';
  if (percent <= 60) return 'Good';
  if (percent <= 80) return 'Very Good';
  return 'Excellent';
};

// Simple tooltip component for informational enhancements
const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex"
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 w-48 p-2 text-xs rounded-md shadow-lg bg-[color-mix(in_srgb,var(--color-surface)_70%,black)] border border-white/10 text-white"
            style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-5px)' }}
          >
            {content}
            <div
              className="absolute w-2 h-2 rotate-45 bg-[color-mix(in_srgb,var(--color-surface)_70%,black)] border-r border-b border-white/10"
              style={{ bottom: '-5px', left: '50%', transform: 'translateX(-50%)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type AIProviderName = 'OpenAI' | 'Anthropic' | 'Gemini' | 'Ollama' | 'Grok';
type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'grok';

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

// Provider-specific gradient backgrounds
const providerGradients: Record<AIProviderName, string> = {
  'OpenAI': 'bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent)]/10',
  'Anthropic': 'bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent)]/10',
  'Gemini': 'bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent)]/10',
  'Ollama': 'bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent)]/10',
  'Grok': 'bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent)]/10'
};

// Provider capability descriptions
const providerCapabilities: Record<AIProviderName, { strengths: string, modelInfo: string }> = {
  'OpenAI': {
    strengths: 'Excels at general knowledge, coding, and reasoning tasks.',
    modelInfo: 'GPT models are known for robust general capabilities across many domains.'
  },
  'Anthropic': {
    strengths: 'Strong at nuanced reasoning and safety-aligned responses.',
    modelInfo: 'Claude models prioritize helpful, harmless, and honest interactions.'
  },
  'Gemini': {
    strengths: 'Great for multimodal tasks and integrated Google services.',
    modelInfo: 'Gemini models combine text with other data types like images and code.'
  },
  'Ollama': {
    strengths: 'Runs locally with no data sent to external services.',
    modelInfo: 'Local models offer privacy and work without internet connection.'
  },
  'Grok': {
    strengths: 'Designed for creative responses and real-time information.',
    modelInfo: 'Grok models aim to be more conversational and witty in responses.'
  }
};

// Predefined configuration profiles for quick setup
const configurationProfiles = [
  {
    id: 'general',
    name: 'General Purpose',
    icon: <Bot className="w-3 h-3" />,
    contentSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemMessage: 'You are a helpful content generation assistant. Generate engaging, well-structured content that helps users organize their thoughts.'
    },
    promptSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1500,
      systemMessage: 'You are a helpful prompt enhancement assistant. Your goal is to improve user prompts by adding clarity and structure.'
    }
  },
  {
    id: 'creative',
    name: 'Creative Writing',
    icon: <Sparkles className="w-3 h-3" />,
    contentSettings: {
      provider: 'anthropic' as AIProviderKey,
      modelId: 'claude-3-sonnet-20240229',
      temperature: 0.85,
      maxTokens: 3000,
      systemMessage: 'You are a creative assistant with a flair for expressive, engaging writing. Generate content that\'s captivating and memorable.'
    },
    promptSettings: {
      provider: 'anthropic' as AIProviderKey,
      modelId: 'claude-3-sonnet-20240229',
      temperature: 0.8,
      maxTokens: 2000,
      systemMessage: 'You are a creative prompt enhancement assistant. Transform basic prompts into rich, detailed directions that inspire imagination.'
    }
  },
  {
    id: 'technical',
    name: 'Technical Documentation',
    icon: <Code className="w-3 h-3" />,
    contentSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.2,
      maxTokens: 2500,
      systemMessage: 'You are a technical documentation assistant. Generate clear, precise content with accurate terminology and well-structured explanations.'
    },
    promptSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500,
      systemMessage: 'You are a technical prompt enhancement assistant. Add precise specifications, requirements, and technical details to prompts while maintaining clarity.'
    }
  },
  {
    id: 'link-suggestion',
    name: 'Link Suggestion',
    icon: <Link2 className="w-3 h-3" />,
    contentSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      systemMessage: 'You are a semantic connection specialist. Find meaningful connections between all content types (notes, tasks, ideas) with equal importance. Look for shared concepts, themes, and contextual relationships. Do not favor notes over other content types - tasks and ideas are equally important connections.'
    },
    promptSettings: {
      provider: 'openai' as AIProviderKey,
      modelId: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500,
      systemMessage: 'Help identify connections between concepts across all content types (notes, tasks, ideas) by finding semantic similarities and related topics. Treat all content types with equal importance.'
    }
  }
];

type ActiveModeType = 'content' | 'prompt';

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
    isLoadingConfigurations, // Use loading state
    refreshConfiguration
  } = useAI();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AISettings>({
    contentSuggestions: {
      provider: 'openai',
      modelId: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemMessage: '',
    },
    promptEnhancement: {
      provider: 'openai',
      modelId: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemMessage: '',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<TestResult | null>(null);
  const [activeMode, setActiveMode] = useState<ActiveModeType>('content');
  const [chatModels, setChatModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from preferences when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);

        // Try to get settings from user preferences
        const savedSettings = await aiSettingsService.getAISettings();

        if (savedSettings) {
          // If settings exist in user preferences, use them
          setSettings(savedSettings);
        } else {
          // If no settings in preferences, try to load from localStorage as fallback
          const contentProvider = localStorage.getItem('content_suggestions_provider') as AIProviderKey;
          const contentModel = localStorage.getItem('content_suggestions_model');
          const contentTemp = localStorage.getItem('content_suggestions_temperature');
          const contentTokens = localStorage.getItem('content_suggestions_max_tokens');
          const contentSystemMsg = localStorage.getItem('content_suggestions_system_message');

          const promptProvider = localStorage.getItem('prompt_enhancement_provider') as AIProviderKey;
          const promptModel = localStorage.getItem('prompt_enhancement_model');
          const promptTemp = localStorage.getItem('prompt_enhancement_temperature');
          const promptTokens = localStorage.getItem('prompt_enhancement_max_tokens');
          const promptSystemMsg = localStorage.getItem('prompt_enhancement_system_message');

          // Set state with localStorage values if they exist
          setSettings({
            contentSuggestions: {
              provider: contentProvider || 'openai',
              modelId: contentModel || 'gpt-4',
              temperature: contentTemp ? Number(contentTemp) : 0.7,
              maxTokens: contentTokens ? Number(contentTokens) : 2000,
              systemMessage: contentSystemMsg || '',
            },
            promptEnhancement: {
              provider: promptProvider || 'openai',
              modelId: promptModel || 'gpt-4',
              temperature: promptTemp ? Number(promptTemp) : 0.7,
              maxTokens: promptTokens ? Number(promptTokens) : 2000,
              systemMessage: promptSystemMsg || '',
            },
          });
        }
      } catch (error) {
        console.error('Error loading AI settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

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

  const updateSystemMessage = (message: string) => {
    const typeKey = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';

    setSettings(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey]!,
        systemMessage: message,
      },
    }));

    localStorage.setItem(
      `${activeMode === 'content' ? 'content_suggestions' : 'prompt_enhancement'}_system_message`,
      message
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      // First, save settings to user preferences via the aiSettingsService
      await aiSettingsService.saveAISettings(settings);

      // Also save to localStorage as a backup/fallback
      const { contentSuggestions, promptEnhancement } = settings;

      // Content suggestions settings
      if (contentSuggestions) {
        localStorage.setItem('content_suggestions_provider', contentSuggestions.provider);
        localStorage.setItem('content_suggestions_model', contentSuggestions.modelId);
        localStorage.setItem('content_suggestions_temperature', String(contentSuggestions.temperature));
        localStorage.setItem('content_suggestions_max_tokens', String(contentSuggestions.maxTokens));
        if (contentSuggestions.systemMessage) {
          localStorage.setItem('content_suggestions_system_message', contentSuggestions.systemMessage);
        }
      }

      // Prompt enhancement settings
      if (promptEnhancement) {
        localStorage.setItem('prompt_enhancement_provider', promptEnhancement.provider);
        localStorage.setItem('prompt_enhancement_model', promptEnhancement.modelId);
        localStorage.setItem('prompt_enhancement_temperature', String(promptEnhancement.temperature));
        localStorage.setItem('prompt_enhancement_max_tokens', String(promptEnhancement.maxTokens));
        if (promptEnhancement.systemMessage) {
          localStorage.setItem('prompt_enhancement_system_message', promptEnhancement.systemMessage);
        }
      }

      // Refresh AI configuration to apply changes immediately
      await refreshConfiguration();

      // Set success state
      setSaveResult({ success: true, message: 'Settings saved successfully!' });

      // Call external onSave if provided
      if (onSave) {
        onSave(settings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveResult({ success: false, message: 'Error saving settings. Please try again.' });
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
          ${providerGradients[providerName]}
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

    // Model capability tags based on name patterns
    const getModelCapabilities = (modelName: string) => {
      const capabilities: { name: string, color: string, icon: React.ReactNode }[] = [];

      const modelNameLower = modelName.toLowerCase();

      if (modelNameLower.includes('gpt-4')) {
        capabilities.push({
          name: 'Advanced',
          color: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          icon: <Star className="w-2 h-2 mr-0.5" />
        });
      }

      if (modelNameLower.includes('claude') && modelNameLower.includes('3')) {
        capabilities.push({
          name: 'Advanced',
          color: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          icon: <Star className="w-2 h-2 mr-0.5" />
        });
      }

      if (modelNameLower.includes('code') || modelNameLower.includes('coder')) {
        capabilities.push({
          name: 'Code',
          color: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          icon: <Code className="w-2 h-2 mr-0.5" />
        });
      }

      if (modelNameLower.includes('visual') || modelNameLower.includes('vision')) {
        capabilities.push({
          name: 'Vision',
          color: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          icon: <Eye className="w-2 h-2 mr-0.5" />
        });
      }

      if (modelNameLower.includes('turbo') || modelName.includes('sonic')) {
        capabilities.push({
          name: 'Fast',
          color: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
          icon: <Zap className="w-2 h-2 mr-0.5" />
        });
      }

      return capabilities;
    };

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
    const selectedCapabilities = selectedModel ? getModelCapabilities(selectedModel.name) : [];

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
          <div className="flex flex-col items-start">
            <span className="font-medium text-xs truncate">
              {selectedModel?.name || 'Select a model'}
            </span>

            {/* Show capability badges if any */}
            {selectedCapabilities.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {selectedCapabilities.map((cap, idx) => (
                  <span key={idx} className={`text-[8px] ${cap.color} px-1 py-0.5 rounded-full flex items-center`}>
                    {cap.icon}
                    {cap.name}
                  </span>
                ))}
              </div>
            )}
          </div>
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
                {providerModels.map(model => {
                  const capabilities = getModelCapabilities(model.name);

                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full px-2 py-1.5 text-left
                        flex flex-col gap-0.5
                        transition-all duration-200 text-xs
                        ${selectedId === model.id
                          ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium truncate">{model.name}</span>
                        {selectedId === model.id && (
                          <CheckCircle className="w-3 h-3 shrink-0" />
                        )}
                      </div>

                      {/* Show capability badges */}
                      {capabilities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {capabilities.map((cap, idx) => (
                            <span
                              key={idx}
                              className={`text-[8px] ${cap.color} px-1 py-0.5 rounded-full flex items-center`}
                            >
                              {cap.icon}
                              {cap.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Apply a configuration profile
  const applyProfile = (profile: typeof configurationProfiles[0]) => {
    // Copy the profile settings to the current settings
    if (activeMode === 'content') {
      setSettings(prev => ({
        ...prev,
        contentSuggestions: profile.contentSettings
      }));

      // Save to localStorage
      localStorage.setItem('content_suggestions_provider', profile.contentSettings.provider);
      localStorage.setItem('content_suggestions_model', profile.contentSettings.modelId);
      localStorage.setItem('content_suggestions_temperature', String(profile.contentSettings.temperature));
      localStorage.setItem('content_suggestions_max_tokens', String(profile.contentSettings.maxTokens));
      localStorage.setItem('content_suggestions_system_message', profile.contentSettings.systemMessage || '');
    } else {
      setSettings(prev => ({
        ...prev,
        promptEnhancement: profile.promptSettings
      }));

      // Save to localStorage
      localStorage.setItem('prompt_enhancement_provider', profile.promptSettings.provider);
      localStorage.setItem('prompt_enhancement_model', profile.promptSettings.modelId);
      localStorage.setItem('prompt_enhancement_temperature', String(profile.promptSettings.temperature));
      localStorage.setItem('prompt_enhancement_max_tokens', String(profile.promptSettings.maxTokens));
      localStorage.setItem('prompt_enhancement_system_message', profile.promptSettings.systemMessage || '');
    }
  };

  const updateContentSuggestionsSetting = (key: string, value: string | number | boolean) => {
    if (!settings.contentSuggestions?.provider) return;

    setSettings({
      ...settings,
      contentSuggestions: {
        ...settings.contentSuggestions,
        [key]: value
      }
    });
  };

  const updatePromptEnhancementSetting = (key: string, value: string | number | boolean) => {
    if (!settings.promptEnhancement?.provider) return;

    setSettings({
      ...settings,
      promptEnhancement: {
        ...settings.promptEnhancement,
        [key]: value
      }
    });
  };

  // Return component if loading
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
        <span className="ml-3 text-[var(--color-text)]">Loading AI settings...</span>
      </div>
    );
  }

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
            const providerCapability = providerCapabilities[name];
            const gradientClass = providerGradients[name];

            return (
              <motion.div
                key={name}
                variants={cardVariants}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className={`
                  ${getContainerBackground()}
                  ${gradientClass}
                  border-[0.5px] border-white/10
                  rounded-lg p-2
                  flex flex-col
                  ${isNotConfigured ? 'opacity-70' : ''}
                  transition-all duration-300 ease-in-out
                  hover:shadow-md hover:shadow-[var(--color-accent)]/5
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

                  <Tooltip content={providerCapability.strengths}>
                    <HelpCircle className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)]" />
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div className={`
                    rounded px-1 py-0.5 flex items-center justify-center gap-1
                    ${agent
                      ? "bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                      : "bg-red-500/10 text-red-500"}
                    h-5 min-w-0 relative
                    transition-all duration-300
                    ${agent ? "hover:bg-[var(--color-accent)]/10" : ""}
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
                    transition-all duration-300
                    ${chat ? "hover:bg-[var(--color-accent)]/10" : ""}
                  `}>
                    <MessageSquare className="w-2 h-2 shrink-0" />
                    <span className="truncate">{chat ? "Chat" : "None"}</span>
                    {chat && <CheckCircle className="w-2 h-2 absolute right-1" />}
                    {!chat && <AlertCircle className="w-2 h-2 absolute right-1 text-red-500" />}
                  </div>
                </div>

                {/* Add a subtle capability indicator */}
                <div className="mt-1.5 text-[8px] text-[var(--color-textSecondary)] leading-tight overflow-hidden text-ellipsis h-6">
                  <Sparkles className="w-2 h-2 inline-block mr-0.5" />
                  <span>{providerCapability.modelInfo}</span>
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

          {/* Configuration profile selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
              >
                <Settings2 className="w-3 h-3" />
                Load Profile
                <ChevronDown className={`w-3 h-3 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 z-50 mt-1 p-1 rounded-lg bg-[#1e293b] border border-white/10 shadow-lg w-48"
                  >
                    <div className="text-[8px] px-2 py-1 text-[var(--color-textSecondary)]">
                      Select a preset configuration
                    </div>
                    {configurationProfiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          applyProfile(profile);
                          setProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[var(--color-accent)]/10">
                          {profile.icon}
                        </div>
                        <span>{profile.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between w-full mb-2">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  Enable {activeMode === 'content' ? 'Content Suggestions' : 'Prompt Enhancement'}
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeMode === 'content'
                      ? settings.contentSuggestions?.enabled !== false
                      : settings.promptEnhancement?.enabled !== false}
                    onChange={(e) => {
                      if (activeMode === 'content') {
                        updateContentSuggestionsSetting('enabled', e.target.checked);
                      } else {
                        updatePromptEnhancementSetting('enabled', e.target.checked);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-600/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                </label>
              </div>

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
                  <Tooltip content="Higher values (warmer) make responses more creative but less predictable. Lower values (cooler) make responses more focused and deterministic.">
                    <HelpCircle className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)]" />
                  </Tooltip>
                </div>

                {/* Enhanced temperature slider with gradient background */}
                <div className="flex items-center gap-3">
                  <div className="relative w-full">
                    <div
                      className="absolute h-1.5 rounded-lg w-full overflow-hidden"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent)/30, var(--color-accent)/70, var(--color-accent))'
                      }}
                    />
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
                        w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-transparent
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                        [&::-webkit-slider-thumb]:shadow-sm
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:active:scale-105
                        relative z-10
                      "
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--color-textSecondary)] w-8 text-right">
                    {((getActiveSettings()?.temperature || 0.7) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Temperature presets */}
                <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newTemperature = 0.2;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          temperature: newTemperature
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_temperature`, String(newTemperature));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Precise
                  </button>
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newTemperature = 0.5;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          temperature: newTemperature
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_temperature`, String(newTemperature));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Balanced
                  </button>
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newTemperature = 0.85;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          temperature: newTemperature
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_temperature`, String(newTemperature));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Creative
                  </button>
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
                  <Tooltip content="Controls the maximum number of tokens in the AI's response. Higher values allow for longer responses but may increase processing time.">
                    <HelpCircle className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)]" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full">
                    <div
                      className="absolute h-1.5 rounded-lg w-full overflow-hidden"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent)/30, var(--color-accent)/70, var(--color-accent))'
                      }}
                    />
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
                        bg-transparent
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
                        [&::-webkit-slider-thumb]:shadow-sm
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:active:scale-105
                        relative z-10
                      "
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--color-textSecondary)] w-12 text-right flex items-center justify-end">
                    <span className="mr-0.5">{getActiveSettings()?.maxTokens || 2000}</span>
                    <Tooltip content="Tokens are pieces of words. As a rough guide, 1 token is about 4 characters or 0.75 words in English.">
                      <Info className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)]" />
                    </Tooltip>
                  </span>
                </div>

                {/* Token length presets */}
                <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newMaxTokens = 1000;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          maxTokens: newMaxTokens
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_max_tokens`, String(newMaxTokens));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Concise
                  </button>
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newMaxTokens = 2000;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          maxTokens: newMaxTokens
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_max_tokens`, String(newMaxTokens));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => {
                      const type = activeMode === 'content' ? 'contentSuggestions' : 'promptEnhancement';
                      const newMaxTokens = 3500;
                      setSettings(prev => ({
                        ...prev,
                        [type]: {
                          ...prev[type]!,
                          maxTokens: newMaxTokens
                        }
                      }));
                      localStorage.setItem(`${type === 'contentSuggestions' ? 'content_suggestions' : 'prompt_enhancement'}_max_tokens`, String(newMaxTokens));
                    }}
                    className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8px] font-medium rounded-full px-2 py-0.5 transition-colors"
                  >
                    Detailed
                  </button>
                </div>

                <p className="text-[9px] text-[var(--color-textSecondary)]">
                  Maximum number of tokens in the response
                </p>
              </div>
            </div>

            {/* Column 3: System Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-[var(--color-accent)]" />
                  <label className="block text-xs font-medium text-[var(--color-text)]">
                    System Message
                  </label>
                  <Tooltip content="The system message sets the behavior and context for the AI. It's like giving instructions to a helpful assistant.">
                    <HelpCircle className="w-3 h-3 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)]" />
                  </Tooltip>
                </div>

                {/* Template selector */}
                <div className="relative">
                  <button
                    onClick={() => {
                      // Toggle dropdown for system message templates
                      // For this demo, let's just directly set a template based on activeMode
                      const template = activeMode === 'content'
                        ? 'You are a helpful content creation assistant. Generate engaging, well-structured content that captures reader attention and conveys information clearly.'
                        : 'You are a helpful prompt enhancement assistant. Your goal is to improve user prompts by adding clarity, structure, and relevant details while preserving their original intent.';

                      updateSystemMessage(template);
                    }}
                    className="text-[8px] font-medium px-2 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center gap-1 hover:bg-[var(--color-accent)]/20 transition-colors"
                  >
                    <Lightbulb className="w-2 h-2" />
                    Template
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={getActiveSettings()?.systemMessage || ''}
                  onChange={(e) => {
                    updateSystemMessage(e.target.value);
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

                {/* Character count badge */}
                <div className="absolute bottom-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface)]/80 backdrop-blur-sm text-[var(--color-textSecondary)]">
                  {(getActiveSettings()?.systemMessage || '').length} chars
                </div>
              </div>

              <div className="text-[9px] text-[var(--color-textSecondary)] flex gap-1 items-start">
                <UserCheck className="w-2.5 h-2.5 mt-0.5 shrink-0 text-[var(--color-accent)]" />
                <span>
                  Set the AI's behavior and context for this mode. A good system message helps the AI understand how it should respond.
                </span>
              </div>

              {/* System message effectiveness indicator */}
              {(getActiveSettings()?.systemMessage?.length || 0) > 0 && (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getEffectivenessColor(getActiveSettings()?.systemMessage || '')}`}
                      style={{ width: `${getEffectivenessPercent(getActiveSettings()?.systemMessage || '')}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[8px] text-[var(--color-textSecondary)]">Effectiveness</span>
                    <span className="text-[8px] text-[var(--color-textSecondary)]">
                      {getEffectivenessLabel(getActiveSettings()?.systemMessage || '')}
                    </span>
                  </div>
                </div>
              )}
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
                relative overflow-hidden group
              `}
            >
              {/* Background pulse animation when saving */}
              {isSaving && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}

              <motion.div
                className="flex items-center gap-1.5 relative z-10"
                animate={isSaving ? { y: [0, -20, 20, 0] } : {}}
                transition={isSaving ? {
                  y: { duration: 0.3, ease: "easeOut" },
                  opacity: { duration: 0.2 }
                } : {}}
              >
                {isSaving ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                )}
                <span>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </span>
              </motion.div>

              {/* Subtle light effect on hover */}
              <div className="absolute -inset-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
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
