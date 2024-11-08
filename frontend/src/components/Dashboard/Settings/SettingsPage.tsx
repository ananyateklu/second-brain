import { useTheme } from '../../../contexts/ThemeContext';
import { Moon, Sun, Bell, Shield, Database } from 'lucide-react';
import { AISettingsSection } from './AISettingsSection';

interface AISettings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  localModelPath?: string;
  localModelParams?: {
    temperature: number;
    maxTokens: number;
  };
  contentSuggestions?: {
    provider: 'openai' | 'anthropic' | 'gemini';
    modelId: string;
  };
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const handleSaveAISettings = async (settings: AISettings) => {
    try {
      // Simulate an API call or save operation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Save settings to local storage
      if (settings.openaiApiKey) {
        localStorage.setItem('openai_api_key', settings.openaiApiKey);
      }
      if (settings.contentSuggestions) {
        localStorage.setItem('content_suggestions_provider', settings.contentSuggestions.provider);
        localStorage.setItem('content_suggestions_model', settings.contentSuggestions.modelId);
      }

    } catch (error) {
      // Show error message
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-morphism p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h2>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
            <div className="glass-morphism p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {theme === 'dark' ? 'Dark mode is enabled' : 'Light mode is enabled'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                >
                  Toggle Theme
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h3>
            <div className="glass-morphism p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications for updates and reminders
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security</h3>
            <div className="glass-morphism p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data</h3>
            <div className="glass-morphism p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Download all your notes and data
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors">
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <AISettingsSection onSave={handleSaveAISettings} />
        </div>
      </div>
    </div>
  );
}