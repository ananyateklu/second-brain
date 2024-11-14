import React, { useState } from 'react';
import { Bot, Key, TestTube, EyeOff, Eye, AlertCircle, CheckCircle, Loader, Save, Settings2 } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';

interface AISettings {
  openaiApiKey?: string;
  geminiApiKey?: string;
  contentSuggestions?: {
    provider: 'openai' | 'anthropic'| 'gemini';
    modelId: string;
  };
}

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

export function AISettingsSection({ onSave }: AISettingsSectionProps) {
  const { configureOpenAI, configureGemini, availableModels, isOpenAIConfigured, isGeminiConfigured, isLlamaConfigured } = useAI();
  const [settings, setSettings] = useState<AISettings>({
    openaiApiKey: localStorage.getItem('openai_api_key') || '',
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    contentSuggestions: {
      provider: (localStorage.getItem('content_suggestions_provider') as 'openai' | 'anthropic' | 'gemini') || 'openai',
      modelId: localStorage.getItem('content_suggestions_model') || 'gpt-4',
    },
  });

  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [saveResult, setSaveResult] = useState<TestResult | null>(null);

  // Filter models suitable for content generation
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
          provider: value as 'openai' | 'anthropic' | 'gemini',
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
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      setSaveResult({ success: true, message: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setSaveResult({ success: false, message: error?.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);     
    }
  };

  const testConnection = async (service: 'openai' | 'gemini') => {
    if (service === 'gemini') {
      setIsTestingGemini(true);
      setTestResults((prev) => {
        const newResults = { ...prev };
        delete newResults[service];
        return newResults;
      });

      try {
        await configureGemini(settings.geminiApiKey || '');
        setTestResults((prev) => ({
          ...prev,
          [service]: {
            success: true,
            message: 'Connection successful!',
          },
        }));
      } catch (error: any) {
        console.error(`${service} test connection error:`, error);
        setTestResults((prev) => ({
          ...prev,
          [service]: {
            success: false,
            message:
              error?.message ||
              `Failed to connect to ${service}. Please check your credentials.`,
          },
        }));
      } finally {
        setIsTestingGemini(false);
      }
    } else if (service === 'openai') {
      setIsTestingOpenAI(true);
      setTestResults((prev) => {
        const newResults = { ...prev };
        delete newResults[service];
        return newResults;
      });

      try {
        await configureOpenAI(settings.openaiApiKey || '');
        setTestResults((prev) => ({
          ...prev,
          [service]: {
            success: true,
            message: 'Connection successful!',
          },
        }));
      } catch (error: any) {
        console.error(`${service} test connection error:`, error);
        setTestResults((prev) => ({
          ...prev,
          [service]: {
            success: false,
            message:
              error?.message ||
              `Failed to connect to ${service}. Please check your credentials.`,
          },
        }));
      } finally {
        setIsTestingOpenAI(false);
      }
    }
  };

  const inputClasses = `
    w-full
    pl-10 pr-4 py-2
    bg-transparent
    rounded-lg
    text-gray-900 dark:text-white
    placeholder-gray-500/70 dark:placeholder-gray-400/70
    border border-gray-200/20 dark:border-gray-700/30
    focus:ring-2
    focus:ring-[#3B7443]/50
    focus:border-transparent
    transition-all duration-200
  `;

  const selectClasses = `
    w-full
    pl-10 pr-10 py-2
    bg-transparent
    rounded-lg
    text-gray-900 dark:text-white
    placeholder-gray-500/70 dark:placeholder-gray-400/70
    border border-gray-200/20 dark:border-gray-700/30
    focus:ring-2
    focus:ring-[#3B7443]/50
    focus:border-transparent
    transition-all duration-200
    appearance-none
  `;

  const iconClasses = "h-5 w-5 text-gray-600 dark:text-gray-300";

  const buttonClasses = `
    flex items-center gap-2 
    px-4 py-2 
    text-sm font-medium 
    bg-[#3B7443] 
    text-white 
    rounded-lg 
    hover:bg-[#2D5A34] 
    disabled:opacity-50 disabled:cursor-not-allowed 
    transition-colors
  `;

  const iconButtonClasses = `
    absolute inset-y-0 right-0 pr-3 
    flex items-center 
    text-gray-500 dark:text-gray-400 
    hover:text-gray-700 dark:hover:text-gray-200
    transition-colors
  `;

  const iconWrapperClasses = `
    absolute inset-y-0 left-0 pl-3 
    flex items-center 
    pointer-events-none
    z-10
  `;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[#3B7443]" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Settings</h3>
      </div>

      {/* OpenAI Configuration */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-gray-900 dark:text-white">OpenAI Configuration</h4>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              API Key
            </label>
            <div className="relative">
              <div className={iconWrapperClasses}>
                <Key className="h-5 w-5 text-[#3B7443]" />
              </div>
              <input
                type={showOpenAIKey ? 'text' : 'password'}
                name="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className={iconButtonClasses}
              >
                {showOpenAIKey ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => testConnection('openai')}
              disabled={isTestingOpenAI || !settings.openaiApiKey}
              className={buttonClasses}
            >
              {isTestingOpenAI ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {testResults.openai && (
              <div className={`flex items-center gap-2 text-sm ${testResults.openai.success
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                {testResults.openai.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{testResults.openai.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gemini Configuration */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-gray-900 dark:text-white">Google Gemini Configuration</h4>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              API Key
            </label>
            <div className="relative">
              <div className={iconWrapperClasses}>
                <Key className="h-5 w-5 text-[#3B7443]" />
              </div>
              <input
                type={showGeminiApiKey ? 'text' : 'password'}
                name="geminiApiKey"
                value={settings.geminiApiKey}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="Your Gemini API Key"
              />
              <button
                type="button"
                onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                className={iconButtonClasses}
              >
                {showGeminiApiKey ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => testConnection('gemini')}
              disabled={isTestingGemini || !settings.geminiApiKey}
              className={buttonClasses}
            >
              {isTestingGemini ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {testResults.gemini && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testResults.gemini.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {testResults.gemini.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{testResults.gemini.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Suggestions Configuration */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-gray-900 dark:text-white">Content Suggestions</h4>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              AI Provider
            </label>
            <div className="relative">
              <div className={iconWrapperClasses}>
                <Bot className="h-5 w-5 text-[#3B7443]" />
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Model select */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              Model
            </label>
            <div className="relative">
              <div className={iconWrapperClasses}>
                <Settings2 className="h-5 w-5 text-[#3B7443]" />
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Bot className="w-4 h-4 text-[#3B7443]" />
            <span>These settings will be used for generating titles, content, and tags.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={buttonClasses}
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>

            {saveResult && (
              <div className={`flex items-center gap-2 text-sm ${
                saveResult.success
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {saveResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{saveResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
