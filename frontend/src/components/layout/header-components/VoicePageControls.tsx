/**
 * Voice Page Header Controls
 * Renders voice controls (sidebar controls, voice type, model selector, voice dropdown, agent) in the main header
 */

import { memo, useMemo, ReactNode } from 'react';
import { CombinedModelSelector } from '../../composite/model-selector';
import { SelectorSkeleton } from '../../ui/SelectorSkeleton';
import { FeatureModePill } from '../../ui/FeatureModePill';
import { featureColors, FeatureIcons } from '../../ui/feature-mode-constants';
import { useVoiceHeaderState } from '../../../features/voice/context/VoicePageContext';
import { VoiceTypePill } from '../../../features/voice/components/VoiceTypePill';
import { VoiceDropdown } from '../../../features/voice/components/VoiceDropdown';
import { VoiceAgentSettingsPopover } from '../../../features/voice/components/VoiceAgentSettingsPopover';
import { useBoundStore } from '../../../store/bound-store';

/**
 * Voice page controls for the main header
 * Reads state from VoicePageContext (populated by VoiceAgentPage)
 */
export const VoicePageControls = memo(function VoicePageControls() {
  const headerState = useVoiceHeaderState();
  const voiceSidebarVisible = useBoundStore((state) => state.voiceSidebarVisible);
  const toggleVoiceSidebar = useBoundStore((state) => state.toggleVoiceSidebar);
  const grokVoiceAvailable = useBoundStore((state) => state.grokVoiceAvailable);
  const deepgramAvailable = useBoundStore((state) => state.deepgramAvailable);
  const elevenLabsAvailable = useBoundStore((state) => state.elevenLabsAvailable);
  const standardVoiceAvailable = deepgramAvailable && elevenLabsAvailable;

  // Extract values for memoization
  const agentEnabled = headerState?.agentEnabled;
  const agentCapabilitiesFromHeader = headerState?.agentCapabilities;
  const voiceProviderTypeFromHeader = headerState?.voiceProviderType;
  const isSelectionMode = headerState?.isSelectionMode ?? false;
  const selectedSessionIds = headerState?.selectedSessionIds ?? new Set<string>();
  const sessionCount = headerState?.sessionCount ?? 0;

  // Get Grok search settings from header
  const enableGrokWebSearchFromHeader = headerState?.enableGrokWebSearch;
  const enableGrokXSearchFromHeader = headerState?.enableGrokXSearch;

  // Get RAG settings from header
  const voiceRagEnabledFromHeader = headerState?.voiceRagEnabled ?? true;
  const onVoiceRagChangeFromHeader = headerState?.onVoiceRagChange;

  // Build badge items for agent pill (all white to match chat)
  const agentBadgeItems = useMemo(() => {
    if (!agentEnabled) return [];

    const items: { icon: ReactNode; color: string }[] = [];
    const capabilities = agentCapabilitiesFromHeader ?? [];
    const isGrokMode = voiceProviderTypeFromHeader === 'GrokVoice';
    const whiteColor = 'var(--btn-primary-text)';

    // Map capabilities to icons
    capabilities.forEach((cap) => {
      if (cap.enabled) {
        if (cap.id === 'notes-crud' || cap.id.includes('notes')) {
          items.push({
            icon: <FeatureIcons.NotesAnalysis />,
            color: whiteColor,
          });
        } else if (cap.id === 'notes-search' || cap.id.includes('search')) {
          items.push({
            icon: <FeatureIcons.RAG />,
            color: whiteColor,
          });
        } else if (!isGrokMode && cap.id === 'web') {
          items.push({
            icon: <FeatureIcons.Web />,
            color: whiteColor,
          });
        }
      }
    });

    // Add Grok search icons when in Grok mode
    if (isGrokMode) {
      if (enableGrokWebSearchFromHeader) {
        items.push({
          icon: <FeatureIcons.Web />,
          color: whiteColor,
        });
      }
      if (enableGrokXSearchFromHeader) {
        items.push({
          icon: (
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ),
          color: whiteColor,
        });
      }
    }

    return items;
  }, [agentEnabled, agentCapabilitiesFromHeader, voiceProviderTypeFromHeader, enableGrokWebSearchFromHeader, enableGrokXSearchFromHeader]);

  // Check if all selectable sessions are selected
  const isAllSelected = selectedSessionIds.size === sessionCount && sessionCount > 0;

  // If no header state (VoiceAgentPage not mounted), show nothing
  if (!headerState) {
    return null;
  }

  const {
    isHealthLoading,
    availableProviders,
    selectedProvider,
    selectedModel,
    onProviderChange,
    onModelChange,
    onRefreshProviders,
    isRefreshing = false,
    voiceProviderType,
    onVoiceProviderTypeChange,
    selectedVoiceId,
    availableVoices,
    onVoiceChange,
    selectedGrokVoice,
    availableGrokVoices,
    onGrokVoiceChange,
    onAgentModeChange,
    agentCapabilities,
    enableGrokWebSearch,
    enableGrokXSearch,
    onGrokWebSearchChange,
    onGrokXSearchChange,
    isConnected,
    isConnecting,
    sessionState,
    onNewSession,
    onToggleSelectionMode,
    onSelectAllSessions,
    onBulkDeleteSessions,
    onExitSelectionMode,
    // Session stats
    transcriptCount = 0,
    // History viewing
    isViewingHistory = false,
    onBackToCurrent,
  } = headerState;

  const isGrokMode = voiceProviderType === 'GrokVoice';
  const isSessionActive = isConnected && sessionState !== 'Idle' && sessionState !== 'Ended';
  const capabilities = agentCapabilities.map((c) => c.id);

  // Session status indicator
  const getSessionStatus = () => {
    if (isConnecting) {
      return { text: 'Connecting...', color: 'var(--color-amber-500)' };
    }
    if (isConnected) {
      switch (sessionState) {
        case 'Listening':
          return { text: 'Listening', color: 'var(--color-green-500)' };
        case 'Processing':
          return { text: 'Processing', color: 'var(--color-blue-500)' };
        case 'Speaking':
          return { text: 'Speaking', color: 'var(--color-purple-500)' };
        case 'Interrupted':
          return { text: 'Interrupted', color: 'var(--color-amber-500)' };
        default:
          return { text: 'Ready', color: 'var(--color-green-500)' };
      }
    }
    return { text: 'Disconnected', color: 'var(--text-tertiary)' };
  };

  const status = getSessionStatus();

  // Fixed width left section to align separator with sidebar border position
  // Voice sidebar is w-72 (18rem) on mobile, md:w-[23rem] on desktop
  // Match ChatPageControls exactly
  const leftSectionWidth = 'w-[18rem] md:w-[13.8rem] justify-end';

  // Handle capability toggle
  const handleCapabilityToggle = (capability: string) => {
    const cap = agentCapabilities.find((c) => c.id === capability);
    if (cap) {
      cap.onChange(!cap.enabled);
    }
  };

  // Render selection mode controls
  if (isSelectionMode) {
    return (
      <div className="flex items-center gap-3 flex-1 -ml-4">
        {/* Selection Mode Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Select All button */}
          <button
            onClick={onSelectAllSessions}
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: isAllSelected ? 'var(--btn-primary-text)' : 'var(--text-primary)',
              backgroundColor: isAllSelected
                ? 'var(--btn-primary-bg)'
                : 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
            title={isAllSelected ? 'Deselect all' : 'Select all'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isAllSelected ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
          </button>

          {/* Selection count badge */}
          <span
            className="inline-flex items-center justify-center px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-300)',
              border: '1px solid color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              minWidth: '80px',
            }}
          >
            {selectedSessionIds.size} selected
          </span>

          {/* Delete button */}
          <button
            onClick={() => { void onBulkDeleteSessions(); }}
            disabled={selectedSessionIds.size === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
            style={{
              background: selectedSessionIds.size > 0
                ? 'linear-gradient(135deg, var(--color-error), var(--color-error-dark, rgb(185, 28, 28)))'
                : 'var(--surface-elevated)',
              color: selectedSessionIds.size > 0 ? 'white' : 'var(--text-tertiary)',
              boxShadow: selectedSessionIds.size > 0 ? '0 4px 12px -2px color-mix(in srgb, var(--color-error) 40%, transparent)' : 'none',
              border: selectedSessionIds.size > 0 ? 'none' : '1px solid var(--border)',
              opacity: selectedSessionIds.size === 0 ? 0.6 : 1,
              cursor: selectedSessionIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete ({selectedSessionIds.size})
          </button>

          {/* Cancel button */}
          <button
            onClick={onExitSelectionMode}
            className="flex items-center justify-center px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Left side controls - fixed width to align separator with sidebar border position */}
      <div className={`flex items-center gap-3 flex-shrink-0 ${leftSectionWidth}`}>
        {/* Sidebar Toggle */}
        <button
          onClick={toggleVoiceSidebar}
          className="p-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: voiceSidebarVisible ? 'var(--btn-primary-bg)' : 'var(--surface-elevated)',
            color: voiceSidebarVisible ? 'var(--btn-primary-text)' : 'var(--text-primary)',
            border: `1px solid ${voiceSidebarVisible ? 'var(--btn-primary-border)' : 'var(--border)'}`,
            boxShadow: voiceSidebarVisible ? '0 4px 12px -2px rgba(54, 105, 61, 0.3)' : 'none',
          }}
          title={voiceSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {voiceSidebarVisible ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>

        {/* Selection Mode Toggle - Only show when there are sessions */}
        {sessionCount > 0 && (
          <button
            onClick={onToggleSelectionMode}
            className="p-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Select sessions"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="p-2.5 my-1 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: '1px solid var(--btn-primary-border)',
            boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
          }}
          title="New Voice Session"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div
        className="h-6 w-px flex-shrink-0"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* Middle controls */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Voice Type Toggle */}
        <VoiceTypePill
          voiceProviderType={voiceProviderType}
          onVoiceProviderTypeChange={onVoiceProviderTypeChange}
          grokVoiceAvailable={grokVoiceAvailable}
          standardVoiceAvailable={standardVoiceAvailable}
          disabled={isSessionActive}
        />

        {/* Model Selector - Only show in Standard mode */}
        {!isGrokMode && (
          <div className="flex-shrink-0">
            {isHealthLoading && availableProviders.length === 0 ? (
              <SelectorSkeleton text="Loading providers..." />
            ) : (
              <CombinedModelSelector
                providers={availableProviders}
                selectedProvider={selectedProvider || ''}
                selectedModel={selectedModel || ''}
                onProviderChange={onProviderChange}
                onModelChange={onModelChange}
                disabled={availableProviders.length === 0 || isSessionActive}
                onRefresh={onRefreshProviders}
                isRefreshing={isRefreshing}
              />
            )}
          </div>
        )}

        {/* Separator */}
        <div
          className="h-6 w-px flex-shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Voice Dropdown */}
        <VoiceDropdown
          voiceProviderType={voiceProviderType}
          selectedVoiceId={selectedVoiceId}
          availableVoices={availableVoices}
          onVoiceChange={onVoiceChange}
          selectedGrokVoice={selectedGrokVoice}
          availableGrokVoices={availableGrokVoices}
          onGrokVoiceChange={onGrokVoiceChange}
          disabled={isSessionActive}
        />

        {/* Agent Mode Pill */}
        <FeatureModePill
          featureId="voice-agent"
          label="Agent"
          icon={<FeatureIcons.Agent />}
          isActive={agentEnabled ?? false}
          disabled={isSessionActive}
          activeColor={featureColors.agent}
          popoverTitle={isGrokMode ? 'App Functions' : 'Agent Settings'}
          popoverWidth="280px"
          badgeItems={agentEnabled && agentBadgeItems.length > 0 ? agentBadgeItems : undefined}
          popoverContent={
            <VoiceAgentSettingsPopover
              voiceProviderType={voiceProviderType}
              agentEnabled={agentEnabled ?? false}
              onAgentModeChange={onAgentModeChange}
              capabilities={capabilities}
              onCapabilityToggle={handleCapabilityToggle}
              voiceRagEnabled={voiceRagEnabledFromHeader}
              onVoiceRagChange={onVoiceRagChangeFromHeader}
              enableGrokWebSearch={enableGrokWebSearch ?? false}
              enableGrokXSearch={enableGrokXSearch ?? false}
              onGrokWebSearchChange={onGrokWebSearchChange}
              onGrokXSearchChange={onGrokXSearchChange}
              disabled={isSessionActive}
            />
          }
        />

      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right side: History Indicator, Token Stats, Session Status */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Viewing Past Session Indicator */}
        {isViewingHistory && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)',
              color: 'var(--color-amber-500)',
              border: '1px solid color-mix(in srgb, var(--color-amber-500) 30%, transparent)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Viewing past session</span>
            <button
              onClick={onBackToCurrent}
              className="ml-1 hover:opacity-80 transition-opacity"
              title="Back to current"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Message count - Only show when there are messages and not viewing history */}
        {!isViewingHistory && transcriptCount > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}
          >
            <span>{transcriptCount} msg{transcriptCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Session Status Indicator */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-medium"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: status.color,
            border: '1px solid var(--border)',
          }}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnecting || isSessionActive ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: status.color }}
          />
          <span>{status.text}</span>
        </div>
      </div>
    </div>
  );
});
