import { useState } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { useTauriSecrets } from '../../components/ui/use-tauri-secrets';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { NoteSummarySettings } from './components/NoteSummarySettings';
import {
  ProviderCard,
  ProviderDetailsModal,
  AI_PROVIDERS,
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

export function AISettings() {
  const theme = useBoundStore((state) => state.theme);
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useAIHealth();
  const { isProviderConfigured, refetch: refetchSecrets } = useTauriSecrets();
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(null);

  const isDarkMode = theme === 'dark' || theme === 'blue';

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
        onRefreshSecrets={() => { void refetchSecrets(); }}
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
