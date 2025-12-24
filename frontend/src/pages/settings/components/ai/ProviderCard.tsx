import { formatModelName } from '../../../../utils/model-name-formatter';
import { isTauri } from '../../../../lib/native-notifications';

export interface ProviderHealth {
  provider: string;
  isHealthy: boolean;
  status: string;
  errorMessage?: string;
  responseTimeMs?: number;
  checkedAt?: string;
  availableModels?: string[];
  version?: string;
}

export interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
  };
  logo: string | null;
  health: ProviderHealth | null;
  isHealthLoading: boolean;
  isProviderConfigured: (providerId: string) => boolean;
  isDarkMode: boolean;
  onClick: () => void;
}

const formatCheckedAt = (timestamp?: string): string | null => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Individual AI provider card displaying health status and configuration state
 */
export const ProviderCard = ({
  provider,
  logo,
  health,
  isHealthLoading,
  isProviderConfigured,
  onClick,
}: ProviderCardProps) => {
  const isHealthy = health?.isHealthy ?? false;
  const status = health?.status ?? (isHealthLoading ? 'Checking...' : 'Unknown');
  const errorMessage = health?.errorMessage;
  const isDisabled = status === 'Disabled';
  const lastChecked = formatCheckedAt(health?.checkedAt);
  const latency = health?.responseTimeMs && health.responseTimeMs > 0 ? `${health.responseTimeMs}ms` : null;

  // Determine status color
  const getStatusColor = () => {
    if (isHealthLoading) return { bg: 'var(--color-gray-400, #9ca3af)', shadow: 'color-mix(in srgb, var(--color-gray-400, #9ca3af) 20%, transparent)' };
    if (isHealthy) return { bg: 'var(--color-success, #10b981)', shadow: 'color-mix(in srgb, var(--color-success, #10b981) 20%, transparent)' };
    if (isDisabled) return { bg: 'var(--color-warning, #f59e0b)', shadow: 'color-mix(in srgb, var(--color-warning, #f59e0b) 20%, transparent)' };
    return { bg: 'var(--color-error)', shadow: 'color-mix(in srgb, var(--color-error) 20%, transparent)' };
  };

  const statusColor = getStatusColor();

  return (
    <div className="group">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] focus-visible:ring-offset-[color:var(--surface-card)] hover:-translate-y-1 hover:shadow-lg bg-[var(--surface-elevated)] border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--color-brand-600)_8%,var(--surface-elevated))] hover:border-[color-mix(in_srgb,var(--color-brand-600)_40%,var(--border))] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-brand-900)_12%,transparent)]"
      >
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="relative flex h-12 w-12 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--surface-card) 60%, transparent)',
              }}
            >
              {logo && (
                provider.id === 'ollama' ? (
                  <img src={logo} alt={provider.name} className="h-7 w-7 object-contain" />
                ) : (
                  <img src={logo} alt={provider.name} className="h-5 w-auto object-contain" />
                )
              )}
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2"
                style={{
                  backgroundColor: statusColor.bg,
                  borderColor: 'var(--surface-elevated)',
                  boxShadow: `0 0 0 2px ${statusColor.shadow}`,
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {provider.name}
              </p>
              {isHealthLoading ? (
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Checking status"
                >
                  Checking status…
                </p>
              ) : (
                <span
                  className="mt-1 flex items-center w-fit rounded-full border py-0.5 pl-2.5 pr-2.5 text-[8px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--surface-card) 65%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
                    color: isHealthy ? '#10b981' : isDisabled ? '#f59e0b' : '#ef4444',
                  }}
                  title={errorMessage || status}
                >
                  {status}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {latency && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Latency:</span>
                {latency}
              </span>
            )}
            {lastChecked && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Checked:</span>
                {lastChecked}
              </span>
            )}
            {health?.availableModels?.length ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Models:</span>
                {health.availableModels
                  .slice(0, 1)
                  .map(formatModelName)
                  .join(', ')}
                {health.availableModels.length > 4 && '…'}
              </span>
            ) : health?.version ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Version:</span>
                {health.version}
              </span>
            ) : null}
          </div>

          <div className="text-xs font-semibold text-right whitespace-nowrap flex items-center gap-1" style={{ color: 'var(--color-brand-600)' }}>
            {isTauri() && isDisabled && !isProviderConfigured(provider.id) ? (
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

        {errorMessage && (
          <p
            className="mt-3 rounded-xl border px-3 py-2 text-xs"
            style={{
              borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
              backgroundColor: 'color-mix(in srgb, #ef4444 6%, transparent)',
              color: '#ef4444',
            }}
          >
            {errorMessage}
          </p>
        )}
      </button>
    </div>
  );
};
