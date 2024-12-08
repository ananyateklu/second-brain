import { useState } from 'react';
import { Calendar, Tag as TagIcon, Clock, AlertCircle, CheckSquare, Square, Bell, Type, Lightbulb } from 'lucide-react';
import { Reminder, useReminders } from '../../../contexts/remindersContextUtils';
import { EditReminderModal } from './EditReminderModal/index';
import { useTheme } from '../../../contexts/themeContextUtils';

interface ReminderCardProps {
  reminder: Reminder;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: (reminder: Reminder) => void;
}

export function ReminderCard({
  reminder,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick
}: ReminderCardProps) {
  const { theme } = useTheme();
  const { snoozeReminder, toggleReminderCompletion } = useReminders();
  const [showEditModal, setShowEditModal] = useState(false);

  const isOverdue = new Date(reminder.dueDateTime) < new Date() && !reminder.isSnoozed && !reminder.isCompleted;

  const handleSnooze = (duration: number) => {
    const until = new Date(Date.now() + duration);
    snoozeReminder(reminder.id, until.toISOString());
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    } else if (onClick) {
      onClick(reminder);
    } else if (context === 'default') {
      setShowEditModal(true);
    }
  };

  // Calculate visible and remaining items
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const allItems = [
    ...(reminder.tags || []).map(tag => ({ type: 'tag', id: tag, title: tag })),
    ...(reminder.linkedItems || [])
  ];
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = Math.max(0, allItems.length - MAX_VISIBLE_ITEMS);

  const getItemColorClasses = (type: string) => {
    const isDark = theme === 'dark' || theme === 'midnight';
    if (type === 'tag') return isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600';
    if (type === 'idea') return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
    return isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600';
  };

  const getItemIcon = (type: string) => {
    if (type === 'tag') return <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />;
    if (type === 'idea') return <Lightbulb className="w-2.5 h-2.5 flex-shrink-0" />;
    return <Type className="w-2.5 h-2.5 flex-shrink-0" />;
  };

  const renderCheckbox = () => {
    const getCheckboxIcon = () => {
      if (context !== 'default') return <Bell className="w-3.5 h-3.5" />;
      return reminder.isCompleted ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />;
    };

    const isDark = theme === 'dark' || theme === 'midnight';
    const colorVariants = {
      dark: {
        completed: 'bg-green-900/30 text-green-400',
        pending: 'bg-purple-900/30 text-purple-400'
      },
      light: {
        completed: 'bg-green-100 text-green-600',
        pending: 'bg-purple-100 text-purple-600'
      }
    };

    const themeMode = isDark ? 'dark' : 'light';
    const status = reminder.isCompleted ? 'completed' : 'pending';
    const colorClasses = colorVariants[themeMode][status];

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (context === 'default') {
            toggleReminderCompletion(reminder.id);
          }
        }}
        className={`flex-shrink-0 p-1.5 rounded transition-colors ${colorClasses}`}
      >
        {getCheckboxIcon()}
      </button>
    );
  };

  const renderStatusBadges = () => {
    const isDark = theme === 'dark' || theme === 'midnight';
    return (
      (isOverdue || reminder.isSnoozed) && (
        <div className="flex items-center gap-1">
          {isOverdue && (
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'} whitespace-nowrap`}>
              <AlertCircle className="w-3 h-3" />
              Overdue
            </span>
          )}
          {reminder.isSnoozed && (
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} whitespace-nowrap`}>
              <Clock className="w-3 h-3" />
              Snoozed
            </span>
          )}
        </div>
      )
    );
  };

  const renderSnoozeButtons = () => (
    !reminder.isSnoozed && !reminder.isCompleted && context === 'default' && (
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSnooze(5 * 60 * 1000);
          }}
          className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
        >
          5m
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSnooze(60 * 60 * 1000);
          }}
          className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
        >
          1h
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSnooze(24 * 60 * 60 * 1000);
          }}
          className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
        >
          1d
        </button>
      </div>
    )
  );

  const renderTags = () => (
    allItems.length > 0 && (
      <div className={`
        flex flex-wrap gap-1
        ${viewMode === 'list' ? 'items-center' : 'items-start'}
        max-h-[44px] min-h-[20px] overflow-hidden
      `}>
        {visibleItems.map(item => (
          <span
            key={item.id}
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
              ${getItemColorClasses(item.type)}
            `}
          >
            {getItemIcon(item.type)}
            <span className="truncate max-w-[120px]">{item.title}</span>
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-secondary)] text-[var(--color-textSecondary)] whitespace-nowrap">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  );

  const renderMetadata = () => (
    <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
      <div className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        <span className="whitespace-nowrap">
          {new Date(reminder.dueDateTime).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short'
          })}
        </span>
      </div>
      {reminder.repeatInterval && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className="capitalize whitespace-nowrap">{reminder.repeatInterval}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        onClick={handleClick}
        className={`
          relative group
          w-full
          ${onSelect || onClick ? 'cursor-pointer' : ''}
          ${reminder.isCompleted ? 'opacity-85' : ''}
          bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]
          border border-[var(--color-border)]
          hover:border-purple-400/50
          rounded-lg
          transition-all duration-200
          overflow-hidden
          ${isSelected ? 'ring-2 ring-purple-400/50' : ''}
          ${viewMode === 'list' ? 'h-[84px]' : 'h-[156px]'}
        `}
      >
        {viewMode === 'list' ? (
          // List View Layout
          <div className="px-3 py-2.5 h-full flex items-center gap-3">
            {renderCheckbox()}
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div className="min-w-[200px] max-w-[300px]">
                <h3 className={`text-sm font-medium text-[var(--color-text)] truncate ${reminder.isCompleted ? 'line-through text-[var(--color-textSecondary)]' : ''}`}>
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className={`text-xs text-[var(--color-textSecondary)] truncate ${reminder.isCompleted ? 'line-through opacity-75' : ''}`}>
                    {reminder.description}
                  </p>
                )}
              </div>
              <div className="min-w-[180px]">
                {renderMetadata()}
              </div>
              <div className="flex-1 min-w-0">
                {renderTags()}
              </div>
              {renderStatusBadges()}
              {renderSnoozeButtons()}
            </div>
          </div>
        ) : (
          // Grid View Layout
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-start gap-2 mb-2">
              {renderCheckbox()}
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium text-[var(--color-text)] truncate ${reminder.isCompleted ? 'line-through text-[var(--color-textSecondary)]' : ''}`}>
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className={`mt-0.5 text-xs text-[var(--color-textSecondary)] line-clamp-2 ${reminder.isCompleted ? 'line-through opacity-75' : ''}`}>
                    {reminder.description}
                  </p>
                )}
              </div>
              {renderStatusBadges()}
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div className="min-h-[44px] mb-3">
                {renderTags()}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-700/30">
                {renderMetadata()}
              </div>
            </div>
          </div>
        )}
      </div>

      <EditReminderModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        reminder={reminder}
      />
    </>
  );
}