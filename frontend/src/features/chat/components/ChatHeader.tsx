import { ReactNode } from 'react';
import { ProviderSelector } from '../../../components/ui/ProviderSelector';
import { ModelSelector } from '../../../components/ui/ModelSelector';
import { SelectorSkeleton } from '../../../components/ui/SelectorSkeleton';
import { RagToggle } from '../../../components/ui/RagToggle';
import { VectorStoreSelector } from '../../../components/ui/VectorStoreSelector';
import { AgentControlsGroup } from '../../../components/ui/AgentControlsGroup';

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
  onNewChat: () => void;
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
  agentCapabilities: AgentCapability[];
  // Loading state
  isLoading: boolean;
}

/**
 * Chat header with provider/model selectors, RAG toggle, and agent controls.
 */
export function ChatHeader({
  showSidebar,
  onToggleSidebar,
  onNewChat,
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
  agentCapabilities,
  isLoading,
}: ChatHeaderProps) {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b z-10"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      {/* Sidebar Toggle - Only show at start when sidebar is closed */}
      {!showSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          title="Show sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Provider Selector */}
      <div className="flex-shrink-0">
        {isHealthLoading ? (
          <SelectorSkeleton text="Loading provider..." />
        ) : (
          <ProviderSelector
            providers={availableProviders}
            selectedProvider={selectedProvider}
            onProviderChange={onProviderChange}
            disabled={isLoading || availableProviders.length === 0}
          />
        )}
      </div>

      {/* Model Selector */}
      <div className="flex-shrink-0">
        {isHealthLoading ? (
          <SelectorSkeleton text="Loading model..." />
        ) : (
          <ModelSelector
            providers={availableProviders}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={isLoading || availableProviders.length === 0}
          />
        )}
      </div>

      {/* RAG Toggle */}
      <div className="flex-shrink-0">
        <RagToggle enabled={ragEnabled} onChange={onRagToggle} disabled={isLoading || agentModeEnabled} />
      </div>

      {/* Vector Store Selector - only show when RAG is enabled */}
      {ragEnabled && !agentModeEnabled && (
        <div className="flex-shrink-0">
          <VectorStoreSelector
            selectedProvider={selectedVectorStore}
            onChange={onVectorStoreChange}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Agent Controls Group */}
      <AgentControlsGroup
        agentEnabled={agentModeEnabled}
        onAgentChange={onAgentModeChange}
        capabilities={agentCapabilities}
        disabled={isLoading}
      />

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
        style={{
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: '1px solid var(--btn-primary-border)',
        }}
      >
        New Chat
      </button>
    </div>
  );
}

