import { useState, useEffect } from 'react';
import { Reminder } from '../../../../api/types/reminder';

interface MainContentProps {
  reminder: Reminder;
  onUpdate: (updates: Partial<Reminder>) => void;
}

export function MainContent({ reminder, onUpdate }: MainContentProps) {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [dueDateTime, setDueDateTime] = useState(reminder.dueDateTime);
  const [repeatInterval, setRepeatInterval] = useState(reminder.repeatInterval);
  const [customRepeatPattern, setCustomRepeatPattern] = useState(reminder.customRepeatPattern || '');

  useEffect(() => {
    setTitle(reminder.title);
    setDescription(reminder.description || '');
    setDueDateTime(reminder.dueDateTime);
    setRepeatInterval(reminder.repeatInterval);
    setCustomRepeatPattern(reminder.customRepeatPattern || '');
  }, [reminder]);

  const handleUpdate = () => {
    onUpdate({
      title,
      description: description || undefined,
      dueDateTime,
      repeatInterval,
      customRepeatPattern: customRepeatPattern || undefined
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            handleUpdate();
          }}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            handleUpdate();
          }}
          rows={4}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Due Date and Time */}
      <div className="space-y-2">
        <label htmlFor="dueDateTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Due Date and Time
        </label>
        <input
          type="datetime-local"
          id="dueDateTime"
          value={dueDateTime}
          onChange={(e) => {
            setDueDateTime(e.target.value);
            handleUpdate();
          }}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Repeat Interval */}
      <div className="space-y-2">
        <label htmlFor="repeatInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Repeat Interval
        </label>
        <select
          id="repeatInterval"
          value={repeatInterval || ''}
          onChange={(e) => {
            setRepeatInterval(e.target.value as Reminder['repeatInterval']);
            handleUpdate();
          }}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">No Repeat</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      {/* Custom Repeat Pattern */}
      {repeatInterval === 'Custom' && (
        <div className="space-y-2">
          <label htmlFor="customRepeatPattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Repeat Pattern
          </label>
          <input
            type="text"
            id="customRepeatPattern"
            value={customRepeatPattern}
            onChange={(e) => {
              setCustomRepeatPattern(e.target.value);
              handleUpdate();
            }}
            placeholder="e.g., Every 2 weeks"
            className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1C1C1E] border-none rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
} 