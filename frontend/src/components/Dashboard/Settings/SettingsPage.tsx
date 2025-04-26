import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Bell, Shield, Database, Settings2, Palette, Sparkles, Cpu,
  Lock, BarChart2, KeyRound, History, Link2, BellRing, Timer,
  Zap, User, Puzzle, RefreshCw, AlertCircle
} from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { AISettingsSection } from './AISettingsSection';
import { ImportNotesSection } from './ImportNotesSection';
import { AISettings } from '../../../types/ai';
import { ThemeName } from '../../../theme/theme.config';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { notificationService } from '../../../services/notification/notificationService';
import { integrationsService, SyncResult } from '../../../services/api/integrations.service';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { SyncResultModal } from './SyncResultModal';

// Placeholder function to generate state parameter
const generateState = () => Math.random().toString(36).substring(2, 15);

// Type for the settings tabs
type SettingsTabs = 'appearance' | 'notifications' | 'security' | 'aiconfig' | 'dataManagement' | 'account' | 'integrations';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabs>(() => {
    // Initialize from localStorage or default to 'appearance'
    const savedTab = localStorage.getItem('settings_active_tab') as SettingsTabs | null;
    return savedTab || 'appearance';
  });
  const { isTickTickConnected, syncWithTickTick, getSyncStatus, resetSyncData, isSyncing, syncError: tasksSyncError } = useTasks();

  // Save activeTab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('settings_active_tab', activeTab);
  }, [activeTab]);

  // Initialize from localStorage for immediate UI feedback
  const [isTickTickConnectedUI, setIsTickTickConnectedUI] = useState<boolean>(() => {
    const stored = localStorage.getItem('ticktick_connected');
    return stored === 'true';
  });

  // Ensure local connection state matches the context value
  useEffect(() => {
    setIsTickTickConnectedUI(isTickTickConnected);
  }, [isTickTickConnected]);

  // Sync configuration state
  const [syncDirection, setSyncDirection] = useState<'two-way' | 'to-ticktick' | 'from-ticktick'>('two-way');
  const [syncFrequency, setSyncFrequency] = useState<string>('manual');
  const [conflictResolution, setConflictResolution] = useState<string>('newer');
  const [syncTags, setSyncTags] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<{ local: number; tickTick: number; mapped: number }>({
    local: 0,
    tickTick: 0,
    mapped: 0
  });
  // Define a constant for the TickTick project ID instead of using useState
  const tickTickProjectId = '680d480e99b2d107415feee4'; // 'Second Brain' project ID

  // State for the sync result modal
  const [showSyncResultModal, setShowSyncResultModal] = useState(false);
  const [currentSyncResult, setCurrentSyncResult] = useState<SyncResult | null>(null);

  // Use the sync error from context if available
  useEffect(() => {
    if (tasksSyncError) {
      setSyncError(tasksSyncError);
    }
  }, [tasksSyncError]);

  // Formatted last synced time
  const formatLastSynced = () => {
    if (!lastSynced) return 'Never';

    try {
      const date = new Date(lastSynced);
      const now = new Date();

      // If synced today, show time
      if (date.toDateString() === now.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // If synced yesterday, show "Yesterday"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // Otherwise show date and time
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Load sync settings from localStorage
  useEffect(() => {
    const storedDirection = localStorage.getItem('ticktick_sync_direction');
    if (storedDirection && (storedDirection === 'two-way' || storedDirection === 'to-ticktick' || storedDirection === 'from-ticktick')) {
      setSyncDirection(storedDirection);
    }

    const storedFrequency = localStorage.getItem('ticktick_sync_frequency');
    if (storedFrequency) {
      setSyncFrequency(storedFrequency);
    }

    const storedResolution = localStorage.getItem('ticktick_conflict_resolution');
    if (storedResolution) {
      setConflictResolution(storedResolution);
    }

    const storedSyncTags = localStorage.getItem('ticktick_sync_tags');
    if (storedSyncTags !== null) {
      setSyncTags(storedSyncTags === 'true');
    }

    const storedLastSynced = localStorage.getItem('ticktick_last_synced');
    if (storedLastSynced) {
      setLastSynced(storedLastSynced);
    }
  }, []);

  // Save sync settings to localStorage when they change
  useEffect(() => {
    if (isTickTickConnected) {
      localStorage.setItem('ticktick_sync_direction', syncDirection);
      localStorage.setItem('ticktick_sync_frequency', syncFrequency);
      localStorage.setItem('ticktick_conflict_resolution', conflictResolution);
      localStorage.setItem('ticktick_sync_tags', String(syncTags));
    }
  }, [isTickTickConnected, syncDirection, syncFrequency, conflictResolution, syncTags]);

  // Check for OAuth callback and verify current status
  useEffect(() => {
    console.log("[SettingsPage Effect] Running. Location search:", location.search);

    // Initialize push notification state
    setPushNotifications(notificationService.isNotificationsEnabled());

    const params = new URLSearchParams(location.search);
    const integrationStatus = params.get('integration_status');
    console.log("[SettingsPage Effect] Integration status param:", integrationStatus);

    if (integrationStatus === 'ticktick_success') {
      console.log("[SettingsPage Effect] TickTick success detected! Setting connected state.");
      setIsTickTickConnectedUI(true);

      // Remove the query parameter from the URL without reloading the page
      console.log("[SettingsPage Effect] Removing query param...");
      navigate(location.pathname, { replace: true });
    } else {
      console.log("[SettingsPage Effect] No TickTick success param found. Checking backend status.");
      // Check actual status from backend
      const checkStatus = async () => {
        try {
          const status = await integrationsService.getTickTickStatus();
          console.log("[SettingsPage] Backend reports TickTick status:", status.isConnected);
          setIsTickTickConnectedUI(status.isConnected);
        } catch (error) {
          console.error("[SettingsPage] Error checking TickTick status:", error);
          // Don't change the state on error - keep whatever was in localStorage
        }
      };

      checkStatus();
    }
  }, [location, navigate]);

  // Load sync status from backend using the Tasks context
  const loadSyncStatus = useCallback(async () => {
    if (!isTickTickConnected) return;

    try {
      const status = await getSyncStatus();
      if (status.lastSynced) {
        setLastSynced(status.lastSynced);
        localStorage.setItem('ticktick_last_synced', status.lastSynced);
      }

      setSyncStats(status.taskCount);
    } catch (error) {
      console.error("Error loading sync status:", error);
      // Use cached values from localStorage if available
      const storedLastSynced = localStorage.getItem('ticktick_last_synced');
      if (storedLastSynced) {
        setLastSynced(storedLastSynced);
      }
    }
  }, [isTickTickConnected, getSyncStatus]);

  // Load sync status when component mounts or when ticktick connection changes
  useEffect(() => {
    if (isTickTickConnected && activeTab === 'integrations') {
      loadSyncStatus();
    }
  }, [isTickTickConnected, activeTab, loadSyncStatus]);

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

  const handleConnectTickTick = () => {
    // Access environment variables using Vite's import.meta.env
    const clientId = import.meta.env.VITE_TICKTICK_CLIENT_ID || 'YOUR_TICKTICK_CLIENT_ID';
    // Use the new callback path within the dashboard
    const redirectUri = import.meta.env.VITE_TICKTICK_REDIRECT_URI || 'http://localhost:5173/dashboard/callback/ticktick';
    const scope = 'tasks:read tasks:write';
    const state = generateState();

    localStorage.setItem('ticktick_oauth_state', state);

    console.log("TickTick Auth Params:", { clientId, redirectUri, scope, state });

    const authUrl = `https://ticktick.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

    console.log("Redirecting to:", authUrl);
    window.location.href = authUrl;
  };

  const handleDisconnectTickTick = async () => {
    console.log("Attempting to disconnect TickTick...");
    try {
      const success = await integrationsService.disconnectTickTick();
      if (success) {
        console.log("TickTick disconnected successfully.");
        setIsTickTickConnectedUI(false);
        // Optional: Show a success notification
      } else {
        throw new Error("Disconnect operation failed.");
      }
    } catch (error: unknown) {
      console.error("Error disconnecting TickTick:", error);
      // Optional: Show an error notification to the user
      let errorMessage = "Could not disconnect TickTick.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Error: ${errorMessage}`); // Replace alert with a proper notification
    }
  };

  const handleSyncDirectionChange = (direction: 'two-way' | 'to-ticktick' | 'from-ticktick') => {
    // Fix casing if needed to match backend expectations
    setSyncDirection(direction);

    // Clear any previous sync errors when changing direction
    setSyncError(null);

    console.log(`Changed sync direction to: ${direction}`);
  };

  const handleSyncFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSyncFrequency(e.target.value);
  };

  const handleConflictResolutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConflictResolution(e.target.value);
  };

  const handleSyncTagsChange = () => {
    setSyncTags(!syncTags);
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;

    setSyncError(null);

    try {
      console.log(`Starting sync with direction: ${syncDirection}, resolutionStrategy: ${conflictResolution}, includeTags: ${syncTags}, projectId: ${tickTickProjectId}`);

      // Call the sync API with the current configuration using the Tasks context
      const result = await syncWithTickTick({
        direction: syncDirection,
        resolutionStrategy: conflictResolution,
        includeTags: syncTags,
        projectId: tickTickProjectId // Add the projectId to the config
      });

      console.log("Sync completed successfully:", result);

      // Update the last synced time
      setLastSynced(result.lastSynced);
      localStorage.setItem('ticktick_last_synced', result.lastSynced);

      // Refresh the sync status to update counts
      await loadSyncStatus();

      // Show success notification using the modal
      // alert(successMessage); // Replace with proper notification
      setCurrentSyncResult(result);
      setShowSyncResultModal(true);
      console.log("[handleSyncNow] Sync Success. Setting modal state:", result);

    } catch (error) {
      console.error("Error syncing tasks:", error);

      let errorMessage = "Failed to sync tasks. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`Detailed sync error: ${errorMessage}`);
      }

      setSyncError(errorMessage);

      // Show error notification using the modal (or a separate error notification system)
      // alert(errorMessage); // Replace with proper notification
      setCurrentSyncResult({
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1, // Assume at least one error occurred
        message: errorMessage,
        lastSynced: lastSynced || new Date().toISOString() // Use last known or current time
      });
      setShowSyncResultModal(true);
      console.log("[handleSyncNow] Sync Error. Setting modal state with error:", errorMessage);
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

  const secondaryButtonClasses = `
    flex items-center gap-2 px-4 py-2
    bg-gray-500/20 hover:bg-gray-500/30
    text-[var(--color-textSecondary)] rounded-lg transition-all duration-200
    shadow-sm hover:shadow-md
    text-sm font-medium
    border-[0.5px] border-white/10
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
    ),
    integrations: (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-text)]">Integrations</h3>
        <p className="text-sm text-[var(--color-textSecondary)]">Connect Second Brain with other services.</p>

        <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
          <h4 className="font-medium text-[var(--color-text)] mb-4">Task Management</h4>

          <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4CAF50]/10 backdrop-blur-sm">
                {/* Placeholder TickTick Icon - Replace if you have a specific one */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#4CAF50]" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">TickTick</p>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  {isTickTickConnectedUI ? "Connected" : "Sync tasks with your TickTick account"}
                </p>
              </div>
            </div>
            {isTickTickConnectedUI ? (
              <button
                onClick={handleDisconnectTickTick}
                className={secondaryButtonClasses} // Use secondary style for disconnect
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectTickTick}
                className={primaryButtonClasses}
              >
                Connect
              </button>
            )}
          </div>

          {/* Add TickTick Sync Configuration (only visible when connected) */}
          {isTickTickConnectedUI && (
            <div className={`mt-4 p-4 ${innerElementClasses}`}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-[var(--color-text)]">Sync Configuration</h5>
                {/* Reset button handler */}
                {syncStats.mapped > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to reset all sync data? This will not delete any tasks but will remove all mappings between Second Brain and TickTick.")) {
                        try {
                          await resetSyncData();
                          setSyncStats({ local: syncStats.local, tickTick: 0, mapped: 0 });
                          setLastSynced(null);
                          localStorage.removeItem('ticktick_last_synced');
                          alert("Sync data reset successfully.");
                        } catch (error) {
                          console.error("Error resetting sync data:", error);
                          alert("Failed to reset sync data.");
                        }
                      }
                    }}
                    className={`text-xs px-2 py-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors`}
                  >
                    Reset Sync
                  </button>
                )}
              </div>

              {/* Show sync stats */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="p-2 bg-[var(--color-surface)]/50 rounded-lg border border-[var(--color-border)]">
                  <div className="text-[10px] text-[var(--color-textSecondary)]">Local Tasks</div>
                  <div className="text-lg font-semibold text-[var(--color-text)]">{syncStats.local}</div>
                </div>
                <div className="p-2 bg-[var(--color-surface)]/50 rounded-lg border border-[var(--color-border)]">
                  <div className="text-sm text-[var(--color-textSecondary)]">TickTick Tasks</div>
                  <div className="text-lg font-semibold text-[var(--color-text)]">{syncStats.tickTick}</div>
                </div>
                <div className="p-2 bg-[var(--color-surface)]/50 rounded-lg border border-[var(--color-border)]">
                  <div className="text-[10px] text-[var(--color-textSecondary)]">Synced Tasks</div>
                  <div className="text-lg font-semibold text-[var(--color-text)]">{syncStats.mapped}</div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Sync Direction */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--color-textSecondary)]">Sync Direction</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSyncDirectionChange('two-way')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors 
                        ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] border border-white/10
                        ${syncDirection === 'two-way' ? 'text-[var(--color-accent)]' : 'text-[var(--color-textSecondary)]'}`}
                    >
                      Two-way Sync
                    </button>
                    <button
                      onClick={() => handleSyncDirectionChange('to-ticktick')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors 
                        ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] border border-white/10
                        ${syncDirection === 'to-ticktick' ? 'text-[var(--color-accent)]' : 'text-[var(--color-textSecondary)]'}`}
                    >
                      Second Brain → TickTick
                    </button>
                    <button
                      onClick={() => handleSyncDirectionChange('from-ticktick')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors 
                        ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] border border-white/10
                        ${syncDirection === 'from-ticktick' ? 'text-[var(--color-accent)]' : 'text-[var(--color-textSecondary)]'}`}
                    >
                      TickTick → Second Brain
                    </button>
                  </div>
                </div>

                {/* Sync Frequency */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--color-textSecondary)]">Sync Frequency</label>
                  <select
                    value={syncFrequency}
                    onChange={handleSyncFrequencyChange}
                    className={`px-3 py-2 rounded-lg text-sm
                      ${getContainerBackground()}
                      border-[0.5px] border-white/10
                      text-[var(--color-text)]
                      hover:bg-[var(--color-surfaceHover)]
                      transition-all duration-200
                    `}
                  >
                    <option value="manual">Manual Sync Only</option>
                    <option value="5">Every 5 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                  </select>
                </div>

                {/* Conflict Resolution */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--color-textSecondary)]">Conflict Resolution</label>
                  <select
                    value={conflictResolution}
                    onChange={handleConflictResolutionChange}
                    className={`px-3 py-2 rounded-lg text-sm
                      ${getContainerBackground()}
                      border-[0.5px] border-white/10
                      text-[var(--color-text)]
                      hover:bg-[var(--color-surfaceHover)]
                      transition-all duration-200
                    `}
                  >
                    <option value="newer">Use Newest Change</option>
                    <option value="ticktick">Prefer TickTick</option>
                    <option value="secondbrain">Prefer Second Brain</option>
                    <option value="ask">Ask Me</option>
                  </select>
                </div>

                {/* Sync Tags */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-textSecondary)]">Sync Tags</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Keep tags in sync between platforms</p>
                  </div>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={syncTags}
                      onChange={handleSyncTagsChange}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </div>
                </div>

                {/* Error message if any */}
                {syncError && (
                  <div className="mt-1 p-3 bg-red-500/10 rounded-lg flex items-center gap-2 text-red-500 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">{syncError}</p>
                  </div>
                )}

                {/* Manual Sync Button */}
                <div className="pt-4 flex justify-between items-center border-t border-white/10">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text)]">Last synced: {formatLastSynced()}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Sync to update tasks between platforms</p>
                  </div>
                  <button
                    type="button"
                    className={`${primaryButtonClasses} ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6"></path>
                          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                          <path d="M3 22v-6h6"></path>
                          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                        </svg>
                        Sync Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  };

  // Log the state value just before rendering
  console.log('[SettingsPage Render] isTickTickConnected:', isTickTickConnected);

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
              {/* Integrations Tab Button */}
              <button
                onClick={() => setActiveTab('integrations')}
                className={activeTab === 'integrations' ? activeButtonClasses : buttonClasses}
              >
                <Puzzle className="w-4 h-4" />
                Integrations
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

      {/* Render the SyncResultModal */}
      <SyncResultModal
        isOpen={showSyncResultModal}
        onClose={() => setShowSyncResultModal(false)}
        result={currentSyncResult}
        key={currentSyncResult ? `sync-result-${currentSyncResult.lastSynced}` : 'sync-result-modal'}
      />
    </div>
  );
}