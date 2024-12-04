import { useTheme } from '../../../contexts/themeContextUtils';
import { Moon, Sun, Bell, Shield, Database, Settings2, Palette, Sparkles } from 'lucide-react';
import { AISettingsSection } from './AISettingsSection';
import { AISettings } from '../../../types/ai';
import { useState } from 'react';
import { ThemeName } from '../../../theme/theme.config';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(false);

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
  };

  const handleSaveAISettings = async (settings: AISettings) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (settings.openaiApiKey) {
        localStorage.setItem('openai_api_key', settings.openaiApiKey);
      }
      if (settings.contentSuggestions) {
        localStorage.setItem('content_suggestions_provider', settings.contentSuggestions.provider);
        localStorage.setItem('content_suggestions_model', settings.contentSuggestions.modelId);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-surface dark:from-background dark:via-background dark:to-surface opacity-50 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="relative overflow-hidden rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent" />
          <div className="relative p-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10">
                <Settings2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Settings</h1>
                <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                  Customize your Second Brain experience
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Appearance Section */}
            <div className="group rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/10">
              <div className="p-6 border-b border-white/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Appearance
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Theme Options */}
                <div className="space-y-3">
                  {/* Light Theme */}
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                        <Sun className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">Light</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Clean and bright appearance
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'light'}
                      onChange={() => handleThemeChange('light')}
                      className="w-5 h-5 text-emerald-500 bg-white/5 border-white/10 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-2 dark:bg-white/5 dark:border-white/10"
                    />
                  </label>

                  {/* Dark Theme */}
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                        <Moon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">Dark</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Easy on the eyes
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'dark'}
                      onChange={() => handleThemeChange('dark')}
                      className="w-5 h-5 text-emerald-500 bg-white/5 border-white/10 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-2 dark:bg-white/5 dark:border-white/10"
                    />
                  </label>

                  {/* Midnight Theme */}
                  <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                        <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">Midnight</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Deep dark experience
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'midnight'}
                      onChange={() => handleThemeChange('midnight')}
                      className="w-5 h-5 text-emerald-500 bg-white/5 border-white/10 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-2 dark:bg-white/5 dark:border-white/10"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="group rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/10">
              <div className="p-6 border-b border-white/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                      <Bell className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Push Notifications</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Get notified about updates and reminders
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input 
                      type="checkbox" 
                      checked={pushNotifications} 
                      onChange={() => setPushNotifications(!pushNotifications)} 
                      className="sr-only peer" 
                    />
                    <div className="w-14 h-7 bg-white/5 dark:bg-white/5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Security Section */}
            <div className="group rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/10">
              <div className="p-6 border-b border-white/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Security
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                      <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Two-Factor Authentication</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Add an extra layer of security
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div className="group rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/10">
              <div className="p-6 border-b border-white/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Data Management
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10">
                      <Database className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Export Data</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Download all your notes and data
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-900 dark:text-white text-sm font-medium transition-colors border border-white/10 dark:border-white/10">
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings Section - Full Width */}
        <div className="group rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/10">
          <AISettingsSection onSave={handleSaveAISettings} />
        </div>
      </div>
    </div>
  );
}