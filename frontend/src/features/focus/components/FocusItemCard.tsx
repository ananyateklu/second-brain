/**
 * Focus Item Card Component
 * Individual focus item display with actions
 */

import { memo, useCallback } from 'react';
import { Clock, Pencil, Trash2, Target, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { PriorityBadge } from './PriorityBadge';
import type { FocusItem } from '../types';

export interface FocusItemCardProps {
  /** The focus item to display */
  item: FocusItem;
  /** Called when item is completed/uncompleted */
  onComplete: (id: string, completed: boolean) => void;
  /** Called when item is set as current focus */
  onSetFocus: (id: string) => void;
  /** Called when edit is requested */
  onEdit: (item: FocusItem) => void;
  /** Called when delete is requested */
  onDelete: (id: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card component for displaying a single focus item.
 * Shows title, description preview, priority, time estimate, and actions.
 */
export const FocusItemCard = memo(function FocusItemCard({
  item,
  onComplete,
  onSetFocus,
  onEdit,
  onDelete,
  disabled = false,
  className,
}: FocusItemCardProps) {
  const isCompleted = item.status === 'completed';

  const handleCheckChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
        onComplete(item.id, checked);
      }
    },
    [item.id, onComplete]
  );

  const handleSetFocus = useCallback(() => {
    onSetFocus(item.id);
  }, [item.id, onSetFocus]);

  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isCompleted && 'opacity-60',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: item.isCurrentFocus
          ? 'var(--color-primary)'
          : 'var(--border)',
      }}
    >
      {/* Current focus indicator */}
      {item.isCurrentFocus && (
        <div
          className="absolute inset-0 rounded-xl opacity-5 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, transparent 100%)',
          }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckChange}
            disabled={disabled}
            aria-label={`Mark "${item.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                'font-medium text-sm truncate',
                isCompleted && 'line-through'
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </h4>
            <PriorityBadge priority={item.priority} />
            {item.isCurrentFocus && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                style={{
                  backgroundColor: 'rgba(var(--color-primary-rgb), 0.15)',
                  color: 'var(--color-primary)',
                }}
              >
                <Target className="h-2.5 w-2.5" />
                Focus
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p
              className={cn(
                'text-xs line-clamp-2 mb-2',
                isCompleted && 'line-through'
              )}
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3">
            {/* Time estimate */}
            {item.estimatedMinutes && (
              <span
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Clock className="h-3 w-3" />
                {item.estimatedMinutes}m
              </span>
            )}

            {/* Linked note */}
            {item.linkedNote && (
              <span
                className="text-xs truncate max-w-[150px]"
                style={{ color: 'var(--text-tertiary)' }}
                title={item.linkedNote.title}
              >
                From: {item.linkedNote.title}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!item.isCurrentFocus && !isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetFocus}
              disabled={disabled}
              className="h-7 px-2 text-xs"
              title="Set as current focus"
            >
              <Target className="h-3.5 w-3.5 mr-1" />
              Focus
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={disabled}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-[var(--color-error)]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
