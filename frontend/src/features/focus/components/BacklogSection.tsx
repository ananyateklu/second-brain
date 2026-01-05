/**
 * Backlog Section Component
 * Priority-grouped backlog with filtering and scheduling
 */

import { memo, useCallback, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, Inbox, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useBoundStore } from '@/store/bound-store';
import { PriorityBadge } from './PriorityBadge';
import { PRIORITY_INFO, type FocusItem, type FocusPriority } from '../types';

export interface BacklogSectionProps {
  /** Backlog items */
  items: FocusItem[];
  /** Count of items by priority */
  countByPriority: Record<number, number>;
  /** Called when item is scheduled for today */
  onSchedule: (id: string) => void;
  /** Called when item is deleted */
  onDelete: (id: string) => void;
  /** Whether the section is collapsed */
  isCollapsed?: boolean;
  /** Toggle collapse state */
  onToggleCollapse?: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface BacklogItemProps {
  item: FocusItem;
  onSchedule: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

const BacklogItem = memo(function BacklogItem({
  item,
  onSchedule,
  onDelete,
  disabled = false,
}: BacklogItemProps) {
  const handleSchedule = useCallback(() => {
    onSchedule(item.id);
  }, [item.id, onSchedule]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-1.5 px-3 rounded-lg',
        'transition-all duration-150',
        'hover:bg-[color-mix(in_srgb,var(--text-primary)_3%,transparent)]',
        'hover:-translate-y-px',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {/* Priority badge */}
      <PriorityBadge priority={item.priority} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.title}
        </p>
        {item.description && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {item.description}
          </p>
        )}
      </div>

      {/* Actions - collapses when not hovered */}
      <div className="w-0 group-hover:w-auto overflow-hidden transition-all duration-150 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSchedule}
            disabled={disabled}
            className="h-7 px-2 text-xs gap-1"
            title="Add to today"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={disabled}
            className="h-7 w-7 hover:text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

/**
 * Priority filter tabs for the backlog
 */
const PriorityFilters = memo(function PriorityFilters({
  countByPriority,
  selectedPriority,
  onSelectPriority,
}: {
  countByPriority: Record<number, number>;
  selectedPriority: FocusPriority | null;
  onSelectPriority: (priority: FocusPriority | null) => void;
}) {
  const totalCount = Object.values(countByPriority).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onSelectPriority(null)}
        className={cn(
          'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
          selectedPriority === null
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
        style={{
          backgroundColor: selectedPriority === null
            ? 'color-mix(in srgb, var(--text-primary) 4%, transparent)'
            : 'transparent',
        }}
      >
        All ({totalCount})
      </button>
      {([1, 2, 3] as FocusPriority[]).map((priority) => {
        const info = PRIORITY_INFO[priority];
        const count = countByPriority[priority] || 0;
        const isSelected = selectedPriority === priority;

        return (
          <button
            key={priority}
            type="button"
            onClick={() => onSelectPriority(priority)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              isSelected
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            style={{
              backgroundColor: isSelected ? info.bgColor : undefined,
            }}
          >
            {info.shortLabel} ({count})
          </button>
        );
      })}
    </div>
  );
});

/**
 * Collapsible backlog section with priority filtering.
 * Uses Zustand state for selected priority filter.
 */
export const BacklogSection = memo(function BacklogSection({
  items,
  countByPriority,
  onSchedule,
  onDelete,
  isCollapsed = false,
  onToggleCollapse,
  disabled = false,
  className,
}: BacklogSectionProps) {
  // Get filter state from store
  const selectedBacklogPriority = useBoundStore(
    (state) => state.selectedBacklogPriority
  );
  const setSelectedBacklogPriority = useBoundStore(
    (state) => state.setSelectedBacklogPriority
  );

  // Filter items based on selected priority
  const filteredItems = useMemo(() => {
    if (selectedBacklogPriority === null) {
      return items;
    }
    return items.filter((item) => item.priority === selectedBacklogPriority);
  }, [items, selectedBacklogPriority]);

  // Group by priority for display
  const groupedItems = useMemo(() => {
    if (selectedBacklogPriority !== null) {
      // If filtering, don't group
      return { filtered: filteredItems };
    }

    // Group by priority
    return filteredItems.reduce(
      (acc, item) => {
        const key = `p${item.priority}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, FocusItem[]>
    );
  }, [filteredItems, selectedBacklogPriority]);

  const handleToggle = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  const totalCount = Object.values(countByPriority).reduce((a, b) => a + b, 0);

  return (
    <div
      className={cn(
        'rounded-2xl border flex flex-col',
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
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between flex-shrink-0',
          !isCollapsed && 'border-b'
        )}
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Inbox
              className="h-4 w-4"
              style={{ color: 'var(--text-secondary)' }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Backlog
            </h3>
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              {totalCount}
            </span>
          </div>
        </div>

        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-7 w-7"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Filters */}
          <div
            className="px-4 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
          >
            <PriorityFilters
              countByPriority={countByPriority}
              selectedPriority={selectedBacklogPriority}
              onSelectPriority={setSelectedBacklogPriority}
            />
          </div>

          {/* Items - scrollable within flex container */}
          <div className="px-2 py-2 flex-1 overflow-y-auto thin-scrollbar min-h-0">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center">
                <Inbox
                  className="h-8 w-8 mx-auto mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {selectedBacklogPriority !== null
                    ? `No ${PRIORITY_INFO[selectedBacklogPriority].shortLabel} items in backlog`
                    : 'Backlog is empty'}
                </p>
              </div>
            ) : selectedBacklogPriority !== null ? (
              // Flat list when filtering
              filteredItems.map((item) => (
                <BacklogItem
                  key={item.id}
                  item={item}
                  onSchedule={onSchedule}
                  onDelete={onDelete}
                  disabled={disabled}
                />
              ))
            ) : (
              // Grouped by priority when showing all
              Object.entries(groupedItems).map(([key, groupItems]) => {
                if (!Array.isArray(groupItems) || groupItems.length === 0) {
                  return null;
                }
                const priority = parseInt(key.replace('p', ''), 10) as FocusPriority;
                const info = PRIORITY_INFO[priority];

                return (
                  <div key={key} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: info.color }}
                      >
                        {info.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        ({groupItems.length})
                      </span>
                    </div>
                    {groupItems.map((item) => (
                      <BacklogItem
                        key={item.id}
                        item={item}
                        onSchedule={onSchedule}
                        onDelete={onDelete}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
});
