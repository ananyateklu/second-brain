import { Reminder } from '../../../contexts/remindersContextUtils';
import { ReminderCard } from './ReminderCard';

interface ReminderListProps {
  reminders: Reminder[];
  viewMode: 'grid' | 'list';
}

export function ReminderList({ reminders, viewMode }: ReminderListProps) {
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
    <div className={`grid gap-3 ${viewMode === 'grid'
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
        : 'grid-cols-1'
      }`}>
      {reminders.map(reminder => (
        <ReminderCard key={reminder.id} reminder={reminder} viewMode={viewMode} />
      ))}
    </div>
  );
}