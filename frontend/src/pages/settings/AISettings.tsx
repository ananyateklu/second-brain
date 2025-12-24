import { useState, useCallback } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { useTauriSecrets } from '../../components/ui/use-tauri-secrets';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { useVoiceStatus } from '../../features/voice/hooks';
import { NoteSummarySettings } from './components/NoteSummarySettings';
import {
  ProviderCard,
  ProviderDetailsModal,
  AI_PROVIDERS,
  VOICE_PROVIDERS,
  getProviderIdFromName,
} from './components/ai';
import type { ProviderHealth } from './components/ai';

// Provider logos
import anthropicLight from '../../assets/anthropic-light.svg';
import anthropicDark from '../../assets/anthropic-dark.svg';
import googleLogo from '../../assets/google.svg';
import ollamaLogo from '../../assets/ollama.svg';
import openaiLight from '../../assets/openai-light.svg';
import openaiDark from '../../assets/openai-dark.svg';
import xaiLight from '../../assets/xai-light.svg';
import xaiDark from '../../assets/xai-dark.svg';
// Voice provider logos
import deepgramLogo from '../../assets/deepgram-light.jpeg';
import elevenlabsLogo from '../../assets/elevenlabs-light.svg';

export function AISettings() {
  const theme = useBoundStore((state) => state.theme);
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useAIHealth();
  const { isProviderConfigured: isTauriProviderConfigured, refetch: refetchSecrets } = useTauriSecrets();
  const { data: voiceStatus, refetch: refetchVoiceStatus } = useVoiceStatus();
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(null);

  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Check if a provider is configured - uses voice status for voice providers, Tauri secrets for AI providers
  const isProviderConfigured = useCallback((providerId: string): boolean => {
    if (providerId === 'deepgram') {
      return voiceStatus?.deepgramAvailable ?? false;
    }
    if (providerId === 'elevenlabs') {
      return voiceStatus?.elevenLabsAvailable ?? false;
    }
    return isTauriProviderConfigured(providerId);
  }, [voiceStatus, isTauriProviderConfigured]);

  // Combined refetch for all secrets and voice status
  const handleRefreshSecrets = useCallback(() => {
    void refetchSecrets();
    void refetchVoiceStatus();
  }, [refetchSecrets, refetchVoiceStatus]);

  // Get health status for a provider by its ID
  const getProviderHealth = (providerId: string): ProviderHealth | null => {
    if (!healthData?.providers) return null;
    return healthData.providers.find(
      (h: ProviderHealth) => getProviderIdFromName(h.provider) === providerId
    ) || null;
  };

  // Get provider logo based on theme
  const getProviderLogo = (providerId: string): string | null => {
    switch (providerId) {
      case 'openai':
        return isDarkMode ? openaiDark : openaiLight;
      case 'anthropic':
        return isDarkMode ? anthropicDark : anthropicLight;
      case 'google':
        return googleLogo;
      case 'ollama':
        return ollamaLogo;
      case 'xai':
        return isDarkMode ? xaiDark : xaiLight;
      case 'deepgram':
        return deepgramLogo;
      case 'elevenlabs':
        return elevenlabsLogo;
      default:
        return null;
    }
  };

  // Get Ollama downloaded models for the config section
  const ollamaHealth = healthData?.providers?.find((p: ProviderHealth) => p.provider === 'Ollama');
  const downloadedModels = ollamaHealth?.availableModels || [];

  // Calculate health stats
  const providerHealthList = AI_PROVIDERS.map((provider) => getProviderHealth(provider.id));
  const healthyCount = providerHealthList.filter((health) => health?.isHealthy).length;
  const totalProviders = AI_PROVIDERS.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {/* Provider Grid Section */}
          <section
            className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      Provider Grid
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Connected AI services
                    </h3>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Click a provider to view configuration steps, health, and troubleshooting notes.
                  </p>
                </div>
              </div>
              <HealthBadge
                isLoading={isHealthLoading}
                healthyCount={healthyCount}
                totalProviders={totalProviders}
              />
            </div>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {AI_PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  logo={getProviderLogo(provider.id)}
                  health={getProviderHealth(provider.id)}
                  isHealthLoading={isHealthLoading}
                  isProviderConfigured={isProviderConfigured}
                  isDarkMode={isDarkMode}
                  onClick={() => setSelectedProvider({ id: provider.id, name: provider.name })}
                />
              ))}
            </div>
          </section>

          {/* Voice Providers Section */}
          <section
            className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      Voice Providers
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Speech-to-Text & Text-to-Speech
                    </h3>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Configure voice providers for voice agent conversations.
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Provider Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {VOICE_PROVIDERS.map((provider) => (
                <VoiceProviderCard
                  key={provider.id}
                  provider={provider}
                  logo={getProviderLogo(provider.id)}
                  isProviderConfigured={isProviderConfigured}
                  onClick={() => setSelectedProvider({ id: provider.id, name: provider.name })}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Provider Details Modal */}
      <ProviderDetailsModal
        selectedProvider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
        health={selectedProvider ? getProviderHealth(selectedProvider.id) : null}
        getProviderLogo={getProviderLogo}
        downloadedModels={downloadedModels}
        onRefreshHealth={() => { void refetchHealth(); }}
        onRefreshSecrets={handleRefreshSecrets}
        voiceStatus={voiceStatus}
      />

      {/* Note Summary Settings */}
      <NoteSummarySettings />
    </div>
  );
}

// Health status badge component
interface HealthBadgeProps {
  isLoading: boolean;
  healthyCount: number;
  totalProviders: number;
}

const HealthBadge = ({ isLoading, healthyCount, totalProviders }: HealthBadgeProps) => (
  <span
    className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
    style={{
      border: '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)',
      backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
      color: 'var(--color-brand-600)',
    }}
  >
    {isLoading ? (
      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ) : (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    {isLoading ? 'Checking health…' : `${healthyCount}/${totalProviders} healthy`}
  </span>
);

// Voice provider card component
interface VoiceProviderCardProps {
  provider: { id: string; name: string };
  logo: string | null;
  isProviderConfigured: (providerId: string) => boolean;
  onClick: () => void;
}

const VoiceProviderCard = ({ provider, logo, isProviderConfigured, onClick }: VoiceProviderCardProps) => {
  const isConfigured = isProviderConfigured(provider.id);
  const isDeepgram = provider.id === 'deepgram';

  return (
    <div className="group">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] focus-visible:ring-offset-[color:var(--surface-card)] hover:-translate-y-1 hover:shadow-lg bg-[var(--surface-elevated)] border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--color-brand-600)_8%,var(--surface-elevated))] hover:border-[color-mix(in_srgb,var(--color-brand-600)_40%,var(--border))] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-brand-600)_12%,transparent)]"
      >
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl border overflow-hidden"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
                  backgroundColor: provider.id === 'elevenlabs' ? '#ffffff' : 'var(--surface-card)',
                }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={provider.name}
                    className={provider.id === 'elevenlabs' ? 'h-8 w-8 object-contain' : 'h-6 w-6 object-contain'}
                  />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
                style={{
                  backgroundColor: isConfigured ? '#10b981' : '#f59e0b',
                  borderColor: 'var(--surface-elevated)',
                  boxShadow: `0 0 0 2px ${isConfigured ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {provider.name}
              </p>
              <span
                className="mt-1 flex items-center w-fit rounded-full border py-0.5 pl-2.5 pr-2.5 text-[8px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--surface-card) 65%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
                  color: isConfigured ? '#10b981' : '#f59e0b',
                }}
              >
                {isConfigured ? 'Configured' : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Type:</span>
              {isDeepgram ? 'Speech-to-Text' : 'Text-to-Speech'}
            </span>
          </div>

          <div className="text-xs font-semibold text-right whitespace-nowrap flex items-center gap-1" style={{ color: 'var(--color-brand-600)' }}>
            {!isConfigured ? (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                Click to configure
              </>
            ) : (
              <>
                Details
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};
