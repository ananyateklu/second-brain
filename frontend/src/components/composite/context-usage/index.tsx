/**
 * Context Usage Indicator
 * Displays a progress bar showing context window usage with expandable breakdown.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTokenCount } from '../../../utils/model-context-limits';
import { ContextBreakdownItem } from './ContextBreakdownItem';
import { ContextProgressBar } from './ContextProgressBar';
import {
  SystemPromptIcon,
  MessageHistoryIcon,
  ToolDefinitionsIcon,
  ToolResultsIcon,
  RagContextIcon,
  CurrentInputIcon,
  TokenIcon,
  ChevronIcon,
  WarningIcon,
} from './ContextBreakdownIcons';
import type { ContextUsageIndicatorProps, ContextUsageColors, BreakdownItemData } from './types';

/**
 * Get color scheme based on warning level.
 */
function getColors(warningLevel: 'normal' | 'warning' | 'critical'): ContextUsageColors {
  switch (warningLevel) {
    case 'critical':
      return {
        bar: 'var(--color-error)',
        barGlow: 'color-mix(in srgb, var(--color-error) 50%, transparent)',
        text: 'var(--color-error-text)',
        border: 'var(--color-error-border)',
        bg: 'var(--color-error-light)',
        icon: 'var(--color-error-text)',
      };
    case 'warning':
      return {
        bar: 'var(--color-error-text-light)',
        barGlow: 'color-mix(in srgb, var(--color-error) 40%, transparent)',
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
}

/**
 * Context Usage Indicator component.
 * Shows context window usage with expandable breakdown by category.
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
  const colors = getColors(warningLevel);

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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Category breakdown items
  const breakdownItems = useMemo<BreakdownItemData[]>(() => {
    return [
      { label: 'System Prompt', value: breakdown.systemPrompt, icon: SystemPromptIcon },
      { label: 'Message History', value: breakdown.messageHistory, icon: MessageHistoryIcon },
      { label: 'Tool Definitions', value: breakdown.toolDefinitions, icon: ToolDefinitionsIcon },
      { label: 'Tool Results', value: breakdown.toolResults, icon: ToolResultsIcon },
      { label: 'RAG Context', value: breakdown.ragContext, icon: RagContextIcon },
      { label: 'Current Input', value: breakdown.currentInput, icon: CurrentInputIcon },
    ].filter(item => item.value > 0);
  }, [breakdown]);

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl',
          'transition-all duration-300 border backdrop-blur-sm',
          'hover:scale-[1.02] active:scale-[0.98]'
        )}
        style={{
          backgroundColor: isExpanded ? 'var(--surface-elevated)' : 'var(--surface-card)',
          borderColor: colors.border,
          boxShadow: isExpanded ? '0 0 0 2px var(--color-primary-alpha)' : 'none',
        }}
      >
        {/* Token icon */}
        <div style={{ color: colors.icon }}>
          <TokenIcon
            className={cn('w-4 h-4', isStreaming && 'animate-pulse')}
          />
        </div>

        {/* Progress bar */}
        <ContextProgressBar
          percentUsed={percentUsed}
          colors={colors}
          isStreaming={isStreaming}
          showShimmer
          className="w-24"
        />

        {/* Token count display */}
        {!compact && (
          <div className="flex items-center gap-1.5 text-xs font-medium min-w-[80px]">
            <span style={{ color: colors.text }}>{formatTokenCount(breakdown.total)}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{formatTokenCount(maxTokens)}</span>
          </div>
        )}

        {/* Expand icon */}
        <ChevronIcon
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Expanded breakdown dropdown */}
      {isExpanded && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'rounded-xl border shadow-2xl overflow-hidden',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
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
            <ContextProgressBar
              percentUsed={percentUsed}
              colors={colors}
              variant="medium"
              className="mt-3"
            />

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
                {breakdownItems.map((item) => (
                  <ContextBreakdownItem
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    maxTokens={maxTokens}
                    icon={item.icon}
                    colors={colors}
                  />
                ))}
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
                <WarningIcon className="w-4 h-4" />
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

// Re-export types and sub-components for external use
export type * from './types';
export { ContextBreakdownItem } from './ContextBreakdownItem';
export { ContextProgressBar } from './ContextProgressBar';
export * from './ContextBreakdownIcons';
