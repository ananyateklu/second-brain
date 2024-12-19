import { useState } from 'react';
import { Moon, Sun, Bell, Shield, Database, Settings2, Palette, Sparkles } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { AISettingsSection } from './AISettingsSection';
import { ImportNotesSection } from './ImportNotesSection';
import { AISettings } from '../../../types/ai';
import { ThemeName } from '../../../theme/theme.config';
import { cardVariants } from '../../../utils/welcomeBarUtils';

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

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const sectionClasses = `
    relative 
    overflow-hidden 
    rounded-2xl 
    ${getContainerBackground()}
    backdrop-blur-xl 
    border-[0.5px] 
    border-white/10
    shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
    dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
    ring-1
    ring-white/5
    transition-all 
    duration-300 
    group
  `;

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
    border-[0.5px]
    border-white/10
    transition-all
    duration-300
    backdrop-blur-sm
    hover:bg-gray-500/50
    dark:hover:border-gray-500/40
    peer-checked:hover:bg-[var(--color-accent)]/90
    peer-checked:hover:border-[var(--color-accent)]/90
  `;

  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={sectionClasses}
        >
          <div className="p-8">
            <motion.div 
              variants={cardVariants}
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Settings2 className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Settings</h1>
                <p className="mt-1 text-base text-[var(--color-textSecondary)]">
                  Customize your Second Brain experience
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Appearance Section */}
            <motion.div 
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
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
            </motion.div>

            {/* Notifications Section */}
            <motion.div 
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
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
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Security Section */}
            <motion.div 
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
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
                <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
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
                  <button className={`
                    px-4 py-2 rounded-lg 
                    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                    text-white text-sm font-medium 
                    transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                  `}>
                    Enable
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Data Management Section */}
            <motion.div 
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
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
                <ImportNotesSection />
              </div>
            </motion.div>
          </div>
        </div>

        {/* AI Settings Section - Full Width */}
        <motion.div 
          variants={cardVariants}
          className={sectionClasses}
        >
          <AISettingsSection onSave={handleSaveAISettings} />
        </motion.div>
      </div>
    </div>
  );
}