import React, { useState } from 'react';
import { Bot, Key, TestTube, EyeOff, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';

interface AISettings {
  openaiApiKey?: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

interface AISettingsSectionProps {
  onSave: (settings: AISettings) => Promise<void>;
}

export function AISettingsSection({ onSave }: AISettingsSectionProps) {
  const { configureOpenAI } = useAI();
  const [settings, setSettings] = useState<AISettings>({
    openaiApiKey: localStorage.getItem('openai_api_key') || '',
  });

  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testConnection = async (service: 'openai') => {
    setIsTestingOpenAI(true);
    setTestResults(prev => ({ ...prev, [service]: undefined }));

    try {
      await configureOpenAI(settings.openaiApiKey || '');
      setTestResults(prev => ({
        ...prev,
        [service]: { 
          success: true, 
          message: 'Connection successful!' 
        }
      }));
    } catch (error: any) {
      console.error(`${service} test connection error:`, error);
      setTestResults(prev => ({
        ...prev,
        [service]: { 
          success: false, 
          message: error?.message || `Failed to connect to ${service}. Please check your credentials.`
        }
      }));
    } finally {
      setIsTestingOpenAI(false);
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
              <div className={`flex items-center gap-2 text-sm ${
                testResults.openai.success 
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

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Note: Anthropic (Claude) integration will be available soon through our backend service.
        </p>
      </div>
    </div>
  );
}