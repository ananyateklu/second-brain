import { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Shield, Database, Settings2, Palette, Sparkles, Cpu, Lock, BarChart2, KeyRound, History, Link2, BellRing, Timer, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { AISettingsSection } from './AISettingsSection';
import { ImportNotesSection } from './ImportNotesSection';
import { AISettings } from '../../../types/ai';
import { ThemeName } from '../../../theme/theme.config';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { notificationService } from '../../../services/notification/notificationService';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    // Initialize push notification state
    setPushNotifications(notificationService.isNotificationsEnabled());
  }, []);

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
  };

  const handlePushNotificationChange = async () => {
    if (!pushNotifications) {
      const enabled = await notificationService.enableNotifications();
      setPushNotifications(enabled);
      if (!enabled) {
        // TODO: Show a toast or alert to inform the user that notifications couldn't be enabled
        console.warn('Failed to enable notifications');
      } else {
        // Send a test notification
        await notificationService.showNotification(
          'Notifications Enabled',
          {
            body: 'You will now receive notifications for reminders and achievements.',
            requireInteraction: false,
            tag: 'notifications-enabled'
          }
        );
      }
    } else {
      notificationService.disableNotifications();
      setPushNotifications(false);
    }
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
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
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

        {/* Settings Grid - Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Appearance Section */}
            <motion.div
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                    <Palette className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Appearance</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Customize your Second Brain experience
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Theme Options */}
                <div className="space-y-4">
                  {/* Light Theme */}
                  <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Sun className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-[var(--color-text)]">Light</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Clean and bright appearance
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'light'}
                      onChange={() => handleThemeChange('light')}
                      className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
                    />
                  </label>

                  {/* Dark Theme */}
                  <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Moon className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-[var(--color-text)]">Dark</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Easy on the eyes
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'dark'}
                      onChange={() => handleThemeChange('dark')}
                      className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
                    />
                  </label>

                  {/* Midnight Theme */}
                  <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-[var(--color-text)]">Midnight</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Deep dark experience
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'midnight'}
                      onChange={() => handleThemeChange('midnight')}
                      className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
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
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                    <Bell className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Notifications</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Manage your notification preferences
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Bell className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Push Notifications</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Get notified about updates and reminders
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={handlePushNotificationChange}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </label>

                {pushNotifications && (
                  <>
                    <div className={`flex items-center justify-between p-3 ${innerElementClasses}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                          <BellRing className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[var(--color-text)]">Notification Sound</p>
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            Play a sound when notifications arrive
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--color-textSecondary)]">Default Sound</span>
                        <div className="relative inline-flex">
                          <button
                            className={`
                              px-3 py-1.5 rounded-lg text-xs
                              ${getContainerBackground()}
                              border-[0.5px] border-white/10
                              text-[var(--color-text)]
                              hover:bg-[var(--color-surfaceHover)]
                              transition-all duration-200
                              flex items-center gap-2
                            `}
                            onClick={() => { }}
                          >
                            <span>Default Sound</span>
                            <ChevronDown className="w-3 h-3 text-[var(--color-textSecondary)]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        notificationService.showNotification('Test Notification', {
                          body: 'This is a test notification.',
                          tag: 'test-notification',
                          requireInteraction: false
                        });
                      }}
                      className={`
                        w-full p-3
                        flex items-center justify-center gap-2
                        text-sm text-[var(--color-textSecondary)]
                        hover:text-[var(--color-text)]
                        transition-all duration-200
                      `}
                    >
                      <Bell className="w-4 h-4" />
                      Send Test Notification
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Security Section */}
            <motion.div
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                    <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Security</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Manage your security settings
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Two-Factor Authentication */}
                <div className={`flex items-center justify-between p-3 ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Two-Factor Authentication</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Add an extra layer of security
                      </p>
                    </div>
                  </div>
                  <button className={`
                    px-4 py-2 rounded-lg text-xs font-medium
                    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                    text-white transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                  `}>
                    Enable
                  </button>
                </div>

                {/* Session Timeout */}
                <div className={`flex items-center justify-between p-3 ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Timer className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Session Timeout</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Auto-logout after inactivity
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-textSecondary)]">30 minutes</span>
                    <button
                      className={`
                        px-3 py-1.5 rounded-lg text-xs
                        ${getContainerBackground()}
                        border-[0.5px] border-white/10
                        text-[var(--color-text)]
                        hover:bg-[var(--color-surfaceHover)]
                        transition-all duration-200
                        flex items-center gap-2
                      `}
                      onClick={() => { }}
                    >
                      <span>30 minutes</span>
                      <ChevronDown className="w-3 h-3 text-[var(--color-textSecondary)]" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Privacy Settings */}
            <motion.div
              variants={cardVariants}
              className={sectionClasses}
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                    <Lock className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">Privacy</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Control your privacy preferences
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Data Collection */}
                <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <BarChart2 className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Usage Analytics</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Help improve Second Brain by sharing anonymous usage data
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => { }}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </label>

                {/* End-to-End Encryption */}
                <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <KeyRound className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">End-to-End Encryption</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Encrypt your notes with a personal key
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => { }}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </label>

                {/* Activity History */}
                <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <History className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Activity History</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Save your note editing history
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => { }}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </label>

                {/* Link Previews */}
                <label className={`flex items-center justify-between p-3 cursor-pointer ${innerElementClasses}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                      <Link2 className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--color-text)]">Link Previews</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Generate previews for external links
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => { }}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </label>
              </div>
            </motion.div>
          </div>
        </div>

        {/* AI Configuration Section - Full Width */}
        <motion.div
          variants={cardVariants}
          className={sectionClasses}
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Cpu className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">AI Configuration</h3>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Configure your AI providers and models
                </p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <AISettingsSection onSave={handleSaveAISettings} />
          </div>
        </motion.div>

        {/* Import & Export Section - Full Width */}
        <motion.div
          variants={cardVariants}
          className={sectionClasses}
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Database className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Data Management</h3>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  Manage your data and exports
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <ImportNotesSection />
          </div>
        </motion.div>
      </div>
    </div>
  );
}