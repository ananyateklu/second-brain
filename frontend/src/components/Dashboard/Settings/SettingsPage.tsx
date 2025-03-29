import { useState, useEffect } from 'react';
import {
  Moon, Sun, Bell, Shield, Database, Settings2, Palette, Sparkles, Cpu,
  Lock, BarChart2, KeyRound, History, Link2, BellRing, Timer,
  Zap, User
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('appearance');

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
        console.warn('Failed to enable notifications');
      } else {
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

  const buttonClasses = `
    text-sm flex items-center gap-2 px-4 py-2 rounded-lg
    ${getContainerBackground()}
    border-[0.5px] border-white/10
    text-[var(--color-text)]
    hover:bg-[var(--color-surfaceHover)]
    transition-all duration-200
  `;

  const activeButtonClasses = `
    text-sm flex items-center gap-2 px-4 py-2 rounded-lg
    bg-[var(--color-accent)]/10
    border-[0.5px] border-[var(--color-accent)]/20
    text-[var(--color-accent)]
    transition-all duration-200
  `;

  const primaryButtonClasses = `
    flex items-center gap-2 px-4 py-2
    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
    text-white rounded-lg transition-all duration-200 
    hover:scale-105 hover:-translate-y-0.5 
    shadow-sm hover:shadow-md
    text-sm font-medium
  `;

  const tabContent = {
    appearance: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Appearance</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Choose how Second Brain looks to you</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Light Theme */}
          <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'light' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                  <Sun className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <span className="font-medium text-[var(--color-text)]">Light</span>
              </div>
              <input
                type="radio"
                name="theme"
                checked={theme === 'light'}
                onChange={() => handleThemeChange('light')}
                className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
              />
            </div>
            <div className="h-32 w-full rounded-lg bg-gray-50 border border-gray-200"></div>
            <p className="text-xs text-[var(--color-textSecondary)] mt-3">Clean and bright appearance for daytime use</p>
          </label>

          {/* Dark Theme */}
          <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'dark' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                  <Moon className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <span className="font-medium text-[var(--color-text)]">Dark</span>
              </div>
              <input
                type="radio"
                name="theme"
                checked={theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
                className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
              />
            </div>
            <div className="h-32 w-full rounded-lg bg-gray-800 border border-gray-700"></div>
            <p className="text-xs text-[var(--color-textSecondary)] mt-3">Easy on the eyes in low-light environments</p>
          </label>

          {/* Midnight Theme */}
          <label className={`flex flex-col h-full cursor-pointer p-5 ${innerElementClasses} ${theme === 'midnight' ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <span className="font-medium text-[var(--color-text)]">Midnight</span>
              </div>
              <input
                type="radio"
                name="theme"
                checked={theme === 'midnight'}
                onChange={() => handleThemeChange('midnight')}
                className="w-4 h-4 accent-[var(--color-accent)] bg-[var(--color-surface)] border-[var(--color-border)]"
              />
            </div>
            <div className="h-32 w-full rounded-lg bg-[#0f172a] border border-[#1e293b]"></div>
            <p className="text-xs text-[var(--color-textSecondary)] mt-3">Deep dark experience for nighttime focus</p>
          </label>
        </div>
      </div>
    ),
    notifications: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Notifications</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Configure how you want to be notified</p>

        <div className="space-y-4 mt-6">
          <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                <Bell className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">Push Notifications</p>
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
              <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <BellRing className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">Notification Sound</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">
                      Play a sound when notifications arrive
                    </p>
                  </div>
                </div>
                <select
                  className={`
                    px-3 py-2 rounded-lg text-sm
                    ${getContainerBackground()}
                    border-[0.5px] border-white/10
                    text-[var(--color-text)]
                    hover:bg-[var(--color-surfaceHover)]
                    transition-all duration-200
                  `}
                >
                  <option>Default Sound</option>
                  <option>Soft Bell</option>
                  <option>Chime</option>
                  <option>None</option>
                </select>
              </div>

              <button
                onClick={() => {
                  notificationService.showNotification('Test Notification', {
                    body: 'This is a test notification.',
                    tag: 'test-notification',
                    requireInteraction: false
                  });
                }}
                className={primaryButtonClasses}
              >
                <Bell className="w-4 h-4" />
                Send Test Notification
              </button>
            </>
          )}
        </div>
      </div>
    ),
    security: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Security & Privacy</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Control your security and privacy settings</p>

        <div className="space-y-4 mt-6">
          <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">Two-Factor Authentication</p>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <button className={primaryButtonClasses}>
              Enable
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                <Timer className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">Session Timeout</p>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  Auto-logout after inactivity
                </p>
              </div>
            </div>
            <select
              className={`
                px-3 py-2 rounded-lg text-sm
                ${getContainerBackground()}
                border-[0.5px] border-white/10
                text-[var(--color-text)]
                hover:bg-[var(--color-surfaceHover)]
                transition-all duration-200
              `}
            >
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>Never</option>
            </select>
          </div>

          <div className="pt-6 border-t border-white/10">
            <h4 className="font-medium text-[var(--color-text)] mb-4">Privacy Preferences</h4>

            <div className="space-y-3">
              <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <BarChart2 className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">Usage Analytics</p>
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

              <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <KeyRound className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">End-to-End Encryption</p>
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

              <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <History className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">Activity History</p>
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

              <label className={`flex items-center justify-between p-4 cursor-pointer ${innerElementClasses}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 backdrop-blur-sm">
                    <Link2 className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)]">Link Previews</p>
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
          </div>
        </div>
      </div>
    ),
    aiconfig: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">AI Configuration</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Configure your AI providers and models</p>

        <AISettingsSection onSave={handleSaveAISettings} />
      </div>
    ),
    dataManagement: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Data Management</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Import, export and manage your data</p>

        <ImportNotesSection />
      </div>
    ),
    account: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Account</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Manage your account information</p>

        <div className="space-y-4 mt-6">
          <div className={`p-5 ${innerElementClasses}`}>
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getContainerBackground()} text-[var(--color-accent)]`}>
                <User className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--color-text)]">John Doe</h4>
                  <button className={`
                    px-3 py-1 rounded-lg text-xs
                    ${getContainerBackground()}
                    border-[0.5px] border-white/10
                    text-[var(--color-textSecondary)]
                    hover:bg-[var(--color-surfaceHover)]
                    transition-all duration-200
                  `}>
                    Edit
                  </button>
                </div>
                <p className="text-sm text-[var(--color-textSecondary)]">john.doe@example.com</p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-2">Member since January 2023</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="font-medium text-[var(--color-text)] mb-4">Subscription</h4>

            <div className={`p-5 ${innerElementClasses}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-[var(--color-text)]">Free Plan</h5>
                  <p className="text-sm text-[var(--color-textSecondary)]">Basic access to Second Brain features</p>
                </div>
                <button className={primaryButtonClasses}>
                  <Zap className="w-4 h-4" />
                  Upgrade
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-[var(--color-surface)]/50 border border-white/5">
                  <p className="text-xs text-[var(--color-textSecondary)]">Notes</p>
                  <p className="text-lg font-semibold text-[var(--color-text)]">50 / 100</p>
                  <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full mt-1 overflow-hidden">
                    <div className="h-full w-1/2 bg-[var(--color-accent)] rounded-full"></div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-surface)]/50 border border-white/5">
                  <p className="text-xs text-[var(--color-textSecondary)]">AI Credits</p>
                  <p className="text-lg font-semibold text-[var(--color-text)]">20 / 50</p>
                  <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full mt-1 overflow-hidden">
                    <div className="h-full w-[40%] bg-[var(--color-accent)] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`mb-8 ${sectionClasses}`}
        >
          <div className="p-6">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 backdrop-blur-sm border-[0.5px] border-white/10">
                <Settings2 className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
                <p className="mt-1 text-sm text-[var(--color-textSecondary)]">
                  Customize your Second Brain experience
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            variants={cardVariants}
            className={`p-3 h-fit ${sectionClasses}`}
          >
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('appearance')}
                className={activeTab === 'appearance' ? activeButtonClasses : buttonClasses}
              >
                <Palette className="w-4 h-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={activeTab === 'notifications' ? activeButtonClasses : buttonClasses}
              >
                <Bell className="w-4 h-4" />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={activeTab === 'security' ? activeButtonClasses : buttonClasses}
              >
                <Lock className="w-4 h-4" />
                Security & Privacy
              </button>
              <button
                onClick={() => setActiveTab('aiconfig')}
                className={activeTab === 'aiconfig' ? activeButtonClasses : buttonClasses}
              >
                <Cpu className="w-4 h-4" />
                AI Configuration
              </button>
              <button
                onClick={() => setActiveTab('dataManagement')}
                className={activeTab === 'dataManagement' ? activeButtonClasses : buttonClasses}
              >
                <Database className="w-4 h-4" />
                Data Management
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={activeTab === 'account' ? activeButtonClasses : buttonClasses}
              >
                <User className="w-4 h-4" />
                Account
              </button>
            </nav>
          </motion.div>

          {/* Main Content */}
          <motion.div
            variants={cardVariants}
            className={`p-6 ${sectionClasses}`}
          >
            {tabContent[activeTab as keyof typeof tabContent]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}