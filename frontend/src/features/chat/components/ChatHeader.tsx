import { ReactNode, useMemo } from 'react';
import { CombinedModelSelector } from '../../../components/composite/model-selector';
import { SelectorSkeleton } from '../../../components/ui/SelectorSkeleton';
import { FeatureModePill } from '../../../components/ui/FeatureModePill';
import { featureColors, FeatureIcons } from '../../../components/ui/feature-mode-constants';
import { AgentSettingsPopover } from '../../../components/ui/AgentSettingsPopover';
import { ContextUsageIndicator } from '../../../components/composite/context-usage';
import { ContextUsageState } from '../../../types/context-usage';

export interface ProviderInfo {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

export interface AgentCapability {
  id: string;
  displayName: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon: ReactNode;
  color: {
    enabledBg: string;
    enabledText: string;
    enabledBorder: string;
    enabledDot: string;
  };
}

export interface ChatHeaderProps {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  // Provider/Model selection
  isHealthLoading: boolean;
  availableProviders: ProviderInfo[];
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  /** Refresh providers by clearing cache and fetching fresh data */
  onRefreshProviders?: () => Promise<void>;
  /** Whether providers are currently being refreshed */
  isRefreshing?: boolean;
  // RAG settings (onRagToggle routes to handleRagToggle or setAgentRagEnabled based on agent mode)
  ragEnabled: boolean;
  onRagToggle: (enabled: boolean) => void;
  // Note: Vector store props kept for compatibility but no longer displayed on RAG button
  selectedVectorStore: 'PostgreSQL' | 'Pinecone';
  onVectorStoreChange: (provider: 'PostgreSQL' | 'Pinecone') => void;
  // Agent settings
  agentModeEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  agentRagEnabled: boolean;
  agentCapabilities: AgentCapability[];
  // Loading state
  isLoading: boolean;
  // Image generation mode (derived from selected model)
  isImageGenerationMode?: boolean;
  // Context usage
  contextUsage: ContextUsageState;
  isStreaming?: boolean;
}

/**
 * Chat header with unified model selector, feature mode pills, and context indicator.
 * Redesigned for cleaner UX with popovers for feature settings.
 */
export function ChatHeader({
  showSidebar,
  onToggleSidebar,
  isHealthLoading,
  availableProviders,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onRefreshProviders,
  isRefreshing = false,
  ragEnabled,
  onRagToggle,
  agentModeEnabled,
  onAgentModeChange,
  agentRagEnabled,
  agentCapabilities,
  isLoading,
  isImageGenerationMode = false,
  contextUsage,
  isStreaming = false,
}: ChatHeaderProps) {
  // Transform agent capabilities for the popover (add descriptions)
  const popoverCapabilities = useMemo(() =>
    agentCapabilities.map(cap => ({
      ...cap,
      description: cap.id === 'notes' ? 'Create, update, delete notes' : undefined,
    })),
    [agentCapabilities]
  );

  // Build badge items with icons and colors for enabled features (Agent)
  // Note: Auto Context (agentRagEnabled) is now controlled via the RAG button, not shown here
  const agentBadgeItems = useMemo(() => {
    const items: { icon: ReactNode; color: string }[] = [];

    // Add enabled capabilities icons
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
  // When agent mode is ON: RAG button controls notes capability (SearchNotes tool access)
  // When agent mode is OFF: RAG button controls ragEnabled (traditional RAG context injection)
  const isRagActive = agentModeEnabled ? agentRagEnabled : ragEnabled;

  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 pt-4.5 pb-4.5 border-b z-10"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
        paddingLeft: '2rem',
        paddingRight: '2rem',
      }}
    >
      {/* Left side: Sidebar Toggle, Model Selector, Feature Pills */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Sidebar Toggle - Only show when sidebar is closed */}
        {!showSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Show sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

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
          {/* RAG Mode Pill - Direct toggle for RAG/Auto-Context */}
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

          {/* Image Mode Pill - Indicator only, active when image gen model is selected */}
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
}
