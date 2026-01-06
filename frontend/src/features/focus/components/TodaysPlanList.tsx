/**
 * Today's Plan List Component
 * Checklist of today's scheduled focus items with progress indicator
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { Clock, CheckCircle2, Circle, Target, GripVertical, X, ChevronDown, ChevronUp, History } from 'lucide-react';
import { format, isToday as isTodayFn, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { PriorityBadge } from './PriorityBadge';
import { parseLocalDate } from '@/utils/date-utils';
import type { FocusItem } from '../types';

export interface TodaysPlanListProps {
  /** List of today's scheduled items */
  items: FocusItem[];
  /** Called when item is completed/uncompleted */
  onComplete: (id: string, completed: boolean) => void;
  /** Called when item is set as current focus */
  onSetFocus: (id: string) => void;
  /** Called when item is removed from today's plan (sent to backlog) */
  onRemove?: (id: string) => void;
  /** Called when items are reordered */
  onReorder?: (items: Array<{ id: string; sortOrder: number }>) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Selected date in YYYY-MM-DD format (null = today) */
  selectedDate?: string | null;
}

interface PlanItemProps {
  item: FocusItem;
  onComplete: (id: string, completed: boolean) => void;
  onSetFocus: (id: string) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  showDragHandle?: boolean;
}

const PlanItem = memo(function PlanItem({
  item,
  onComplete,
  onSetFocus,
  onRemove,
  disabled = false,
  showDragHandle = false,
}: PlanItemProps) {
  const isCompleted = item.status === 'completed';

  const handleCheckChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        onComplete(item.id, checked);
      }
    },
    [item.id, onComplete]
  );

  const handleFocusClick = useCallback(() => {
    if (!isCompleted && !item.isCurrentFocus) {
      onSetFocus(item.id);
    }
  }, [item.id, item.isCurrentFocus, isCompleted, onSetFocus]);

  const handleRemove = useCallback(() => {
    onRemove?.(item.id);
  }, [item.id, onRemove]);

  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg',
        'transition-all duration-150',
        'hover:bg-[color-mix(in_srgb,var(--text-primary)_3%,transparent)]',
        isCompleted && 'opacity-60',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {/* Drag handle (for future drag-and-drop) */}
      {showDragHandle && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleCheckChange}
        disabled={disabled}
        aria-label={`Mark "${item.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
      />

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={handleFocusClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleFocusClick();
          }
        }}
        aria-label={`Set "${item.title}" as current focus`}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              isCompleted && 'line-through'
            )}
            style={{ color: 'var(--text-primary)' }}
          >
            {item.title}
          </span>
          <PriorityBadge priority={item.priority} />
          {item.isCurrentFocus && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase"
              style={{ color: 'var(--color-primary)' }}
            >
              <Target className="h-2.5 w-2.5" />
              Focus
            </span>
          )}
        </div>
      </div>

      {/* Time estimate */}
      {item.estimatedMinutes && (
        <span
          className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Clock className="h-3 w-3" />
          {item.estimatedMinutes}m
        </span>
      )}

      {/* Remove button - collapses when not hovered */}
      {onRemove && (
        <div className="w-0 group-hover:w-7 overflow-hidden transition-all duration-150 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="h-7 w-7 hover:text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
            title="Remove from today"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
});

/**
 * Checklist display of today's scheduled focus items.
 * Shows progress indicator and supports completion/focus setting.
 */
export const TodaysPlanList = memo(function TodaysPlanList({
  items,
  onComplete,
  onSetFocus,
  onRemove,
  onReorder,
  disabled = false,
  className,
  selectedDate,
}: TodaysPlanListProps) {
  // Collapse state for completed items (open by default)
  const [showCompleted, setShowCompleted] = useState(true);

  // Determine if viewing today or a past date
  const { isViewingToday, headerTitle } = useMemo(() => {
    if (!selectedDate) {
      return { isViewingToday: true, headerTitle: "Today's Plan" };
    }
    const date = parseLocalDate(selectedDate);
    if (isTodayFn(date)) {
      return { isViewingToday: true, headerTitle: "Today's Plan" };
    }
    // Format the date for display
    const formattedDate = format(date, 'MMM d, yyyy');
    return { isViewingToday: false, headerTitle: formattedDate };
  }, [selectedDate]);

  // Split items into pending and completed
  // For historical dates, only count as "completed" if completedAt is on that same day
  const { pendingItems, completedItems } = useMemo(() => {
    const targetDate = selectedDate ? parseLocalDate(selectedDate) : startOfDay(new Date());

    const wasCompletedOnDate = (item: FocusItem): boolean => {
      if (item.status !== 'completed') return false;
      if (!item.completedAt) return false;
      const completedDate = new Date(item.completedAt);
      return isSameDay(completedDate, targetDate);
    };

    return {
      pendingItems: items.filter((item) => !wasCompletedOnDate(item)),
      completedItems: items.filter((item) => wasCompletedOnDate(item)),
    };
  }, [items, selectedDate]);

  // Calculate progress
  const { completedCount, totalCount, totalEstimatedMinutes } = useMemo(() => {
    const totalMinutes = items.reduce(
      (sum, item) => sum + (item.estimatedMinutes || 0),
      0
    );
    return {
      completedCount: completedItems.length,
      totalCount: items.length,
      totalEstimatedMinutes: totalMinutes,
    };
  }, [items, completedItems.length]);

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleShowCompleted = useCallback(() => {
    setShowCompleted((prev) => !prev);
  }, []);

  // Empty state
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'group rounded-2xl border p-6 text-center h-full flex flex-col items-center justify-center',
          'transition-all duration-200',
          'hover:border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]',
          'hover:shadow-md hover:-translate-y-0.5',
          className
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 transition-all duration-200 group-hover:scale-110"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)',
          }}
        >
          <Circle
            className="h-6 w-6"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
        <h4
          className="text-sm font-medium mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          No items scheduled
        </h4>
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Add items from your backlog or use Quick Add.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group rounded-2xl border flex flex-col h-full',
        'transition-all duration-200',
        'hover:border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]',
        'hover:shadow-md',
        className
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Header with progress */}
      <div
        className="px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {!isViewingToday && (
              <History
                className="h-4 w-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
            )}
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {headerTitle}
            </h3>
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {completedCount} of {totalCount} complete
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                progressPercent === 100
                  ? 'var(--color-success)'
                  : 'var(--color-primary)',
            }}
          />
        </div>

        {/* Total time */}
        {totalEstimatedMinutes > 0 && (
          <div className="flex items-center justify-end mt-2">
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Clock className="h-3 w-3" />
              {totalEstimatedMinutes} min total
            </span>
          </div>
        )}
      </div>

      {/* Items list - scrollable */}
      <div className="px-4 flex-1 overflow-y-auto thin-scrollbar">
        {/* Pending items */}
        {pendingItems.map((item) => (
          <PlanItem
            key={item.id}
            item={item}
            onComplete={onComplete}
            onSetFocus={onSetFocus}
            onRemove={onRemove}
            disabled={disabled}
            showDragHandle={!!onReorder}
          />
        ))}

        {/* Collapsible completed section */}
        {completedItems.length > 0 && (
          <div
            className="mt-2 pt-2 border-t"
            style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
          >
            <button
              type="button"
              onClick={toggleShowCompleted}
              className={cn(
                'flex items-center gap-2 w-full py-1.5 px-2 -mx-2 rounded-lg',
                'transition-all duration-150',
                'hover:bg-[color-mix(in_srgb,var(--text-primary)_3%,transparent)]'
              )}
            >
              {showCompleted ? (
                <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              ) : (
                <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Completed ({completedItems.length})
              </span>
            </button>

            {/* Expanded completed items */}
            {showCompleted && (
              <div className="mt-1">
                {completedItems.map((item) => (
                  <PlanItem
                    key={item.id}
                    item={item}
                    onComplete={onComplete}
                    onSetFocus={onSetFocus}
                    disabled={disabled}
                    showDragHandle={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All complete message */}
      {completedCount === totalCount && totalCount > 0 && (
        <div
          className="px-4 py-3 border-t flex-shrink-0"
          style={{
            borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2
              className="h-4 w-4"
              style={{ color: 'var(--color-success)' }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--color-success)' }}
            >
              All tasks complete! Great work.
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
