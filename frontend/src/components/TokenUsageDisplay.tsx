import { formatModelName } from '../utils/model-name-formatter';
import { useProviderLogo } from '../utils/provider-logos';
import { useBoundStore } from '../store/bound-store';

// Theme-aware user icon
const UserIcon = () => {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
};

const ModelIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.638-1.638l-1.183-.394 1.183-.394a2.25 2.25 0 001.638-1.638l.394-1.183.394 1.183a2.25 2.25 0 001.638 1.638l1.183.394-1.183.394a2.25 2.25 0 00-1.638 1.638z" />
  </svg>
);

// Theme-aware token icon
const TokenIcon = () => {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
};

// Accuracy indicator icons
const CheckIcon = () => (
  <svg className="w-2.5 h-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const EstimateIcon = () => (
  <svg className="w-2.5 h-2.5 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface TokenUsageDisplayProps {
  inputTokens?: number;
  outputTokens?: number;
  role: 'user' | 'assistant';
  modelName?: string;
  provider?: string;
  userName?: string;
  durationMs?: number;
  tokensActual?: boolean;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  ragContextTokens?: number;
  ragChunksCount?: number;
  reasoningTokens?: number;
  toolDefinitionTokens?: number;
  toolArgumentTokens?: number;
  toolResultTokens?: number;
}

export function TokenUsageDisplay({
  inputTokens,
  outputTokens,
  role,
  modelName,
  provider,
  userName,
  durationMs,
  tokensActual,
  cacheReadTokens,
  ragContextTokens,
  ragChunksCount,
  reasoningTokens,
  toolDefinitionTokens,
  toolArgumentTokens,
  toolResultTokens,
}: TokenUsageDisplayProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const providerLogo = useProviderLogo(provider || '');

  if (!inputTokens && !outputTokens) {
    return null;
  }

  const tokenCount = role === 'user' ? inputTokens : outputTokens;
  const tokensPerSecond = role === 'assistant' && outputTokens && durationMs && durationMs > 0
    ? (outputTokens / (durationMs / 1000)).toFixed(1)
    : null;

  const firstName = userName ? userName.split(' ')[0] : 'User';
  const displayName = role === 'user'
    ? firstName
    : (modelName ? formatModelName(modelName) : undefined);

  // Calculate cache savings percentage
  const cacheSavingsPercent = cacheReadTokens && inputTokens && inputTokens > 0
    ? Math.round((cacheReadTokens / inputTokens) * 100)
    : null;

  // Calculate total tool tokens
  const totalToolTokens = (toolDefinitionTokens || 0) + (toolArgumentTokens || 0) + (toolResultTokens || 0);

  // Check if we have any extra metrics to show
  const hasExtraMetrics = (cacheSavingsPercent && cacheSavingsPercent > 0) ||
    (ragContextTokens && ragContextTokens > 0) ||
    (reasoningTokens && reasoningTokens > 0) ||
    totalToolTokens > 0;

  // Base text color based on role and theme
  const baseTextColor = role === 'user'
    ? (isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)')
    : isDarkMode ? 'var(--text-secondary)' : 'var(--text-tertiary)';

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-3 font-medium"
      style={{ color: baseTextColor }}
    >
      {/* Model/User name with icon */}
      {displayName && (
        <div className="flex items-center gap-1.5">
          {role === 'user' ? (
            <UserIcon />
          ) : (
            provider && providerLogo ? (
              <img
                src={providerLogo}
                alt={provider}
                className="w-3 h-3 flex-shrink-0 object-contain"
              />
            ) : (
              <ModelIcon />
            )
          )}
          <span>{displayName}</span>
        </div>
      )}

      {displayName && tokenCount !== undefined && (
        <span className="opacity-30 select-none">•</span>
      )}

      {/* Token count with tokens/s combined */}
      {tokenCount !== undefined && (
        <div className="flex items-center gap-1">
          <TokenIcon />
          <span>
            {tokenCount.toLocaleString()} tokens
            {tokensPerSecond && ` (${tokensPerSecond} tok/s)`}
          </span>
          {tokensActual !== undefined && (
            <span>
              {tokensActual ? <CheckIcon /> : <EstimateIcon />}
            </span>
          )}
        </div>
      )}

      {/* Extra metrics grouped together with subtle separator */}
      {hasExtraMetrics && (
        <>
          <span className="opacity-30 select-none">•</span>
          <div className="flex items-center gap-1.5">
            {/* Cache savings */}
            {cacheSavingsPercent && cacheSavingsPercent > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                  color: isDarkMode ? 'rgb(134, 239, 172)' : 'rgb(22, 163, 74)',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <span>{cacheSavingsPercent}% cached</span>
              </span>
            )}

            {/* RAG context */}
            {ragContextTokens && ragContextTokens > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
                  color: 'var(--color-accent-blue-text)',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>RAG {ragContextTokens.toLocaleString()} {ragChunksCount ? ` · ${ragChunksCount} chunks` : ''}</span>
              </span>
            )}

            {/* Reasoning/Thinking tokens */}
            {reasoningTokens && reasoningTokens > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
                  color: isDarkMode ? 'rgb(103, 232, 249)' : 'rgb(8, 145, 178)',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <span>thinking {reasoningTokens.toLocaleString()}</span>
              </span>
            )}

            {/* Tool tokens */}
            {totalToolTokens > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
                  color: 'var(--color-brand-500)',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
                <span>tools {totalToolTokens.toLocaleString()}</span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
