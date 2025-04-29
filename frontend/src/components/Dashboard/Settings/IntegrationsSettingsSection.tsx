import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { SyncResult } from '../../../services/api/integrations.service'; // Assuming type exists

interface IntegrationsSettingsSectionProps {
    isTickTickConnectedUI: boolean;
    handleConnectTickTick: () => void;
    handleDisconnectTickTick: () => Promise<void>;
    syncWithTickTick: (config: { resolutionStrategy: string; includeTags: boolean; projectId: string }) => Promise<SyncResult>;
    getSyncStatus: () => Promise<{ lastSynced: string | null; taskCount: { local: number; tickTick: number; mapped: number } }>;
    resetSyncData: () => Promise<void | boolean>;
    isSyncing: boolean;
    tasksSyncError: string | null;
    tickTickProjectId: string;
    onSyncComplete: (result: SyncResult) => void;
    onSyncError: (error: Error) => void;
}

export function IntegrationsSettingsSection({
    isTickTickConnectedUI,
    handleConnectTickTick,
    handleDisconnectTickTick,
    syncWithTickTick,
    getSyncStatus,
    resetSyncData,
    isSyncing,
    tasksSyncError,
    tickTickProjectId,
    onSyncComplete,
    onSyncError,
}: IntegrationsSettingsSectionProps) {
    const { theme } = useTheme();

    // State moved from SettingsPage
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

    // Use the sync error from context/props if available
    useEffect(() => {
        if (tasksSyncError) {
            setSyncError(tasksSyncError);
        } else {
            setSyncError(null); // Clear local error if context error is cleared
        }
    }, [tasksSyncError]);

    // Load sync settings from localStorage
    useEffect(() => {
        const storedFrequency = localStorage.getItem('ticktick_sync_frequency');
        if (storedFrequency) setSyncFrequency(storedFrequency);

        const storedResolution = localStorage.getItem('ticktick_conflict_resolution');
        if (storedResolution) setConflictResolution(storedResolution);

        const storedSyncTags = localStorage.getItem('ticktick_sync_tags');
        if (storedSyncTags !== null) setSyncTags(storedSyncTags === 'true');

        const storedLastSynced = localStorage.getItem('ticktick_last_synced');
        if (storedLastSynced) setLastSynced(storedLastSynced);
    }, []);

    // Save sync settings to localStorage when they change
    useEffect(() => {
        if (isTickTickConnectedUI) {
            localStorage.setItem('ticktick_sync_frequency', syncFrequency);
            localStorage.setItem('ticktick_conflict_resolution', conflictResolution);
            localStorage.setItem('ticktick_sync_tags', String(syncTags));
        }
    }, [isTickTickConnectedUI, syncFrequency, conflictResolution, syncTags]);

    // Load sync status from backend
    const loadSyncStatus = useCallback(async () => {
        if (!isTickTickConnectedUI) return;
        try {
            const status = await getSyncStatus();
            if (status.lastSynced) {
                setLastSynced(status.lastSynced);
                localStorage.setItem('ticktick_last_synced', status.lastSynced);
            }
            setSyncStats(status.taskCount);
        } catch (error) {
            console.error("Error loading sync status:", error);
            const storedLastSynced = localStorage.getItem('ticktick_last_synced');
            if (storedLastSynced) setLastSynced(storedLastSynced);
        }
    }, [isTickTickConnectedUI, getSyncStatus]);

    // Load sync status when component mounts or connection changes
    useEffect(() => {
        loadSyncStatus();
    }, [isTickTickConnectedUI, loadSyncStatus]);

    const formatLastSynced = () => {
        if (!lastSynced) return 'Never';
        try {
            const date = new Date(lastSynced);
            const now = new Date();
            if (date.toDateString() === now.toDateString()) {
                return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
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

    const handleSyncNow = async () => {
        if (isSyncing) return;
        setSyncError(null);
        try {
            console.log(`Starting sync (from TickTick) with resolutionStrategy: ${conflictResolution}, includeTags: ${syncTags}, projectId: ${tickTickProjectId}`);
            const result = await syncWithTickTick({
                resolutionStrategy: conflictResolution,
                includeTags: syncTags,
                projectId: tickTickProjectId
            });
            console.log("Sync completed successfully:", result);
            setLastSynced(result.lastSynced);
            localStorage.setItem('ticktick_last_synced', result.lastSynced);
            await loadSyncStatus(); // Refresh counts
            onSyncComplete(result);
        } catch (error) {
            console.error("Error syncing tasks:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to sync tasks. Please try again.";
            setSyncError(errorMessage);
            if (error instanceof Error) {
                onSyncError(error);
            } else {
                onSyncError(new Error(errorMessage));
            }
        }
    };

    const handleResetSync = async () => {
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
    };

    // --- Style Definitions (Copied from SettingsPage) --- 
    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

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
    w-14 h-7 bg-gray-400/50 dark:bg-gray-700/30 rounded-full peer 
    peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bottom-[2px]
    after:bg-white dark:after:bg-gray-200 after:rounded-full after:w-6 after:transition-all after:shadow-sm
    peer-checked:bg-[var(--color-accent)] peer-checked:border-[var(--color-accent)]
    border-[0.5px] border-white/10 transition-all duration-300 backdrop-blur-sm
    hover:bg-gray-500/50 dark:hover:border-gray-500/40
    peer-checked:hover:bg-[var(--color-accent)]/90 peer-checked:hover:border-[var(--color-accent)]/90
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
    // --- End Style Definitions --- 

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Integrations</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Connect Second Brain with other services.</p>

            <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
                <h4 className="font-medium text-[var(--color-text)] mb-4">Task Management</h4>

                <div className={`flex items-center justify-between p-4 ${innerElementClasses}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4CAF50]/10 backdrop-blur-sm">
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
                            className={secondaryButtonClasses}
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

                {isTickTickConnectedUI && (
                    <div className={`mt-4 p-4 ${innerElementClasses}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-[var(--color-text)]">Sync Configuration</h5>
                            {syncStats.mapped > 0 && (
                                <button
                                    onClick={handleResetSync}
                                    className={`text-xs px-2 py-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors`}
                                >
                                    Reset Sync
                                </button>
                            )}
                        </div>

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
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-[var(--color-textSecondary)]">Sync Frequency</label>
                                <select
                                    value={syncFrequency}
                                    onChange={(e) => setSyncFrequency(e.target.value)}
                                    className={`px-3 py-2 rounded-lg text-sm ${getContainerBackground()} border-[0.5px] border-white/10 text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}
                                >
                                    <option value="manual">Manual Sync Only</option>
                                    <option value="5">Every 5 minutes</option>
                                    <option value="15">Every 15 minutes</option>
                                    <option value="30">Every 30 minutes</option>
                                    <option value="60">Every hour</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-[var(--color-textSecondary)]">Conflict Resolution</label>
                                <select
                                    value={conflictResolution}
                                    onChange={(e) => setConflictResolution(e.target.value)}
                                    className={`px-3 py-2 rounded-lg text-sm ${getContainerBackground()} border-[0.5px] border-white/10 text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] transition-all duration-200`}
                                >
                                    <option value="newer">Use Newest Change</option>
                                    <option value="ticktick">Prefer TickTick</option>
                                    <option value="secondbrain">Prefer Second Brain</option>
                                    <option value="ask">Ask Me</option> {/* Note: 'ask' might require additional UI */}
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-[var(--color-textSecondary)]">Sync Tags</p>
                                    <p className="text-xs text-[var(--color-textSecondary)]">Keep tags in sync between platforms</p>
                                </div>
                                <div className="relative inline-flex">
                                    <input
                                        type="checkbox"
                                        checked={syncTags}
                                        onChange={() => setSyncTags(!syncTags)}
                                        className="sr-only peer"
                                    />
                                    <div className={toggleClasses}></div>
                                </div>
                            </div>

                            {syncError && (
                                <div className="mt-1 p-3 bg-red-500/10 rounded-lg flex items-center gap-2 text-red-500 dark:text-red-400">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <p className="text-xs">{syncError}</p>
                                </div>
                            )}

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
    );
} 