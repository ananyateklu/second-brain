import { useState, useRef, useEffect } from 'react';
import { ContextUsageState } from '../../types/context-usage';
import { formatTokenCount } from '../../utils/model-context-limits';

export interface ContextUsageIndicatorProps {
  /** Context usage state from useContextUsage hook */
  contextUsage: ContextUsageState;
  /** Whether the indicator is in compact mode */
  compact?: boolean;
  /** Whether currently streaming (shows pulsing animation) */
  isStreaming?: boolean;
}

/**
 * Context Usage Indicator
 * Displays a progress bar showing context window usage with expandable breakdown.
 */
export function ContextUsageIndicator({
  contextUsage,
  compact = false,
  isStreaming = false,
}: ContextUsageIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { breakdown, maxTokens, percentUsed, warningLevel } = contextUsage;

  // Measure button width when expanded
  useEffect(() => {
    if (isExpanded && buttonRef.current) {
      const width = buttonRef.current.offsetWidth;
      setButtonWidth(width);
    }
  }, [isExpanded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Color scheme based on warning level - using theme CSS variables
  const getColors = () => {
    switch (warningLevel) {
      case 'critical':
        return {
          bar: 'var(--color-error)',
          barGlow: 'rgba(239, 68, 68, 0.5)',
          text: 'var(--color-error-text)',
          border: 'var(--color-error-border)',
          bg: 'var(--color-error-light)',
          icon: 'var(--color-error-text)',
        };
      case 'warning':
        return {
          bar: 'var(--color-error-text-light)',
          barGlow: 'rgba(239, 68, 68, 0.4)',
          text: 'var(--color-error-text-light)',
          border: 'var(--color-error-border)',
          bg: 'var(--color-error-light)',
          icon: 'var(--color-error-text-light)',
        };
      default:
        return {
          bar: 'var(--color-brand-500)',
          barGlow: 'rgba(54, 105, 61, 0.5)',
          text: 'var(--color-brand-400)',
          border: 'var(--border)',
          bg: 'var(--color-primary-alpha)',
          icon: 'var(--color-brand-400)',
        };
    }
  };

  const colors = getColors();

  // Icon components for breakdown items
  const SystemPromptIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const MessageHistoryIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  const ToolDefinitionsIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655-5.653a2.548 2.548 0 010-3.586l4.94-4.94a2.548 2.548 0 013.586 0l5.653 4.655a2.548 2.548 0 010 3.586l-4.94 4.94a2.548 2.548 0 01-3.586 0z" />
    </svg>
  );

  const ToolResultsIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  const RagContextIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const CurrentInputIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );

  // Category breakdown items
  const breakdownItems = [
    { label: 'System Prompt', value: breakdown.systemPrompt, icon: SystemPromptIcon },
    { label: 'Message History', value: breakdown.messageHistory, icon: MessageHistoryIcon },
    { label: 'Tool Definitions', value: breakdown.toolDefinitions, icon: ToolDefinitionsIcon },
    { label: 'Tool Results', value: breakdown.toolResults, icon: ToolResultsIcon },
    { label: 'RAG Context', value: breakdown.ragContext, icon: RagContextIcon },
    { label: 'Current Input', value: breakdown.currentInput, icon: CurrentInputIcon },
  ].filter(item => item.value > 0);

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 border backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: isExpanded ? 'var(--surface-elevated)' : 'var(--surface-card)',
          borderColor: colors.border,
          boxShadow: isExpanded ? '0 0 0 2px var(--color-primary-alpha)' : 'none',
        }}
      >
        {/* Token icon */}
        <svg
          className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: colors.icon }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
          />
        </svg>

        {/* Progress bar */}
        <div 
          className="relative w-24 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.min(100, percentUsed)}%`,
              backgroundColor: colors.bar,
              boxShadow: isStreaming ? `0 0 8px ${colors.barGlow}` : 'none',
            }}
          />
          {/* Animated shimmer effect when streaming */}
          {isStreaming && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
          )}
        </div>

        {/* Token count display */}
        {!compact && (
          <div className="flex items-center gap-1.5 text-xs font-medium min-w-[80px]">
            <span style={{ color: colors.text }}>{formatTokenCount(breakdown.total)}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{formatTokenCount(maxTokens)}</span>
          </div>
        )}

        {/* Expand icon */}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded breakdown dropdown */}
      {isExpanded && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            width: buttonWidth ? `${buttonWidth}px` : undefined,
            minWidth: buttonWidth ? `${buttonWidth}px` : undefined,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Context Usage
              </h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: colors.bg,
                  color: colors.text,
                }}
              >
                {percentUsed.toFixed(1)}%
              </span>
            </div>
            
            {/* Full progress bar */}
            <div 
              className="mt-3 relative h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, percentUsed)}%`,
                  backgroundColor: colors.bar,
                }}
              />
            </div>
            
            <div className="flex justify-between mt-2 text-xs">
              <span style={{ color: 'var(--text-tertiary)' }}>
                {formatTokenCount(breakdown.total)} used
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>
                {formatTokenCount(maxTokens - breakdown.total)} available
              </span>
            </div>
          </div>

          {/* Breakdown list */}
          <div className="p-2">
            {breakdownItems.length > 0 ? (
              <div className="space-y-1">
                {breakdownItems.map((item) => {
                  const itemPercent = maxTokens > 0 ? (item.value / maxTokens) * 100 : 0;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: 'var(--color-brand-400)' }}>
                        <item.icon />
                      </div>
                      <span
                        className="flex-1 text-xs font-medium truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Mini progress bar */}
                        <div 
                          className="w-12 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(100, itemPercent * 10)}%`,
                              backgroundColor: colors.bar,
                              opacity: 0.6,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-mono w-12 text-right"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {formatTokenCount(item.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="text-center py-4 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                No context used yet
              </div>
            )}
          </div>

          {/* Footer with warning */}
          {warningLevel !== 'normal' && (
            <div
              className="px-4 py-2 border-t text-xs"
              style={{ 
                borderColor: 'var(--border)',
                backgroundColor: colors.bg,
              }}
            >
              <div className="flex items-center gap-2" style={{ color: colors.text }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  {warningLevel === 'critical'
                    ? 'Context nearly full - consider starting a new chat'
                    : 'Context usage is high'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

