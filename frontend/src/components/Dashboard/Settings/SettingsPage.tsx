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

  const sectionClasses = `
    relative 
    overflow-hidden 
    rounded-2xl 
    bg-white/20
    dark:bg-white/5
    border-[1.5px] 
    border-white/40
    dark:border-white/30
    backdrop-blur-xl 
    shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.1)]
    dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)]
    hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.2)]
    dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.2)]
    ring-1
    ring-black/5
    dark:ring-white/10
    hover:ring-black/10
    dark:hover:ring-white/20
    transition-all 
    duration-300 
    group
  `;

  const innerElementClasses = `
    bg-white/20
    dark:bg-white/5
    border-[1.5px] 
    border-white/40
    dark:border-white/30
    backdrop-blur-xl
    rounded-xl
    transition-all
    duration-200
    hover:bg-white/30
    dark:hover:bg-white/10
  `;

  const toggleClasses = `
    w-14 
    h-7 
    bg-gray-400/50
    dark:bg-gray-700/30
    rounded-full 
    peer 
    peer-checked:after:translate-x-full 
    after:content-[''] 
    after:absolute 
    after:top-[2px] 
    after:left-[2px] 
    after:bottom-[2px]
    after:bg-white
    dark:after:bg-gray-200
    after:rounded-full 
    after:w-6 
    after:transition-all 
    after:shadow-sm
    peer-checked:bg-[var(--color-accent)]
    peer-checked:border-[var(--color-accent)]
    border-[1.5px]
    border-gray-400/50
    dark:border-gray-600/30
    transition-all
    duration-300
    backdrop-blur-sm
    hover:bg-gray-500/50
    dark:hover:border-gray-500/40
    peer-checked:hover:bg-[var(--color-accent)]/90
    peer-checked:hover:border-[var(--color-accent)]/90
  `;

  return (
    <div className="h-full">
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)]/50 via-[var(--color-background)]/30 to-[var(--color-surface)]/20 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className={sectionClasses}>
          <div className="p-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 dark:bg-white/5 backdrop-blur-sm border-[1.5px] border-white/40 dark:border-white/30">
                <Settings2 className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Settings</h1>
                <p className="mt-1 text-base text-[var(--color-textSecondary)]">
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
            <div className={sectionClasses}>
              <div className="p-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 dark:bg-white/5 backdrop-blur-sm border-[1.5px] border-white/40 dark:border-white/30">
                    <Palette className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Appearance</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Customize your Second Brain experience
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Theme Options */}
                <div className="space-y-3">
                  {/* Light Theme */}
                  <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Sun className="w-5 h-5 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Light</p>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          Clean and bright appearance
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'light'}
                      onChange={() => handleThemeChange('light')}
                      className="w-5 h-5 text-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)] focus:ring-[var(--color-accent)] focus:ring-2"
                    />
                  </label>

                  {/* Dark Theme */}
                  <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Moon className="w-5 h-5 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Dark</p>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          Easy on the eyes
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'dark'}
                      onChange={() => handleThemeChange('dark')}
                      className="w-5 h-5 text-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)] focus:ring-[var(--color-accent)] focus:ring-2"
                    />
                  </label>

                  {/* Midnight Theme */}
                  <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Midnight</p>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          Deep dark experience
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'midnight'}
                      onChange={() => handleThemeChange('midnight')}
                      className="w-5 h-5 text-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)] focus:ring-[var(--color-accent)] focus:ring-2"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className={sectionClasses}>
              <div className="p-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 dark:bg-white/5 backdrop-blur-sm border-[1.5px] border-white/40 dark:border-white/30">
                    <Bell className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Notifications</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Manage your notification preferences
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 dark:bg-white/5 backdrop-blur-sm border-[1.5px] border-white/40 dark:border-white/30">
                      <Bell className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)]">Push Notifications</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">
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
                    <div className={toggleClasses}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Security Section */}
            <div className={sectionClasses}>
              <div className="p-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Security</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Manage your security settings
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] transition-all duration-200 hover:bg-[var(--color-surface)] backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)]">Two-Factor Authentication</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        Add an extra layer of security
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white text-sm font-medium transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div className={sectionClasses}>
              <div className="p-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <Database className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Data Management</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Manage your data and exports
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] transition-all duration-200 hover:bg-[var(--color-surface)] backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Database className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)]">Export Data</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        Download all your notes and data
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] text-[var(--color-text)] text-sm font-medium transition-colors border border-[var(--color-border)]">
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings Section - Full Width */}
        <div className={sectionClasses}>
          <AISettingsSection onSave={handleSaveAISettings} />
        </div>
      </div>
    </div>
  );
}