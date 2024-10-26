import React from 'react';
import { Reminder } from '../../../contexts/RemindersContext';
import { ReminderCard } from './ReminderCard';

interface ReminderListProps {
  reminders: Reminder[];
}

export function ReminderList({ reminders }: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No reminders found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {reminders.map(reminder => (
        <ReminderCard key={reminder.id} reminder={reminder} />
      ))}
    </div>
  );
}