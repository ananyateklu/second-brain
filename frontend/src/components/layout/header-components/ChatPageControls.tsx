/**
 * Chat Page Header Controls
 * Renders chat controls (sidebar controls, model selector, feature pills, context indicator) in the main header
 */

import { useMemo, memo } from 'react';
import { CombinedModelSelector } from '../../composite/model-selector';
import { SelectorSkeleton } from '../../ui/SelectorSkeleton';
import { FeatureModePill } from '../../ui/FeatureModePill';
import { featureColors, FeatureIcons } from '../../ui/feature-mode-constants';
import { AgentSettingsPopover } from '../../ui/AgentSettingsPopover';
import { ContextUsageIndicator } from '../../composite/context-usage';
import { useChatHeaderState } from '../../../features/chat/context/ChatPageContext';
import { useBoundStore } from '../../../store/bound-store';

/**
 * Chat page controls for the main header
 * Reads state from ChatPageContext (populated by ChatPage)
 */
export const ChatPageControls = memo(function ChatPageControls() {
  const headerState = useChatHeaderState();
  const chatSidebarVisible = useBoundStore((state) => state.chatSidebarVisible);
  const toggleChatSidebar = useBoundStore((state) => state.toggleChatSidebar);

  // Extract values with defaults for hooks (hooks must be called unconditionally)
  const agentCapabilitiesRaw = headerState?.agentCapabilities;
  const agentModeEnabled = headerState?.agentModeEnabled ?? false;
  const agentRagEnabled = headerState?.agentRagEnabled ?? false;
  const ragEnabled = headerState?.ragEnabled ?? false;
  const isSelectionMode = headerState?.isSelectionMode ?? false;
  const selectedConversationIds = headerState?.selectedConversationIds ?? new Set<string>();
  const conversationCount = headerState?.conversationCount ?? 0;

  // Memoize agentCapabilities to maintain stable reference
  const agentCapabilities = useMemo(() =>
    agentCapabilitiesRaw ?? [],
    [agentCapabilitiesRaw]
  );

  // Transform agent capabilities for the popover (add descriptions)
  const popoverCapabilities = useMemo(() =>
    agentCapabilities.map(cap => ({
      ...cap,
      description: cap.id === 'notes' ? 'Create, update, delete notes' : undefined,
    })),
    [agentCapabilities]
  );

  // Build badge items with icons and colors for enabled features (Agent)
  const agentBadgeItems = useMemo(() => {
    const items: { icon: React.ReactNode; color: string }[] = [];
    agentCapabilities
      .filter(cap => cap.enabled)
      .forEach(cap => {
        items.push({
          icon: cap.icon,
          color: cap.color.enabledText,
        });
      });
    return items;
  }, [agentCapabilities]);

  // Determine RAG active state based on mode
  const isRagActive = agentModeEnabled ? agentRagEnabled : ragEnabled;

  // Check if all selectable conversations are selected
  const isAllSelected = selectedConversationIds.size === conversationCount && conversationCount > 0;

  // If no header state (ChatPage not mounted), show nothing
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
    onRagToggle,
    onAgentModeChange,
    isLoading,
    isImageGenerationMode,
    contextUsage,
    isStreaming,
    onNewChat,
    onToggleSelectionMode,
    onSelectAll,
    onBulkDelete,
    onExitSelectionMode,
  } = headerState;

  // Fixed width left section to align separator with sidebar border position
  // Sidebar width is w-72 (18rem) on mobile, md:w-[23rem] on desktop
  const leftSectionWidth = 'w-[18rem] md:w-[18rem] justify-end';

  // Render selection mode controls
  if (isSelectionMode) {
    return (
      <div className="flex items-center gap-3 flex-1 -ml-4">
        {/* Selection Mode Header - -ml-2 counteracts header px-6 to align with sidebar px-4 checkboxes */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Select All button */}
          <button
            onClick={onSelectAll}
            className="flex items-center justify-center gap-1.5 text-xs font-medium h-8 px-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: isAllSelected ? 'var(--btn-primary-text)' : 'var(--text-primary)',
              backgroundColor: isAllSelected
                ? 'var(--btn-primary-bg)'
                : 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
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
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-300)',
              border: '1px solid color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              minWidth: '80px',
            }}
          >
            {selectedConversationIds.size} selected
          </span>

          {/* Delete button */}
          <button
            onClick={() => { void onBulkDelete(); }}
            disabled={selectedConversationIds.size === 0}
            className="flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
            style={{
              background: selectedConversationIds.size > 0
                ? 'linear-gradient(135deg, var(--color-error), var(--color-error-dark, rgb(185, 28, 28)))'
                : 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
              color: selectedConversationIds.size > 0 ? 'white' : 'var(--text-tertiary)',
              boxShadow: selectedConversationIds.size > 0 ? '0 4px 12px -2px color-mix(in srgb, var(--color-error) 40%, transparent)' : 'none',
              border: selectedConversationIds.size > 0 ? 'none' : '1px solid var(--border)',
              opacity: selectedConversationIds.size === 0 ? 0.6 : 1,
              cursor: selectedConversationIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete ({selectedConversationIds.size})
          </button>

          {/* Cancel button */}
          <button
            onClick={onExitSelectionMode}
            className="flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
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
        {/* Sidebar Toggle - Show/Hide sidebar */}
        <button
          onClick={toggleChatSidebar}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: chatSidebarVisible ? 'var(--color-primary-alpha)' : 'var(--surface-elevated)',
            color: chatSidebarVisible ? 'var(--color-primary)' : 'var(--text-primary)',
            border: `1px solid ${chatSidebarVisible ? 'var(--color-primary)' : 'var(--border)'}`,
          }}
          title={chatSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {chatSidebarVisible ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>

        {/* Selection Mode Toggle - Only show when there are conversations */}
        {conversationCount > 0 && (
          <button
            onClick={onToggleSelectionMode}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Select conversations"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: '1px solid var(--btn-primary-border)',
            boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
          }}
          title="New Chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Separator - aligned with sidebar border */}
      <div
        className="h-6 w-px flex-shrink-0"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* Middle controls - Model selector and feature pills */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Combined Model Selector */}
        <div className="flex-shrink-0">
          {isHealthLoading && availableProviders.length === 0 ? (
            <SelectorSkeleton text="Loading providers..." />
          ) : (
            <CombinedModelSelector
              providers={availableProviders}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={onProviderChange}
              onModelChange={onModelChange}
              disabled={isLoading || availableProviders.length === 0}
              onRefresh={onRefreshProviders}
              isRefreshing={isRefreshing}
            />
          )}
        </div>

        {/* Separator */}
        <div
          className="h-6 w-px flex-shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Feature Mode Pills */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* RAG Mode Pill */}
          <FeatureModePill
            featureId="rag"
            label="RAG"
            icon={<FeatureIcons.RAG />}
            isActive={isRagActive}
            disabled={isLoading || isImageGenerationMode}
            activeColor={featureColors.rag}
            onClick={() => { onRagToggle(!isRagActive); }}
          />

          {/* Agent Mode Pill */}
          <FeatureModePill
            featureId="agent"
            label="Agent"
            icon={<FeatureIcons.Agent />}
            isActive={agentModeEnabled}
            disabled={isLoading || isImageGenerationMode}
            activeColor={featureColors.agent}
            popoverTitle="Agent Settings"
            popoverWidth="280px"
            badgeItems={agentModeEnabled && agentBadgeItems.length > 0 ? agentBadgeItems : undefined}
            popoverContent={
              <AgentSettingsPopover
                agentEnabled={agentModeEnabled}
                onAgentToggle={onAgentModeChange}
                capabilities={popoverCapabilities}
                disabled={isLoading}
              />
            }
          />

          {/* Image Mode Pill - Indicator only */}
          {isImageGenerationMode && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: featureColors.image.bg,
                color: featureColors.image.text,
                border: `1px solid ${featureColors.image.border}`,
                boxShadow: `0 0 12px -4px ${featureColors.image.border}`,
              }}
            >
              <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                <FeatureIcons.Image />
              </span>
              <span>Image</span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: featureColors.image.dot }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right side: Context Usage Indicator */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <ContextUsageIndicator
          contextUsage={contextUsage}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
});
