import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '../../../../components/ui/Dialog';
import { TauriProviderApiKeyInput } from '../../../../components/composite/api-keys-manager';
import { isTauri } from '../../../../lib/native-notifications';
import { formatModelName } from '../../../../utils/model-name-formatter';
import { OllamaConfigSection } from './OllamaConfigSection';
import {
  PROVIDER_DETAILS,
  MODEL_SUGGESTIONS,
  getProviderConfigKey,
} from './constants';
import type { ProviderHealth } from './ProviderCard';
import type { VoiceServiceStatus } from '../../../../features/voice/types/voice-types';

interface ProviderDetailsModalProps {
  selectedProvider: { id: string; name: string } | null;
  onClose: () => void;
  health: ProviderHealth | null;
  getProviderLogo: (providerId: string) => string | null;
  downloadedModels: string[];
  onRefreshHealth: () => void;
  onRefreshSecrets: () => void;
  voiceStatus?: VoiceServiceStatus;
}

/**
 * Modal displaying provider details, configuration, and troubleshooting
 */
export const ProviderDetailsModal = ({
  selectedProvider,
  onClose,
  health,
  getProviderLogo,
  downloadedModels,
  onRefreshHealth,
  onRefreshSecrets,
  voiceStatus,
}: ProviderDetailsModalProps) => {
  if (!selectedProvider) return null;

  // Check if this is a voice provider
  const isVoiceProvider = selectedProvider.id === 'deepgram' || selectedProvider.id === 'elevenlabs';

  // For voice providers, determine status from voiceStatus
  const getVoiceProviderStatus = (): { isConfigured: boolean; error?: string } => {
    if (selectedProvider.id === 'deepgram') {
      return {
        isConfigured: voiceStatus?.deepgramAvailable ?? false,
        error: voiceStatus?.deepgramError,
      };
    }
    if (selectedProvider.id === 'elevenlabs') {
      return {
        isConfigured: voiceStatus?.elevenLabsAvailable ?? false,
        error: voiceStatus?.elevenLabsError,
      };
    }
    return { isConfigured: false };
  };

  const voiceProviderStatus = isVoiceProvider ? getVoiceProviderStatus() : null;
  const isDisabled = isVoiceProvider ? !voiceProviderStatus?.isConfigured : health?.status === 'Disabled';
  const configKey = getProviderConfigKey(selectedProvider.id);
  const configPath = 'backend/src/SecondBrain.API/appsettings.json';
  const devConfigPath = 'backend/src/SecondBrain.API/appsettings.Development.json';
  const providerDetails = PROVIDER_DETAILS[selectedProvider.id];
  const logo = getProviderLogo(selectedProvider.id);

  return (
    <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl p-0" description="View and configure AI provider settings, models, and API configuration">
        <DialogHeader className="rounded-t-3xl">
          <DialogTitle
            icon={
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            Configure {selectedProvider.name}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
        {/* Provider Overview */}
        {providerDetails && (
          <ProviderOverviewSection
            selectedProvider={selectedProvider}
            providerDetails={providerDetails}
            logo={logo}
          />
        )}

        {/* Health Status & Available Models */}
        <HealthStatusSection
          health={health}
          isDisabled={isDisabled}
          isVoiceProvider={isVoiceProvider}
          voiceProviderStatus={voiceProviderStatus}
        />

        {/* Ollama Configuration - Only shown for Ollama provider */}
        {selectedProvider.id === 'ollama' && (
          <OllamaConfigSection
            downloadedModels={downloadedModels}
            onRefreshHealth={onRefreshHealth}
          />
        )}

        {/* API Key Configuration for Tauri Desktop App */}
        {isDisabled && isTauri() && (
          <TauriProviderApiKeyInput
            providerId={selectedProvider.id}
            onSaveSuccess={() => {
              onRefreshHealth();
              onRefreshSecrets();
            }}
          />
        )}

        {/* Instructions for Web/Non-Tauri */}
        {isDisabled && !isTauri() && (
          <WebConfigInstructions
            providerName={selectedProvider.name}
            configKey={configKey}
            configPath={configPath}
            devConfigPath={devConfigPath}
          />
        )}

        {/* Troubleshooting for unhealthy but enabled providers */}
        {!isDisabled && !health?.isHealthy && (
          <TroubleshootingSection
            selectedProvider={selectedProvider}
            health={health}
            configKey={configKey}
            onRefreshHealth={onRefreshHealth}
            onRefreshSecrets={onRefreshSecrets}
          />
        )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

// Sub-components

interface ProviderOverviewSectionProps {
  selectedProvider: { id: string; name: string };
  providerDetails: {
    tagline: string;
    description: string;
    highlights: string[];
    docsUrl?: string;
    billingNote?: string;
  };
  logo: string | null;
}

const ProviderOverviewSection = ({
  selectedProvider,
  providerDetails,
  logo,
}: ProviderOverviewSectionProps) => (
  <div
    className="rounded-xl border p-3 space-y-3"
    style={{
      backgroundColor: 'var(--surface-elevated)',
      borderColor: 'var(--border)',
    }}
  >
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        {logo && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0 overflow-hidden"
            style={{
              backgroundColor: selectedProvider.id === 'elevenlabs' ? '#ffffff' : 'var(--surface-card)',
              borderColor: 'var(--border)',
            }}
          >
            {selectedProvider.id === 'ollama' || selectedProvider.id === 'deepgram' ? (
              <img src={logo} alt={selectedProvider.name} className="h-5 w-5 object-contain" />
            ) : selectedProvider.id === 'elevenlabs' ? (
              <img src={logo} alt={selectedProvider.name} className="h-6 w-6 object-contain" />
            ) : (
              <img src={logo} alt={selectedProvider.name} className="h-4 w-auto object-contain" />
            )}
          </div>
        )}
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {selectedProvider.name}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {providerDetails.tagline}
          </p>
        </div>
      </div>
      {providerDetails.docsUrl && (
        <a
          href={providerDetails.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:scale-105 flex items-center gap-1 border-[color-mix(in_srgb,var(--color-brand-500)_35%,transparent)] text-[var(--color-brand-600)] bg-transparent hover:bg-[color-mix(in_srgb,var(--color-brand-600)_15%,transparent)] hover:border-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
        >
          View docs
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      {providerDetails.description}
    </p>
    <div className="flex flex-wrap gap-1.5">
      {providerDetails.highlights.map((highlight) => (
        <span
          key={highlight}
          className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1"
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-primary)',
          }}
        >
          <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {highlight}
        </span>
      ))}
    </div>
    {providerDetails.billingNote && (
      <div className="pt-2 border-t flex items-start gap-1.5" style={{ borderColor: 'var(--border)' }}>
        <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {providerDetails.billingNote}
        </p>
      </div>
    )}
  </div>
);

interface HealthStatusSectionProps {
  health: ProviderHealth | null;
  isDisabled: boolean;
  isVoiceProvider?: boolean;
  voiceProviderStatus?: { isConfigured: boolean; error?: string } | null;
}

const HealthStatusSection = ({ health, isDisabled, isVoiceProvider, voiceProviderStatus }: HealthStatusSectionProps) => {
  // Determine status text and color for voice providers
  const getStatusDisplay = () => {
    if (isVoiceProvider && voiceProviderStatus) {
      if (voiceProviderStatus.isConfigured) {
        return { text: 'Configured', isHealthy: true };
      }
      return { text: 'Not Configured', isHealthy: false };
    }
    return { text: health?.status || 'Unknown', isHealthy: health?.isHealthy ?? false };
  };

  const { text: statusText, isHealthy } = getStatusDisplay();
  const errorMessage = isVoiceProvider ? voiceProviderStatus?.error : health?.errorMessage;

  return (
    <div
      className="p-2.5 rounded-xl border"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isDisabled ? '#f59e0b' : isHealthy ? '#10b981' : '#ef4444',
              boxShadow: `0 0 0 2px ${isDisabled ? 'rgba(245, 158, 11, 0.2)' : isHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}
          />
          <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {statusText}
          </p>
          {health?.responseTimeMs && health.responseTimeMs > 0 && (
            <p className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-secondary)' }}>
              <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {health.responseTimeMs}ms
            </p>
          )}
        </div>
        {health?.availableModels && health.availableModels.length > 0 && (
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {health.availableModels.length} models
            </p>
          </div>
        )}
      </div>
      {errorMessage && (
        <p className="text-[9px] truncate mb-2" style={{ color: '#ef4444' }}>
          {errorMessage}
        </p>
      )}
      {health?.availableModels && health.availableModels.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto thin-scrollbar pr-1">
          {health.availableModels.map((model: string) => (
            <code
              key={model}
              className="px-1.5 py-0.5 rounded-xl text-[9px] font-medium whitespace-nowrap"
              style={{
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              {formatModelName(model)}
            </code>
          ))}
        </div>
      )}
    </div>
  );
};

interface WebConfigInstructionsProps {
  providerName: string;
  configKey: string;
  configPath: string;
  devConfigPath: string;
}

const WebConfigInstructions = ({
  providerName,
  configKey,
  configPath,
  devConfigPath,
}: WebConfigInstructionsProps) => (
  <div className="space-y-3">
    <div>
      <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        How to Enable {providerName}
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        To enable this provider, you need to update your backend configuration file:
      </p>
    </div>

    <div
      className="p-4 rounded-xl border font-mono text-xs"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="mb-2">
        <span style={{ color: 'var(--text-secondary)' }}>File:</span>{' '}
        <span className="font-semibold">{configPath}</span>
        <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          (or {devConfigPath} for development)
        </span>
      </div>
      <div className="mt-3">
        <span style={{ color: 'var(--text-secondary)' }}>Change:</span>
        <div className="mt-1">
          <span style={{ color: '#10b981' }}>"Enabled"</span>
          <span style={{ color: 'var(--text-secondary)' }}>: </span>
          <span style={{ color: '#ef4444' }}>false</span>
          <span style={{ color: 'var(--text-secondary)' }}> → </span>
          <span style={{ color: '#10b981' }}>true</span>
        </div>
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          In the <span className="font-semibold">"{configKey}"</span> section
        </div>
      </div>
    </div>

    <div
      className="p-4 rounded-xl border-l-4 flex gap-2"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderLeftColor: '#3b82f6',
      }}
    >
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#3b82f6' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Important
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          After updating the configuration file, you'll need to restart the backend server for the changes to take effect.
        </p>
      </div>
    </div>
  </div>
);

interface TroubleshootingSectionProps {
  selectedProvider: { id: string; name: string };
  health: ProviderHealth | null;
  configKey: string;
  onRefreshHealth: () => void;
  onRefreshSecrets: () => void;
}

const TroubleshootingSection = ({
  selectedProvider,
  health,
  configKey,
  onRefreshHealth,
  onRefreshSecrets,
}: TroubleshootingSectionProps) => {
  const suggestions = MODEL_SUGGESTIONS[selectedProvider.id];

  return (
    <div className="space-y-3">
      {/* API Key Configuration for Tauri - Update key if needed */}
      {isTauri() && (
        <TauriProviderApiKeyInput
          providerId={selectedProvider.id}
          onSaveSuccess={() => {
            onRefreshHealth();
            onRefreshSecrets();
          }}
        />
      )}

      {/* Troubleshooting Steps */}
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Troubleshooting Steps:
        </h4>
        <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>1</span>
            <span>Verify your API key is valid and has the correct permissions</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>2</span>
            <span>Check that the model name in configuration matches available models</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>3</span>
            <span>Ensure your API key has access to the configured model</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>4</span>
            <span>Verify network connectivity and firewall settings</span>
          </li>
          {health?.status === 'Unavailable' && (
            <li className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>5</span>
              <span>
                The model "{health?.errorMessage?.includes('model:') ? health.errorMessage.split('model:')[1]?.split('"')[0]?.trim() : configKey}" may not be available. Try a different model version.
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Model Suggestions */}
      {suggestions && (
        <div
          className="p-3 rounded-xl border"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Try these model names:
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {suggestions.map((model) => (
              <code
                key={model}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {model}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
