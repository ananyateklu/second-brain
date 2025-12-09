import { formatModelName } from '../utils/model-name-formatter';
import { useProviderLogo } from '../utils/provider-logos';
import { useThemeStore } from '../store/theme-store';

// Theme-aware user icon
const UserIcon = () => {
  const { theme } = useThemeStore();
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
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
};

// Theme-aware speed icon
const SpeedIcon = () => {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const strokeColor = isDarkMode ? 'white' : 'black';

  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
};

interface TokenUsageDisplayProps {
  inputTokens?: number;
  outputTokens?: number;
  role: 'user' | 'assistant';
  modelName?: string;
  provider?: string; // Provider name (e.g., 'OpenAI', 'Anthropic') for showing provider logo
  userName?: string;
  durationMs?: number; // Duration in milliseconds
}

export function TokenUsageDisplay({
  inputTokens,
  outputTokens,
  role,
  modelName,
  provider,
  userName,
  durationMs
}: TokenUsageDisplayProps) {
  // Get provider logo for assistant messages (always call hook, but only use if needed)
  // Must be called before any early returns to satisfy React hooks rules
  const providerLogo = useProviderLogo(provider || '');

  // Don't render if no token data available
  if (!inputTokens && !outputTokens) {
    return null;
  }

  const tokenCount = role === 'user' ? inputTokens : outputTokens;

  // Calculate tokens per second for assistant messages
  const tokensPerSecond = role === 'assistant' && outputTokens && durationMs && durationMs > 0
    ? (outputTokens / (durationMs / 1000)).toFixed(1)
    : null;

  // Extract first name from userName for user messages
  const firstName = userName ? userName.split(' ')[0] : 'User';

  // Show first name for user messages, model name for assistant messages
  const displayName = role === 'user'
    ? firstName
    : (modelName ? formatModelName(modelName) : undefined);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-3 font-medium"
      style={{
        color: role === 'user'
          ? 'rgba(255, 255, 255, 0.85)'
          : 'var(--color-brand-300)',
      }}
    >
      {displayName && (
        <div className="flex items-center gap-1.5">
          {role === 'user' ? (
            <UserIcon />
          ) : (
            provider && providerLogo ? (
              <img
                src={providerLogo}
                alt={provider}
                className="w-2.5 h-2.5 flex-shrink-0 object-contain"
              />
            ) : (
              <ModelIcon />
            )
          )}
          <span>{displayName}</span>
        </div>
      )}

      {(displayName && (tokenCount !== undefined || tokensPerSecond)) && (
        <span className="opacity-40 select-none">•</span>
      )}

      {tokenCount !== undefined && (
        <div className="flex items-center gap-1.5">
          <TokenIcon />
          <div className="flex items-center gap-1">
            <span>{tokenCount.toLocaleString()}</span>
            <span className="opacity-70 font-normal">tokens</span>
          </div>
        </div>
      )}

      {(tokensPerSecond && tokenCount !== undefined) && (
        <span className="opacity-40 select-none">•</span>
      )}

      {tokensPerSecond && (
        <div className="flex items-center gap-1.5">
          <SpeedIcon />
          <div className="flex items-center gap-1">
            <span>{tokensPerSecond}</span>
            <span className="opacity-70 font-normal">tok/s</span>
          </div>
        </div>
      )}
    </div>
  );
}

