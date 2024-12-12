import React, { useState, useEffect } from 'react';
import { Bot, Settings2, AlertCircle, CheckCircle, Loader, Save, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../contexts/AIContext';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'llama';

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

export function AISettingsSection({ onSave }: AISettingsSectionProps) {
  const { 
    availableModels, 
    isOpenAIConfigured, 
    isAnthropicConfigured,
    isGeminiConfigured, 
    isLlamaConfigured,
    isGrokConfigured,
    checkConfigurations 
  } = useAI();
  const { theme } = useTheme();
  
  const [settings, setSettings] = useState<AISettings>({
    contentSuggestions: {
      provider: (localStorage.getItem('content_suggestions_provider') as AIProvider) || 'openai',
      modelId: localStorage.getItem('content_suggestions_model') ?? 'gpt-4',
    },
    promptEnhancement: {
      provider: (localStorage.getItem('prompt_enhancement_provider') as AIProvider) || 'openai',
      modelId: localStorage.getItem('prompt_enhancement_model') ?? 'gpt-4',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<TestResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setIsChecking(true);
    checkConfigurations()
      .finally(() => setIsChecking(false));
  }, [checkConfigurations]);

  const configurationStatus = [
    { name: 'OpenAI', isConfigured: isOpenAIConfigured },
    { name: 'Anthropic', isConfigured: isAnthropicConfigured },
    { name: 'Gemini', isConfigured: isGeminiConfigured },
    { name: 'Llama', isConfigured: isLlamaConfigured },
    { name: 'Grok', isConfigured: isGrokConfigured }
  ];

  const contentGenerationModels = availableModels.filter(model =>
    model.category === 'chat'
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'contentSuggestionsProvider') {
      const firstModelForProvider = contentGenerationModels.find(m => m.provider === value)?.id;
      setSettings(prev => ({
        ...prev,
        contentSuggestions: {
          provider: value as AIProvider,
          modelId: firstModelForProvider ?? prev.contentSuggestions?.modelId ?? '',
        },
      }));
      localStorage.setItem('content_suggestions_provider', value);
    } else if (name === 'contentSuggestionsModel') {
      setSettings(prev => ({
        ...prev,
        contentSuggestions: {
          ...prev.contentSuggestions!,
          modelId: value,
        },
      }));
      localStorage.setItem('content_suggestions_model', value);
    } else if (name === 'promptEnhancementProvider') {
      const firstModelForProvider = contentGenerationModels.find(m => m.provider === value)?.id;
      setSettings(prev => ({
        ...prev,
        promptEnhancement: {
          provider: value as AIProvider,
          modelId: firstModelForProvider ?? prev.promptEnhancement?.modelId ?? '',
        },
      }));
      localStorage.setItem('prompt_enhancement_provider', value);
    } else if (name === 'promptEnhancementModel') {
      setSettings(prev => ({
        ...prev,
        promptEnhancement: {
          ...prev.promptEnhancement!,
          modelId: value,
        },
      }));
      localStorage.setItem('prompt_enhancement_model', value);
    }
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

  const innerElementClasses = `
    ${getContainerBackground()}
    border-[0.5px] 
    border-white/10
    backdrop-blur-xl
    rounded-xl
    transition-all
    duration-200
    hover:bg-[var(--color-surfaceHover)]
  `;

  const selectClasses = `
    w-full 
    pl-10 
    pr-10 
    py-2.5 
    ${getContainerBackground()}
    hover:bg-[var(--color-surfaceHover)]
    rounded-lg 
    text-[var(--color-text)] 
    border-[0.5px] 
    border-white/10
    focus:ring-2 
    focus:ring-[var(--color-accent)]/20 
    focus:border-transparent 
    transition-all 
    duration-200 
    appearance-none 
    backdrop-blur-sm
  `;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
            <Cpu className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text)]">AI Configuration</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Configure your AI providers and models
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Configuration Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-[var(--color-text)]">Provider Status</h4>
            <button
              onClick={() => {
                setIsChecking(true);
                checkConfigurations().finally(() => setIsChecking(false));
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg 
                ${getContainerBackground()}
                border-[0.5px] border-white/10
                text-[var(--color-text)] text-sm font-medium 
                transition-all duration-200 
                hover:scale-105 hover:-translate-y-0.5 
                shadow-sm hover:shadow-md
                hover:bg-[var(--color-surfaceHover)]
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100 disabled:hover:translate-y-0
              `}
              disabled={isChecking}
            >
              <div className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`}>
                {isChecking ? <Loader className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
              </div>
              {isChecking ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configurationStatus.map(({ name, isConfigured }) => (
              <motion.div
                key={name}
                variants={cardVariants}
                className={innerElementClasses}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-lg 
                        ${isConfigured ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                        backdrop-blur-sm border-[0.5px] border-white/10
                      `}>
                        {isConfigured ? (
                          <CheckCircle className="w-5 h-5 text-[var(--color-accent)]" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">{name}</p>
                        <p className={`text-sm ${
                          isConfigured 
                            ? 'text-[var(--color-accent)]' 
                            : 'text-red-500'
                        }`}>
                          {isConfigured ? 'Configured' : 'Not Configured'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Content Suggestions Configuration */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-[var(--color-text)]">Content Generation</h4>
          <motion.div 
            variants={cardVariants}
            className={`space-y-6 p-6 ${innerElementClasses}`}
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                AI Provider
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Bot className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <select
                  name="contentSuggestionsProvider"
                  value={settings.contentSuggestions?.provider}
                  onChange={handleInputChange}
                  className={selectClasses}
                >
                  {isOpenAIConfigured && <option value="openai">OpenAI</option>}
                  {isGeminiConfigured && <option value="gemini">Google Gemini</option>}
                  {<option value="anthropic">Anthropic (Claude)</option>}
                  {isLlamaConfigured && <option value="llama">Llama</option>}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--color-textSecondary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                Model
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Settings2 className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <select
                  name="contentSuggestionsModel"
                  value={settings.contentSuggestions?.modelId}
                  onChange={handleInputChange}
                  className={selectClasses}
                >
                  {contentGenerationModels
                    .filter(model => model.provider === settings.contentSuggestions?.provider)
                    .map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--color-textSecondary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
              <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              <span>These settings will be used for generating titles, content, and tags.</span>
            </div>
          </motion.div>
        </div>

        {/* Prompt Enhancement Configuration */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-[var(--color-text)]">Prompt Enhancement</h4>
          <motion.div 
            variants={cardVariants}
            className={`space-y-6 p-6 ${innerElementClasses}`}
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                AI Provider
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Bot className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <select
                  name="promptEnhancementProvider"
                  value={settings.promptEnhancement?.provider}
                  onChange={handleInputChange}
                  className={selectClasses}
                >
                  {isOpenAIConfigured && <option value="openai">OpenAI</option>}
                  {isGeminiConfigured && <option value="gemini">Google Gemini</option>}
                  {<option value="anthropic">Anthropic (Claude)</option>}
                  {isLlamaConfigured && <option value="llama">Llama</option>}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--color-textSecondary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">
                Model
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Settings2 className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <select
                  name="promptEnhancementModel"
                  value={settings.promptEnhancement?.modelId}
                  onChange={handleInputChange}
                  className={selectClasses}
                >
                  {contentGenerationModels
                    .filter(model => model.provider === settings.promptEnhancement?.provider)
                    .map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--color-textSecondary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
              <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              <span>These settings will be used for enhancing input prompts across the application.</span>
            </div>
          </motion.div>
        </div>

        {/* Save Button and Result */}
        <div className="flex flex-col gap-4 pt-4 pb-6">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-4 py-2 
                ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                text-white rounded-lg transition-all duration-200 
                hover:scale-105 hover:-translate-y-0.5 
                shadow-sm hover:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100 disabled:hover:translate-y-0
              `}
            >
              {isSaving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="font-medium text-sm">
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
                p-4 rounded-lg
                ${saveResult.success ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                border-[0.5px] border-white/10
              `}
            >
              <div className="flex items-center gap-2">
                {saveResult.success ? (
                  <CheckCircle className="w-5 h-5 text-[var(--color-accent)]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <p className={`text-sm ${
                  saveResult.success 
                    ? 'text-[var(--color-accent)]' 
                    : 'text-red-500'
                }`}>
                  {saveResult.message}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
