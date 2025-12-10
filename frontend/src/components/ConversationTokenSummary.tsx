import { useMemo } from 'react';
import { useThemeStore } from '../store/theme-store';
import type { ChatMessage, ChatConversation } from '../types/chat';

interface TokenSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  actualTokenCount: number;
  estimatedTokenCount: number;
  ragContextTokens: number;
  ragChunksCount: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cacheSavings: number;
  reasoningTokens: number;
  toolTokens: number;
  toolCallCount: number;
  averageTokensPerMessage: number;
  averageOutputSpeed: number | null;
  totalDurationMs: number;
}

function calculateTokenSummary(messages: ChatMessage[]): TokenSummary {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let actualTokenCount = 0;
  let estimatedTokenCount = 0;
  let ragContextTokens = 0;
  let ragChunksCount = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let reasoningTokens = 0;
  let toolTokens = 0;
  let toolCallCount = 0;
  let totalDurationMs = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;

  for (const msg of messages) {
    if (msg.role === 'user') {
      userMessageCount++;
      totalInputTokens += msg.inputTokens || 0;
      if (msg.tokensActual) actualTokenCount++; else estimatedTokenCount++;
    } else if (msg.role === 'assistant') {
      assistantMessageCount++;
      totalOutputTokens += msg.outputTokens || 0;
      if (msg.tokensActual) actualTokenCount++; else estimatedTokenCount++;
      if (msg.durationMs) totalDurationMs += msg.durationMs;
    }

    ragContextTokens += msg.ragContextTokens || 0;
    ragChunksCount += msg.ragChunksCount || 0;
    cacheCreationTokens += msg.cacheCreationTokens || 0;
    cacheReadTokens += msg.cacheReadTokens || 0;
    reasoningTokens += msg.reasoningTokens || 0;
    toolTokens += (msg.toolDefinitionTokens || 0) + (msg.toolArgumentTokens || 0) + (msg.toolResultTokens || 0);
    if (msg.toolCalls) toolCallCount += msg.toolCalls.length;
  }

  const totalTokens = totalInputTokens + totalOutputTokens;
  const messageCount = messages.filter(m => m.role !== 'system').length;
  const averageTokensPerMessage = messageCount > 0 ? Math.round(totalTokens / messageCount) : 0;
  const averageOutputSpeed = totalDurationMs > 0 && totalOutputTokens > 0
    ? totalOutputTokens / (totalDurationMs / 1000)
    : null;
  const cacheSavings = cacheReadTokens > 0 && totalInputTokens > 0
    ? Math.round((cacheReadTokens / totalInputTokens) * 100)
    : 0;

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    messageCount,
    userMessageCount,
    assistantMessageCount,
    actualTokenCount,
    estimatedTokenCount,
    ragContextTokens,
    ragChunksCount,
    cacheCreationTokens,
    cacheReadTokens,
    cacheSavings,
    reasoningTokens,
    toolTokens,
    toolCallCount,
    averageTokensPerMessage,
    averageOutputSpeed,
    totalDurationMs,
  };
}

// Icons
const TokenIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const InputIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
  </svg>
);

const OutputIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
  </svg>
);

const SpeedIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const CacheIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const RagIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ToolIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

interface ConversationTokenSummaryProps {
  conversation: ChatConversation;
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

export function ConversationTokenSummary({
  conversation,
  variant = 'full',
  className = '',
}: ConversationTokenSummaryProps) {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';

  const summary = useMemo(
    () => calculateTokenSummary(conversation.messages),
    [conversation.messages]
  );

  if (summary.totalTokens === 0) {
    return null;
  }

  const bgColor = isDarkMode ? 'bg-white/5' : 'bg-gray-100';
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-700';
  const mutedColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-xs ${mutedColor} ${className}`}>
        <TokenIcon />
        <span>{summary.totalTokens.toLocaleString()} tokens</span>
        <span className="opacity-50">•</span>
        <span>{summary.messageCount} messages</span>
        {summary.averageOutputSpeed && (
          <>
            <span className="opacity-50">•</span>
            <span>{summary.averageOutputSpeed.toFixed(1)} tok/s avg</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`${bgColor} rounded-lg p-3 ${className}`}>
        <div className={`flex items-center justify-between ${textColor}`}>
          <div className="flex items-center gap-2">
            <TokenIcon />
            <span className="font-semibold">{summary.totalTokens.toLocaleString()}</span>
            <span className={mutedColor}>total tokens</span>
          </div>
          <div className={`text-xs ${mutedColor}`}>
            {summary.actualTokenCount > 0 ? (
              <span className="text-green-400">{summary.actualTokenCount} actual</span>
            ) : null}
            {summary.estimatedTokenCount > 0 && summary.actualTokenCount > 0 && ', '}
            {summary.estimatedTokenCount > 0 ? (
              <span className="text-yellow-400">{summary.estimatedTokenCount} estimated</span>
            ) : null}
          </div>
        </div>

        <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${mutedColor}`}>
          <div className="flex items-center gap-1.5">
            <InputIcon />
            <span>In: {summary.totalInputTokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <OutputIcon />
            <span>Out: {summary.totalOutputTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`${bgColor} rounded-lg p-4 ${className}`}>
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textColor}`}>
        <TokenIcon />
        Token Usage Summary
      </h3>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          icon={<TokenIcon />}
          label="Total Tokens"
          value={summary.totalTokens.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<InputIcon />}
          label="Input Tokens"
          value={summary.totalInputTokens.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<OutputIcon />}
          label="Output Tokens"
          value={summary.totalOutputTokens.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<SpeedIcon />}
          label="Avg Speed"
          value={summary.averageOutputSpeed ? `${summary.averageOutputSpeed.toFixed(1)} tok/s` : 'N/A'}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Secondary stats */}
      <div className={`text-xs ${mutedColor} space-y-1.5`}>
        <div className="flex items-center justify-between">
          <span>Messages</span>
          <span>{summary.userMessageCount} user, {summary.assistantMessageCount} assistant</span>
        </div>

        <div className="flex items-center justify-between">
          <span>Token accuracy</span>
          <span>
            {summary.actualTokenCount > 0 && (
              <span className="text-green-400">{summary.actualTokenCount} actual</span>
            )}
            {summary.actualTokenCount > 0 && summary.estimatedTokenCount > 0 && ', '}
            {summary.estimatedTokenCount > 0 && (
              <span className="text-yellow-400">{summary.estimatedTokenCount} estimated</span>
            )}
          </span>
        </div>

        {summary.averageTokensPerMessage > 0 && (
          <div className="flex items-center justify-between">
            <span>Avg per message</span>
            <span>{summary.averageTokensPerMessage.toLocaleString()} tokens</span>
          </div>
        )}

        {/* Feature-specific stats */}
        {summary.ragContextTokens > 0 && (
          <div className="flex items-center justify-between text-blue-400">
            <span className="flex items-center gap-1.5">
              <RagIcon />
              RAG Context
            </span>
            <span>{summary.ragContextTokens.toLocaleString()} ({summary.ragChunksCount} chunks)</span>
          </div>
        )}

        {summary.cacheSavings > 0 && (
          <div className="flex items-center justify-between text-green-400">
            <span className="flex items-center gap-1.5">
              <CacheIcon />
              Cache Savings
            </span>
            <span>{summary.cacheSavings}% ({summary.cacheReadTokens.toLocaleString()} tokens)</span>
          </div>
        )}

        {summary.toolTokens > 0 && (
          <div className="flex items-center justify-between text-orange-400">
            <span className="flex items-center gap-1.5">
              <ToolIcon />
              Tool Usage
            </span>
            <span>{summary.toolTokens.toLocaleString()} ({summary.toolCallCount} calls)</span>
          </div>
        )}

        {summary.reasoningTokens > 0 && (
          <div className="flex items-center justify-between text-cyan-400">
            <span>Reasoning Tokens</span>
            <span>{summary.reasoningTokens.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isDarkMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isDarkMode: boolean;
}) {
  const bgColor = isDarkMode ? 'bg-white/5' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${bgColor} rounded-lg p-2.5`}>
      <div className={`flex items-center gap-1.5 ${mutedColor} text-xs mb-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`font-semibold text-sm ${textColor}`}>{value}</div>
    </div>
  );
}

