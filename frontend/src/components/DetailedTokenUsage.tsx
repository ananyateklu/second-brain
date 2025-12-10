import { useState } from 'react';
import { formatModelName } from '../utils/model-name-formatter';
import { useProviderLogo } from '../utils/provider-logos';
import { useThemeStore } from '../store/theme-store';
import type { ChatMessage } from '../types/chat';

// Theme-aware icons
const ChevronIcon = ({ expanded }: { expanded: boolean }) => {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg
      className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke={strokeColor}
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
};

const TokenIcon = () => {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
};

const CheckIcon = () => (
  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const EstimateIcon = () => (
  <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SpeedIcon = () => {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
};

const CacheIcon = () => (
  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const RagIcon = () => (
  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ToolIcon = () => (
  <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

const ThinkingIcon = () => (
  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

interface DetailedTokenUsageProps {
  message: ChatMessage;
  modelName?: string;
  provider?: string;
  userName?: string;
  showBreakdown?: boolean;
  compact?: boolean;
}

interface TokenBreakdownItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export function DetailedTokenUsage({
  message,
  modelName,
  provider,
  userName,
  showBreakdown = true,
  compact = false,
}: DetailedTokenUsageProps) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const providerLogo = useProviderLogo(provider || '');

  const {
    role,
    inputTokens,
    outputTokens,
    tokensActual,
    reasoningTokens,
    cacheCreationTokens,
    cacheReadTokens,
    ragContextTokens,
    ragChunksCount,
    toolDefinitionTokens,
    toolArgumentTokens,
    toolResultTokens,
    durationMs,
  } = message;

  // Don't render if no token data available
  const hasAnyTokens = inputTokens || outputTokens;
  if (!hasAnyTokens) {
    return null;
  }

  const primaryTokens = role === 'user' ? inputTokens : outputTokens;
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);

  // Calculate tokens per second for assistant messages
  const tokensPerSecond = role === 'assistant' && outputTokens && durationMs && durationMs > 0
    ? (outputTokens / (durationMs / 1000)).toFixed(1)
    : null;

  // Build breakdown items for detailed view
  const breakdownItems: TokenBreakdownItem[] = [];

  if (ragContextTokens && ragContextTokens > 0) {
    breakdownItems.push({
      label: `RAG Context${ragChunksCount ? ` (${ragChunksCount} chunks)` : ''}`,
      value: ragContextTokens,
      icon: <RagIcon />,
      color: 'text-blue-400',
    });
  }

  if (cacheReadTokens && cacheReadTokens > 0) {
    breakdownItems.push({
      label: 'Cache Read (saved)',
      value: cacheReadTokens,
      icon: <CacheIcon />,
      color: 'text-green-400',
    });
  }

  if (cacheCreationTokens && cacheCreationTokens > 0) {
    breakdownItems.push({
      label: 'Cache Creation',
      value: cacheCreationTokens,
      icon: <CacheIcon />,
      color: 'text-purple-400',
    });
  }

  if (reasoningTokens && reasoningTokens > 0) {
    breakdownItems.push({
      label: 'Reasoning/Thinking',
      value: reasoningTokens,
      icon: <ThinkingIcon />,
      color: 'text-cyan-400',
    });
  }

  const totalToolTokens = (toolDefinitionTokens || 0) + (toolArgumentTokens || 0) + (toolResultTokens || 0);
  if (totalToolTokens > 0) {
    breakdownItems.push({
      label: 'Tool Usage',
      value: totalToolTokens,
      icon: <ToolIcon />,
      color: 'text-orange-400',
    });
  }

  const hasBreakdown = breakdownItems.length > 0;
  const firstName = userName ? userName.split(' ')[0] : 'User';
  const displayName = role === 'user' ? firstName : (modelName ? formatModelName(modelName) : provider);

  // Cache savings calculation
  const cacheSavingsPercent = cacheReadTokens && inputTokens
    ? Math.round((cacheReadTokens / inputTokens) * 100)
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-brand-300)' }}>
        <TokenIcon />
        <span>{primaryTokens?.toLocaleString()}</span>
        {tokensActual ? (
          <CheckIcon />
        ) : (
          <EstimateIcon />
        )}
        {tokensPerSecond && (
          <>
            <span className="opacity-40">•</span>
            <SpeedIcon />
            <span>{tokensPerSecond} tok/s</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 text-xs font-medium" style={{ color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)' }}>
      {/* Main token display row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Model/User name */}
        {displayName && (
          <div className="flex items-center gap-1.5">
            {role === 'assistant' && provider && providerLogo ? (
              <img src={providerLogo} alt={provider} className="w-3.5 h-3.5 flex-shrink-0 object-contain" />
            ) : null}
            <span className="font-semibold">{displayName}</span>
          </div>
        )}

        {displayName && <span className="opacity-40 select-none">•</span>}

        {/* Primary token count */}
        <div className="flex items-center gap-1.5">
          <TokenIcon />
          <span>{primaryTokens?.toLocaleString()} tokens</span>
          {tokensActual ? (
            <span title="Actual provider tokens">
              <CheckIcon />
            </span>
          ) : (
            <span title="Estimated tokens">
              <EstimateIcon />
            </span>
          )}
        </div>

        {/* Tokens per second */}
        {tokensPerSecond && (
          <>
            <span className="opacity-40 select-none">•</span>
            <div className="flex items-center gap-1.5">
              <SpeedIcon />
              <span>{tokensPerSecond} tok/s</span>
            </div>
          </>
        )}

        {/* Cache savings badge */}
        {cacheSavingsPercent && cacheSavingsPercent > 0 && (
          <>
            <span className="opacity-40 select-none">•</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              <CacheIcon />
              <span>{cacheSavingsPercent}% cached</span>
            </div>
          </>
        )}

        {/* Expand button for breakdown */}
        {showBreakdown && hasBreakdown && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            <span className="opacity-70">Details</span>
            <ChevronIcon expanded={expanded} />
          </button>
        )}
      </div>

      {/* Expanded breakdown */}
      {expanded && hasBreakdown && (
        <div className="mt-2 pl-4 border-l-2 border-white/10 space-y-1.5">
          {breakdownItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.icon}
              <span className={item.color}>{item.label}:</span>
              <span className="font-mono">{item.value.toLocaleString()}</span>
            </div>
          ))}

          {/* Tool breakdown detail */}
          {totalToolTokens > 0 && (toolDefinitionTokens || toolArgumentTokens || toolResultTokens) && (
            <div className="ml-6 text-[10px] opacity-70 space-y-0.5">
              {toolDefinitionTokens ? <div>Definitions: {toolDefinitionTokens.toLocaleString()}</div> : null}
              {toolArgumentTokens ? <div>Arguments: {toolArgumentTokens.toLocaleString()}</div> : null}
              {toolResultTokens ? <div>Results: {toolResultTokens.toLocaleString()}</div> : null}
            </div>
          )}

          {/* Total summary */}
          <div className="pt-1.5 mt-1.5 border-t border-white/10 flex items-center gap-2 font-semibold">
            <TokenIcon />
            <span>Total: {totalTokens.toLocaleString()} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight version for inline display
 */
export function TokenBadge({
  tokens,
  isActual,
  label,
}: {
  tokens: number;
  isActual?: boolean;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-xs font-mono">
      {label && <span className="opacity-70">{label}:</span>}
      <span>{tokens.toLocaleString()}</span>
      {isActual !== undefined && (
        isActual ? <CheckIcon /> : <EstimateIcon />
      )}
    </div>
  );
}
