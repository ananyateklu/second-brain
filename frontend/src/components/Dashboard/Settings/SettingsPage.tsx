import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings2, Palette, Lock, Cpu,
  Database, User, Puzzle
} from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { AISettings } from '../../../types/ai';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { integrationsService, SyncResult } from '../../../services/api/integrations.service';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useNotes } from '../../../contexts/notesContextUtils';

// Lazy load section components
const AISettingsSection = lazy(() => import('./AISettingsSection').then(module => ({ default: module.AISettingsSection })));
const PreferencesSection = lazy(() => import('./PreferencesSection').then(module => ({ default: module.PreferencesSection })));
const SecuritySettingsSection = lazy(() => import('./SecuritySettingsSection').then(module => ({ default: module.SecuritySettingsSection })));
const DataManagementSettingsSection = lazy(() => import('./DataManagementSettingsSection').then(module => ({ default: module.DataManagementSettingsSection })));
const AccountSettingsSection = lazy(() => import('./AccountSettingsSection').then(module => ({ default: module.AccountSettingsSection })));
const IntegrationsSettingsSection = lazy(() => import('./IntegrationsSettingsSection').then(module => ({ default: module.IntegrationsSettingsSection })));
const SyncResultModal = lazy(() => import('./SyncResultModal').then(module => ({ default: module.SyncResultModal })));

const generateState = () => Math.random().toString(36).substring(2, 15);

// Type for the settings tabs
type SettingsTabs = 'appearance' | 'security' | 'aiconfig' | 'dataManagement' | 'account' | 'integrations';

export function SettingsPage() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isTickTickConnected,
    syncWithTickTick,
    getSyncStatus,
    resetSyncData,
    isSyncing,
    syncError: tasksSyncError,
    tickTickProjectId,
    updateTickTickProjectId
  } = useTasks();

  const {
    isTickTickConnected: notesTickTickConnected,
    tickTickProjectId: tickTickNotesProjectId,
    updateTickTickProjectId: updateTickTickNotesProjectId,
    getSyncStatus: getNoteSyncStatus
  } = useNotes();

  const [activeTab, setActiveTab] = useState<SettingsTabs>(() => {
    const savedTab = localStorage.getItem('settings_active_tab');
    // If the saved tab was 'notifications', switch to 'appearance' since they're now combined
    if (savedTab === 'notifications') return 'appearance';
    // Check if the saved tab is a valid tab option
    return (savedTab as SettingsTabs) || 'appearance';
  });

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

  // State for the sync result modal
  const [showSyncResultModal, setShowSyncResultModal] = useState(false);
  const [currentSyncResult, setCurrentSyncResult] = useState<SyncResult | null>(null);

  // Check for OAuth callback and verify current status
  useEffect(() => {
    console.log("[SettingsPage Effect] Running. Location search:", location.search);

    const params = new URLSearchParams(location.search);
    const integrationStatus = params.get('integration_status');
    console.log("[SettingsPage Effect] Integration status param:", integrationStatus);

    if (integrationStatus === 'ticktick_success') {
      console.log("[SettingsPage Effect] TickTick success detected! Setting connected state.");
      setIsTickTickConnectedUI(true);
      localStorage.setItem('ticktick_connected', 'true');
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
          localStorage.setItem('ticktick_connected', String(status.isConnected));
        } catch (error) {
          console.error("[SettingsPage] Error checking TickTick status:", error);
          // Don't change the state on error - keep whatever was in localStorage
        }
      };

      checkStatus();
    }
  }, [location, navigate]);

  const handleSaveAISettings = async (settings: AISettings) => {
    try {
      console.log("Saving AI Settings:", settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (settings.openaiApiKey) {
        localStorage.setItem('openai_api_key', settings.openaiApiKey);
      }
      if (settings.contentSuggestions) {
        localStorage.setItem('content_suggestions_provider', settings.contentSuggestions.provider);
        localStorage.setItem('content_suggestions_model', settings.contentSuggestions.modelId);
        localStorage.setItem('content_suggestions_temperature', String(settings.contentSuggestions.temperature));
        localStorage.setItem('content_suggestions_max_tokens', String(settings.contentSuggestions.maxTokens));
        if (settings.contentSuggestions.systemMessage) {
          localStorage.setItem('content_suggestions_system_message', settings.contentSuggestions.systemMessage);
        } else {
          localStorage.removeItem('content_suggestions_system_message');
        }
      }
      if (settings.promptEnhancement) {
        localStorage.setItem('prompt_enhancement_provider', settings.promptEnhancement.provider);
        localStorage.setItem('prompt_enhancement_model', settings.promptEnhancement.modelId);
        localStorage.setItem('prompt_enhancement_temperature', String(settings.promptEnhancement.temperature));
        localStorage.setItem('prompt_enhancement_max_tokens', String(settings.promptEnhancement.maxTokens));
        if (settings.promptEnhancement.systemMessage) {
          localStorage.setItem('prompt_enhancement_system_message', settings.promptEnhancement.systemMessage);
        } else {
          localStorage.removeItem('prompt_enhancement_system_message');
        }
      }
      console.log("AI Settings potentially saved to localStorage");
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      throw error; // Re-throw error to be caught by AISettingsSection
    }
  };

  const handleConnectTickTick = () => {
    const clientId = import.meta.env.VITE_TICKTICK_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_TICKTICK_REDIRECT_URI;
    const scope = 'tasks:read tasks:write';
    const state = generateState();

    if (!clientId || !redirectUri) {
      console.error("TickTick client ID or redirect URI missing in environment variables.");
      alert("TickTick integration is not configured correctly. Please contact support.");
      return;
    }

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
        localStorage.setItem('ticktick_connected', 'false');
        localStorage.removeItem('ticktick_sync_frequency');
        localStorage.removeItem('ticktick_conflict_resolution');
        localStorage.removeItem('ticktick_sync_tags');
        localStorage.removeItem('ticktick_last_synced');
        alert("TickTick disconnected.");
      } else {
        throw new Error("Disconnect operation failed from server.");
      }
    } catch (error: unknown) {
      console.error("Error disconnecting TickTick:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not disconnect TickTick.";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleSyncComplete = useCallback((result: SyncResult) => {
    setCurrentSyncResult(result);
    setShowSyncResultModal(true);
    console.log("[handleSyncComplete] Sync Success. Setting modal state:", result);
  }, []);

  const handleSyncError = useCallback((error: Error) => {
    setCurrentSyncResult({
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 1,
      message: error.message || "An unknown sync error occurred.",
      lastSynced: localStorage.getItem('ticktick_last_synced') || new Date().toISOString()
    });
    setShowSyncResultModal(true);
    console.log("[handleSyncError] Sync Error. Setting modal state with error:", error.message);
  }, []);

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

  // Modify the tabContent definition to wrap each component with Suspense
  const tabContent = {
    appearance: (
      <Suspense fallback={<div className="p-4 text-center">Loading preferences...</div>}>
        <PreferencesSection />
      </Suspense>
    ),
    security: (
      <Suspense fallback={<div className="p-4 text-center">Loading security settings...</div>}>
        <SecuritySettingsSection />
      </Suspense>
    ),
    aiconfig: (
      <Suspense fallback={<div className="p-4 text-center">Loading AI settings...</div>}>
        <AISettingsSection onSave={handleSaveAISettings} />
      </Suspense>
    ),
    dataManagement: (
      <Suspense fallback={<div className="p-4 text-center">Loading data management settings...</div>}>
        <DataManagementSettingsSection />
      </Suspense>
    ),
    account: (
      <Suspense fallback={<div className="p-4 text-center">Loading account settings...</div>}>
        <AccountSettingsSection />
      </Suspense>
    ),
    integrations: (
      <Suspense fallback={<div className="p-4 text-center">Loading integrations settings...</div>}>
        <IntegrationsSettingsSection
          isTickTickConnectedUI={isTickTickConnectedUI}
          handleConnectTickTick={handleConnectTickTick}
          handleDisconnectTickTick={handleDisconnectTickTick}
          syncWithTickTick={syncWithTickTick}
          getSyncStatus={getSyncStatus}
          resetSyncData={resetSyncData}
          isSyncing={isSyncing}
          tasksSyncError={tasksSyncError}
          tickTickProjectId={tickTickProjectId}
          tickTickNotesProjectId={tickTickNotesProjectId}
          onSyncComplete={handleSyncComplete}
          onSyncError={handleSyncError}
          updateTickTickProjectId={updateTickTickProjectId}
          updateTickTickNotesProjectId={updateTickTickNotesProjectId}
          getNoteSyncStatus={getNoteSyncStatus}
        />
      </Suspense>
    ),
  };

  // Log the state value just before rendering
  console.log('[SettingsPage Render] isTickTickConnectedUI:', isTickTickConnectedUI, 'Context:', isTickTickConnected, 'Notes Connected:', notesTickTickConnected);

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
                Preferences
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
      {showSyncResultModal && currentSyncResult && (
        <Suspense fallback={<div>Loading...</div>}>
          <SyncResultModal
            isOpen={showSyncResultModal}
            onClose={() => setShowSyncResultModal(false)}
            result={currentSyncResult}
            key={currentSyncResult ? `sync-result-${currentSyncResult.lastSynced}` : 'sync-result-modal'}
          />
        </Suspense>
      )}
    </div>
  );
}