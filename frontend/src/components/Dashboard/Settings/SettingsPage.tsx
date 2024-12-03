import { useTheme } from '../../../contexts/ThemeContext';
import { Moon, Sun, Bell, Shield, Database, Settings } from 'lucide-react';
import { AISettingsSection } from './AISettingsSection';
import { AISettings } from '../../../types/ai';

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
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient - matches Dashboard.tsx */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customize your Second Brain experience
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Appearance Section */}
            <div className="glass-morphism p-6 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-4">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                ) : (
                  <Sun className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h3>
              </div>
              <div className="space-y-4">
                <div className="group flex items-center justify-between p-4 rounded-lg bg-white/40 dark:bg-gray-800/40 border border-gray-200/30 dark:border-gray-700/30 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      {theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {theme === 'dark' ? 'Dark mode is enabled' : 'Light mode is enabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 dark:bg-primary-400/10 dark:hover:bg-primary-400/20 text-primary-600 dark:text-primary-400 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Toggle Theme
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="glass-morphism p-6 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
              </div>
              <div className="space-y-4">
                <div className="group flex items-center justify-between p-4 rounded-lg bg-white/40 dark:bg-gray-800/40 border border-gray-200/30 dark:border-gray-700/30 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
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
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Security Section */}
            <div className="glass-morphism p-6 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security
                </h3>
              </div>
              <div className="space-y-4">
                <div className="group flex items-center justify-between p-4 rounded-lg bg-white/40 dark:bg-gray-800/40 border border-gray-200/30 dark:border-gray-700/30 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md">
                    Enable
                  </button>
                </div>
              </div>
            </div>

            {/* Data Section */}
            <div className="glass-morphism p-6 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Data Management
                </h3>
              </div>
              <div className="space-y-4">
                <div className="group flex items-center justify-between p-4 rounded-lg bg-white/40 dark:bg-gray-800/40 border border-gray-200/30 dark:border-gray-700/30 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      <Database className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Download all your notes and data
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-white/60 hover:bg-white/80 dark:bg-gray-800/60 dark:hover:bg-gray-800/80 text-gray-900 dark:text-white font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md border border-gray-200/30 dark:border-gray-700/30">
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings Section - Full Width */}
        <div className="glass-morphism p-6 rounded-xl border border-gray-200/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-shadow duration-200">
          <AISettingsSection onSave={handleSaveAISettings} />
        </div>
      </div>
    </div>
  );
}