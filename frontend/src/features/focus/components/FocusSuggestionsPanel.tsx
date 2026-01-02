/**
 * Focus Suggestions Panel Component
 * Displays AI-generated focus suggestions with ability to add to today's plan
 * Supports persisted suggestions with delete functionality
 */

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Sparkles, Plus, RefreshCw, ChevronDown, ChevronUp, FileText, Clock, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PriorityBadge } from './PriorityBadge';
import type { PersistedFocusSuggestion } from '../types';

export interface GenerationStats {
  newSuggestionsAdded: number;
  duplicatesSkipped: number;
  context: string;
  generatedAt: string;
}

export interface FocusSuggestionsPanelProps {
  /** List of persisted suggestions */
  suggestions: PersistedFocusSuggestion[];
  /** Whether suggestions are loading */
  isLoading: boolean;
  /** Whether suggestions are being generated */
  isGenerating: boolean;
  /** Error message if suggestions failed to load */
  error?: string | null;
  /** Stats from the last generation (shown after generating) */
  lastGenerationStats?: GenerationStats | null;
  /** Called when a suggestion is added to today's plan */
  onAddSuggestion: (suggestion: PersistedFocusSuggestion) => void;
  /** Called to delete a suggestion */
  onDeleteSuggestion: (suggestionId: string) => void;
  /** Called to generate new suggestions */
  onGenerate: () => void;
  /** Whether add actions are disabled */
  disabled?: boolean;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Panel displaying AI-generated focus suggestions.
 * Collapsible with ability to add suggestions to today's plan.
 */
export const FocusSuggestionsPanel = memo(function FocusSuggestionsPanel({
  suggestions,
  isLoading,
  isGenerating,
  error,
  lastGenerationStats,
  onAddSuggestion,
  onDeleteSuggestion,
  onGenerate,
  disabled = false,
  isDeleting = false,
  className,
}: FocusSuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const showStatsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show stats banner when generation completes (success or failure feedback)
  useEffect(() => {
    if (lastGenerationStats) {
      // Clear any existing timeout
      if (showStatsTimeoutRef.current) {
        clearTimeout(showStatsTimeoutRef.current);
      }
      // Schedule the state update for the next tick to avoid sync setState in effect
      showStatsTimeoutRef.current = setTimeout(() => {
        setShowStats(true);
        // Auto-hide after 8 seconds (longer for important feedback)
        showStatsTimeoutRef.current = setTimeout(() => setShowStats(false), 8000);
      }, 0);
    }
    return () => {
      if (showStatsTimeoutRef.current) {
        clearTimeout(showStatsTimeoutRef.current);
      }
    };
  }, [lastGenerationStats]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleGenerate = useCallback(() => {
    onGenerate();
  }, [onGenerate]);

  const handleAddSuggestion = useCallback(
    (suggestion: PersistedFocusSuggestion) => {
      onAddSuggestion(suggestion);
    },
    [onAddSuggestion]
  );

  const handleDeleteSuggestion = useCallback(
    (suggestionId: string) => {
      onDeleteSuggestion(suggestionId);
    },
    [onDeleteSuggestion]
  );

  const isBusy = isLoading || isGenerating;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 flex flex-col',
        className
      )}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left cursor-pointer',
          'hover:bg-[var(--surface-hover)] transition-colors'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
            }}
          >
            <Sparkles
              className="h-4 w-4"
              style={{ color: 'var(--color-primary)' }}
            />
          </span>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Suggestions
            </h3>
            <p
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {suggestions.length > 0
                ? `${suggestions.length} suggestions based on your notes`
                : 'Get personalized focus suggestions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={isBusy || disabled}
            className="h-8 w-8"
            title="Generate suggestions"
          >
            <RefreshCw className={cn('h-4 w-4', isBusy && 'animate-spin')} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      </div>

      {/* Stats Banner */}
      {showStats && lastGenerationStats && (
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{
            backgroundColor: lastGenerationStats.newSuggestionsAdded > 0
              ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-warning, #f59e0b) 10%, transparent)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="text-xs" style={{
            color: lastGenerationStats.newSuggestionsAdded > 0
              ? 'var(--color-primary)'
              : 'var(--color-warning, #f59e0b)'
          }}>
            {lastGenerationStats.newSuggestionsAdded > 0
              ? `${lastGenerationStats.newSuggestionsAdded} new suggestion${lastGenerationStats.newSuggestionsAdded !== 1 ? 's' : ''} added`
              : lastGenerationStats.duplicatesSkipped > 0
                ? 'No new suggestions (all duplicates)'
                : lastGenerationStats.context || 'No suggestions generated'}
            {lastGenerationStats.duplicatesSkipped > 0 && lastGenerationStats.newSuggestionsAdded > 0 && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                {' '}&middot; {lastGenerationStats.duplicatesSkipped} duplicate{lastGenerationStats.duplicatesSkipped !== 1 ? 's' : ''} skipped
              </span>
            )}
          </span>
          <button
            onClick={() => setShowStats(false)}
            className="p-1 rounded hover:bg-[var(--surface-hover)]"
          >
            <X className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="border-t flex-1 flex flex-col min-h-0 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {/* Loading state */}
          {isLoading && !suggestions.length && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: 'var(--surface-hover)' }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 rounded w-3/4"
                      style={{ backgroundColor: 'var(--surface-hover)' }}
                    />
                    <div
                      className="h-3 rounded w-1/2"
                      style={{ backgroundColor: 'var(--surface-hover)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generating overlay */}
          {isGenerating && suggestions.length > 0 && (
            <div
              className="px-4 py-2 flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              Generating new suggestions...
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div
              className="p-4 text-center"
              style={{ color: 'var(--color-error)' }}
            >
              <p className="text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state - no suggestions yet */}
          {!isLoading && !error && suggestions.length === 0 && (
            <div className="p-6 text-center">
              <Sparkles
                className="h-8 w-8 mx-auto mb-3"
                style={{ color: 'var(--color-primary)' }}
              />
              <p
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Get AI-powered suggestions
              </p>
              <p
                className="text-xs mb-4"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Analyze your notes to find actionable focus items
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerate}
                disabled={disabled || isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Suggestions
              </Button>
            </div>
          )}

          {/* Suggestions list - scrollable, fills remaining space */}
          {!isLoading && !error && suggestions.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
              <div className="divide-y divide-[color:var(--border)]">
                {suggestions.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAdd={handleAddSuggestion}
                    onDelete={handleDeleteSuggestion}
                    disabled={disabled}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================
// Suggestion Item Sub-component
// ============================================

interface SuggestionItemProps {
  suggestion: PersistedFocusSuggestion;
  onAdd: (suggestion: PersistedFocusSuggestion) => void;
  onDelete: (suggestionId: string) => void;
  disabled?: boolean;
  isDeleting?: boolean;
}

const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  onAdd,
  onDelete,
  disabled,
  isDeleting,
}: SuggestionItemProps) {
  const handleAdd = useCallback(() => {
    onAdd(suggestion);
  }, [suggestion, onAdd]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(suggestion.id);
    },
    [suggestion.id, onDelete]
  );

  // Confidence display
  const confidencePercent = Math.round(suggestion.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? 'var(--color-success)'
      : confidencePercent >= 60
        ? 'var(--color-warning)'
        : 'var(--text-tertiary)';

  return (
    <div
      className="group p-4 hover:bg-[var(--surface-hover)] transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="pt-0.5">
          <PriorityBadge priority={suggestion.priority} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {suggestion.title}
          </h4>

          {suggestion.description && (
            <p
              className="text-xs line-clamp-2 mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {suggestion.description}
            </p>
          )}

          {/* Reason */}
          <p
            className="text-xs italic mb-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {suggestion.reason}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3">
            {suggestion.estimatedMinutes && (
              <span
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Clock className="h-3 w-3" />
                ~{suggestion.estimatedMinutes}m
              </span>
            )}

            {suggestion.sourceNoteTitle && (
              <span
                className="inline-flex items-center gap-1 text-xs truncate max-w-[200px]"
                style={{ color: 'var(--text-tertiary)' }}
                title={suggestion.sourceNoteTitle}
              >
                <FileText className="h-3 w-3" />
                {suggestion.sourceNoteTitle}
              </span>
            )}

            <span
              className="text-xs"
              style={{ color: confidenceColor }}
            >
              {confidencePercent}% match
            </span>
          </div>
        </div>

        {/* Action buttons - collapses when not hovered */}
        <div className="w-0 group-hover:w-auto overflow-hidden transition-all duration-150 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={disabled || isDeleting}
              className="h-8 w-8 p-0"
              title="Delete suggestion"
            >
              <Trash2 className="h-4 w-4" style={{ color: 'var(--color-error)' }} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdd}
              disabled={disabled}
              className="h-8 px-3"
              title="Add to today's plan"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
