import React, { useState } from 'react';
import { Bot, Key, TestTube, EyeOff, Eye, AlertCircle, CheckCircle, Loader, Save } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-primary-600 dark:text-primary-500" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Settings
        </h2>
      </div>

      {/* OpenAI Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          OpenAI Configuration
        </h3>
        <div className="glass-morphism p-6 rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showOpenAIKey ? 'text' : 'password'}
                name="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showOpenAIKey ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => testConnection('openai')}
              disabled={isTestingOpenAI || !settings.openaiApiKey}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Google Gemini Configuration
        </h3>
        <div className="glass-morphism p-6 rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showGeminiApiKey ? 'text' : 'password'}
                name="geminiApiKey"
                value={settings.geminiApiKey}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                placeholder="Your Gemini API Key"
              />
              <button
                type="button"
                onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showGeminiApiKey ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => testConnection('gemini')}
              disabled={isTestingGemini || !settings.geminiApiKey}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Content Suggestions
        </h3>
        <div className="glass-morphism p-6 rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Provider
            </label>
            <select
              name="contentSuggestionsProvider"
              value={settings.contentSuggestions?.provider}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            >
              {isOpenAIConfigured && <option value="openai">OpenAI</option>}
              {isGeminiConfigured && <option value="gemini">Google Gemini</option>}
              {<option value="anthropic">Anthropic (Claude)</option>}
              {isLlamaConfigured && <option value="llama">Llama</option>}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
            </label>
            <select
              name="contentSuggestionsModel"
              value={settings.contentSuggestions?.modelId}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            >
              {contentGenerationModels
                .filter(model => model.provider === settings.contentSuggestions?.provider)
                .map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Bot className="w-4 h-4" />
            <span>These settings will be used for generating titles, content, and tags.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className={`flex items-center gap-2 text-sm ${saveResult.success
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
