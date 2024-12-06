import { useState } from 'react';
import { Calendar, Tag as TagIcon, Clock, AlertCircle, CheckSquare, Square, Bell, Link2, Type, Lightbulb } from 'lucide-react';
import { Reminder, useReminders } from '../../../contexts/remindersContextUtils';
import { EditReminderModal } from './EditReminderModal/index';
import { formatTimeAgo } from '../Recent/utils';
import { cardBaseStyles, cardContentStyles, cardDescriptionStyles } from '../shared/cardStyles';

interface ReminderCardProps {
  reminder: Reminder;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: () => void;
  contextData?: {
    expiresAt?: string;
    deletedAt?: string;
    archivedAt?: string;
  };
}

export function ReminderCard({ 
  reminder,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick,
  contextData
}: ReminderCardProps) {
  const { snoozeReminder, toggleReminderCompletion } = useReminders();
  const [showEditModal, setShowEditModal] = useState(false);

  const isOverdue = new Date(reminder.dueDateTime) < new Date() && !reminder.isSnoozed && !reminder.isCompleted;

  const handleSnooze = (duration: number) => {
    const until = new Date(Date.now() + duration);
    snoozeReminder(reminder.id, until.toISOString());
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (onClick) {
      onClick();
    } else if (context === 'default') {
      setShowEditModal(true);
    }
  };

  // Calculate days until expiration for trash items
  const getDaysUntilExpiration = () => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`
          ${cardBaseStyles}
          bg-purple-50/5 dark:bg-purple-900/5
          ${isSelected 
            ? 'border-primary-400/50 dark:border-primary-400/50' 
            : 'border-gray-200/30 dark:border-gray-700/30'
          }
          hover:border-primary-400/50 dark:hover:border-primary-400/50
          ${viewMode === 'list' ? 'w-full' : ''}
          ${onSelect || onClick ? 'cursor-pointer' : ''}
          ${reminder.isCompleted ? 'opacity-75' : ''}
        `}
      >
        <div className={cardContentStyles}>
          <div className="flex items-start gap-4">
            {context === 'trash' && onSelect && (
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect()}
                  className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (context === 'default') {
                      toggleReminderCompletion(reminder.id);
                    }
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400"
                >
                  {context === 'default' ? (
                    reminder.isCompleted ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-base font-medium text-gray-900 dark:text-white truncate ${
                      reminder.isCompleted ? 'line-through' : ''
                    }`}>
                      {reminder.title}
                    </h3>
                    {context === 'trash' && getDaysUntilExpiration() !== null && (
                      <span className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                        {getDaysUntilExpiration()}d left
                      </span>
                    )}
                  </div>
                  {context === 'trash' && contextData?.deletedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Deleted {formatTimeAgo(contextData.deletedAt)}
                    </p>
                  )}
                  {context === 'archive' && contextData?.archivedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Archived {formatTimeAgo(contextData.archivedAt)}
                    </p>
                  )}
                </div>

                {isOverdue && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Overdue
                  </span>
                )}

                {/* Snooze Buttons */}
                {!reminder.isSnoozed && !reminder.isCompleted && context === 'default' && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnooze(5 * 60 * 1000);
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      5m
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnooze(60 * 60 * 1000);
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      1h
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnooze(24 * 60 * 60 * 1000);
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      1d
                    </button>
                  </div>
                )}
              </div>

              {reminder.description ? (
                <p className={`${cardDescriptionStyles} ${
                  reminder.isCompleted ? 'line-through' : ''
                }`}>
                  {reminder.description}
                </p>
              ) : (
                <p className={`${cardDescriptionStyles} italic opacity-50`}>
                  No description
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(reminder.dueDateTime).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>

                {reminder.repeatInterval && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="capitalize">{reminder.repeatInterval}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {reminder.tags && reminder.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {reminder.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 max-w-full"
                    >
                      <TagIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Linked Items */}
              {reminder.linkedItems && reminder.linkedItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Link2 className="w-4 h-4" />
                    <span>Linked Items:</span>
                  </div>
                  {reminder.linkedItems.map(item => (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium max-w-full ${
                        item.type === 'idea'
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {item.type === 'idea' ? (
                        <Lightbulb className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <Type className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditReminderModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        reminder={reminder}
      />
    </>
  );
}