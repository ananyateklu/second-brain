import React, { useState } from 'react';
import { Bell, Calendar, Tag, Clock, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { Reminder, useReminders } from '../../../contexts/RemindersContext';
import { EditReminderModal } from './EditReminderModal';

interface ReminderCardProps {
  reminder: Reminder;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const { snoozeReminder, toggleReminderCompletion } = useReminders();
  const [showEditModal, setShowEditModal] = useState(false);

  const isOverdue = new Date(reminder.dueDateTime) < new Date() && !reminder.isSnoozed && !reminder.isCompleted;
  const isSnoozed = reminder.isSnoozed && reminder.snoozeUntil;

  const handleSnooze = (duration: number) => {
    const until = new Date(Date.now() + duration);
    snoozeReminder(reminder.id, until.toISOString());
  };

  return (
    <>
      <div className={`group relative bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border hover:border-primary-500 dark:hover:border-primary-500 transition-colors ${
        reminder.isCompleted ? 'opacity-75' : ''
      }`}>
        <div className="flex items-start p-4 gap-3">
          {/* Completion Toggle */}
          <button
            onClick={() => toggleReminderCompletion(reminder.id)}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              reminder.isCompleted
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
            }`}
          >
            {reminder.isCompleted ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0" onClick={() => setShowEditModal(true)}>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-medium ${
                reminder.isCompleted
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {reminder.title}
              </h3>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>

            {reminder.description && (
              <p className={`mt-1 text-sm ${
                reminder.isCompleted
                  ? 'text-gray-400 dark:text-gray-500 line-through'
                  : 'text-gray-600 dark:text-gray-400'
              } line-clamp-2`}>
                {reminder.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
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

            {reminder.tags && reminder.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {reminder.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Snooze Buttons */}
          {!reminder.isSnoozed && !reminder.isCompleted && (
            <div className="flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(5 * 60 * 1000);
                }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
              >
                5m
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(60 * 60 * 1000);
                }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
              >
                1h
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSnooze(24 * 60 * 60 * 1000);
                }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
              >
                1d
              </button>
            </div>
          )}
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