/**
 * VoiceHeader Component
 * Header for the voice page with provider/model selector, voice type toggle,
 * voice dropdown, and agent settings.
 */

import { useMemo, ReactNode } from 'react';
import { CombinedModelSelector } from '../../../components/composite/model-selector';
import { SelectorSkeleton } from '../../../components/ui/SelectorSkeleton';
import { FeatureModePill } from '../../../components/ui/FeatureModePill';
import { featureColors, FeatureIcons } from '../../../components/ui/feature-mode-constants';
import { VoiceTypePill } from './VoiceTypePill';
import { VoiceDropdown } from './VoiceDropdown';
import { VoiceAgentSettingsPopover } from './VoiceAgentSettingsPopover';
import type {
  VoiceProviderType,
  VoiceInfo,
  GrokVoiceInfo,
  VoiceSessionState,
} from '../types/voice-types';

export interface VoiceProviderInfo {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

export interface VoiceHeaderProps {
  // Sidebar
  showSidebar: boolean;
  onToggleSidebar: () => void;

  // Provider/Model Selection (for Standard mode)
  isHealthLoading: boolean;
  availableProviders: VoiceProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRefreshProviders?: () => Promise<void>;
  isRefreshing?: boolean;

  // Voice Provider Type (Standard vs GrokVoice)
  voiceProviderType: VoiceProviderType;
  onVoiceProviderTypeChange: (type: VoiceProviderType) => void;
  grokVoiceAvailable: boolean;

  // Voice Selection
  selectedVoiceId: string | null;
  availableVoices: VoiceInfo[];
  onVoiceChange: (voiceId: string) => void;
  selectedGrokVoice: string;
  availableGrokVoices: GrokVoiceInfo[];
  onGrokVoiceChange: (voice: string) => void;

  // Agent mode
  agentEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  capabilities: string[];
  onCapabilityToggle: (capability: string) => void;

  // Grok search options
  enableGrokWebSearch: boolean;
  enableGrokXSearch: boolean;
  onGrokWebSearchChange: (enabled: boolean) => void;
  onGrokXSearchChange: (enabled: boolean) => void;

  // Session state
  isConnected: boolean;
  isConnecting: boolean;
  sessionState: VoiceSessionState;

  // Loading state
  isLoading?: boolean;
}

/**
 * Voice header with voice type toggle, model selector (Standard mode),
 * voice dropdown, agent settings, and session status.
 */
export function VoiceHeader({
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
  voiceProviderType,
  onVoiceProviderTypeChange,
  grokVoiceAvailable,
  selectedVoiceId,
  availableVoices,
  onVoiceChange,
  selectedGrokVoice,
  availableGrokVoices,
  onGrokVoiceChange,
  agentEnabled,
  onAgentModeChange,
  capabilities,
  onCapabilityToggle,
  enableGrokWebSearch,
  enableGrokXSearch,
  onGrokWebSearchChange,
  onGrokXSearchChange,
  isConnected,
  isConnecting,
  sessionState,
  isLoading = false,
}: VoiceHeaderProps) {
  const isGrokMode = voiceProviderType === 'GrokVoice';
  const isSessionActive = isConnected && sessionState !== 'Idle' && sessionState !== 'Ended';

  // Build badge items for agent pill
  const agentBadgeItems = useMemo(() => {
    if (!agentEnabled) return [];

    const items: { icon: ReactNode; color: string }[] = [];

    if (capabilities.includes('notes-crud')) {
      items.push({
        icon: <FeatureIcons.NotesAnalysis />,
        color: 'var(--color-amber-500)',
      });
    }

    if (capabilities.includes('notes-search')) {
      items.push({
        icon: <FeatureIcons.RAG />,
        color: 'var(--color-blue-500)',
      });
    }

    if (!isGrokMode && capabilities.includes('web')) {
      items.push({
        icon: <FeatureIcons.Web />,
        color: 'var(--color-accent-blue)',
      });
    }

    return items;
  }, [agentEnabled, capabilities, isGrokMode]);

  // Session status indicator
  const getSessionStatus = () => {
    if (isConnecting) {
      return { text: 'Connecting...', color: 'var(--color-warning)' };
    }
    if (isConnected) {
      switch (sessionState) {
        case 'Listening':
          return { text: 'Listening', color: 'var(--color-success)' };
        case 'Processing':
          return { text: 'Processing', color: 'var(--color-accent-blue)' };
        case 'Speaking':
          return { text: 'Speaking', color: 'var(--color-accent-purple)' };
        case 'Interrupted':
          return { text: 'Interrupted', color: 'var(--color-warning)' };
        default:
          return { text: 'Ready', color: 'var(--color-success)' };
      }
    }
    return { text: 'Disconnected', color: 'var(--text-tertiary)' };
  };

  const status = getSessionStatus();

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
      {/* Left side: Sidebar Toggle, Voice Type, Model Selector (Standard), Voice Dropdown, Agent */}
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

        {/* Voice Type Toggle */}
        <VoiceTypePill
          voiceProviderType={voiceProviderType}
          onVoiceProviderTypeChange={onVoiceProviderTypeChange}
          grokVoiceAvailable={grokVoiceAvailable}
          disabled={isLoading || isSessionActive}
        />

        {/* Model Selector - Only show in Standard mode */}
        {!isGrokMode && (
          <>
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
                  disabled={isLoading || availableProviders.length === 0 || isSessionActive}
                  onRefresh={onRefreshProviders}
                  isRefreshing={isRefreshing}
                />
              )}
            </div>
          </>
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
          disabled={isLoading || isSessionActive}
        />

        {/* Agent Mode Pill */}
        <FeatureModePill
          featureId="voice-agent"
          label="Agent"
          icon={<FeatureIcons.Agent />}
          isActive={agentEnabled}
          disabled={isLoading || isSessionActive}
          activeColor={featureColors.agent}
          popoverTitle={isGrokMode ? 'App Functions' : 'Agent Settings'}
          popoverWidth="280px"
          badgeItems={agentEnabled && agentBadgeItems.length > 0 ? agentBadgeItems : undefined}
          popoverContent={
            <VoiceAgentSettingsPopover
              voiceProviderType={voiceProviderType}
              agentEnabled={agentEnabled}
              onAgentModeChange={onAgentModeChange}
              capabilities={capabilities}
              onCapabilityToggle={onCapabilityToggle}
              enableGrokWebSearch={enableGrokWebSearch}
              enableGrokXSearch={enableGrokXSearch}
              onGrokWebSearchChange={onGrokWebSearchChange}
              onGrokXSearchChange={onGrokXSearchChange}
              disabled={isLoading || isSessionActive}
            />
          }
        />

        {/* Grok Search Indicators - Only show in GrokVoice mode when enabled */}
        {isGrokMode && (enableGrokWebSearch || enableGrokXSearch) && (
          <div className="flex items-center gap-1.5">
            {enableGrokWebSearch && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-blue-500) 15%, transparent)',
                  color: 'var(--color-blue-500)',
                }}
                title="Web search enabled"
              >
                <span className="w-3.5 h-3.5">
                  <FeatureIcons.Web />
                </span>
              </div>
            )}
            {enableGrokXSearch && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-purple-500) 15%, transparent)',
                  color: 'var(--color-purple-500)',
                }}
                title="X search enabled"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right side: Session Status */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Session Status Indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
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
}
