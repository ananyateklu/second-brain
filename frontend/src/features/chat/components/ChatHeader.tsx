import { ReactNode, useMemo } from 'react';
import { CombinedModelSelector } from '../../../components/ui/CombinedModelSelector';
import { SelectorSkeleton } from '../../../components/ui/SelectorSkeleton';
import { FeatureModePill, featureColors, FeatureIcons } from '../../../components/ui/FeatureModePill';
import { RagSettingsPopover } from '../../../components/ui/RagSettingsPopover';
import { AgentSettingsPopover } from '../../../components/ui/AgentSettingsPopover';
import { ContextUsageIndicator } from '../../../components/ui/ContextUsageIndicator';
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
  // RAG settings
  ragEnabled: boolean;
  onRagToggle: (enabled: boolean) => void;
  selectedVectorStore: 'PostgreSQL' | 'Pinecone';
  onVectorStoreChange: (provider: 'PostgreSQL' | 'Pinecone') => void;
  // Agent settings
  agentModeEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  agentRagEnabled: boolean;
  onAgentRagChange: (enabled: boolean) => void;
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
  ragEnabled,
  onRagToggle,
  selectedVectorStore,
  onVectorStoreChange,
  agentModeEnabled,
  onAgentModeChange,
  agentRagEnabled,
  onAgentRagChange,
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
  const agentBadgeItems = useMemo(() => {
    const items: Array<{ icon: ReactNode; color: string }> = [];

    // Add Auto Context icon if enabled
    if (agentRagEnabled) {
      items.push({
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        ),
        color: 'var(--color-accent-blue)',
      });
    }

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
  }, [agentCapabilities, agentRagEnabled]);

  // Build badge items for RAG (vector store indicator)
  const ragBadgeItems = useMemo(() => {
    if (!ragEnabled) return undefined;

    const items: Array<{ icon: ReactNode; color: string }> = [];

    // Add vector store icon
    if (selectedVectorStore === 'PostgreSQL') {
      items.push({
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        ),
        color: 'var(--color-accent-blue)',
      });
    } else if (selectedVectorStore === 'Pinecone') {
      items.push({
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
            />
          </svg>
        ),
        color: 'var(--color-accent-blue)',
      });
    }

    return items.length > 0 ? items : undefined;
  }, [ragEnabled, selectedVectorStore]);

  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 px-4 pt-4.5 pb-4.5 border-b z-10"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
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
        {isHealthLoading ? (
          <SelectorSkeleton text="Loading..." />
        ) : (
          <CombinedModelSelector
            providers={availableProviders}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            disabled={isLoading || availableProviders.length === 0}
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
          isActive={ragEnabled && !agentModeEnabled}
          disabled={isLoading || agentModeEnabled || isImageGenerationMode}
          activeColor={featureColors.rag}
          popoverTitle="RAG Settings"
          popoverWidth="280px"
          badgeItems={ragBadgeItems}
          popoverContent={
            <RagSettingsPopover
              ragEnabled={ragEnabled}
              onRagToggle={onRagToggle}
              selectedVectorStore={selectedVectorStore}
              onVectorStoreChange={onVectorStoreChange}
              disabled={isLoading}
            />
          }
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
              agentRagEnabled={agentRagEnabled}
              onAgentRagToggle={onAgentRagChange}
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

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Context Usage Indicator */}
      <div className="flex-shrink-0">
        <ContextUsageIndicator
          contextUsage={contextUsage}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
