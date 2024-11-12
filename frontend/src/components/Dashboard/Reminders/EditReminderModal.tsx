import React, { useState, useEffect } from 'react';
import { X, Type, Tag as TagIcon, Calendar, Link2, Plus, Loader, Save, Trash2 } from 'lucide-react';
import { Input } from '../../shared/Input';
import { Reminder, useReminders } from '../../../contexts/RemindersContext';

interface EditReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder;
}

export function EditReminderModal({ isOpen, onClose, reminder }: EditReminderModalProps) {
  const { updateReminder, deleteReminder } = useReminders();
  const [title, setTitle] = useState(reminder?.title || '');
  const [description, setDescription] = useState(reminder?.description || '');
  const [dueDateTime, setDueDateTime] = useState(() => {
    if (reminder?.dueDateTime) {
      const date = new Date(reminder.dueDateTime);
      return !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '';
    }
    return '';
  });
  const [repeatInterval, setRepeatInterval] = useState(reminder?.repeatInterval || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(reminder?.tags || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      if (reminder.dueDateTime) {
        const date = new Date(reminder.dueDateTime);
        setDueDateTime(!isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '');
      }
      setRepeatInterval(reminder.repeatInterval || '');
      setTags(reminder.tags || []);
      setError('');
    }
  }, [reminder]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteReminder(reminder.id);
        onClose();
      } catch (error) {
        setError('Failed to delete reminder');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await updateReminder(reminder.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDateTime ? new Date(dueDateTime).toISOString() : null,
        repeatInterval: repeatInterval || null,
        tags
      });
      onClose();
    } catch (error) {
      setError('Failed to update reminder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Reminder
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete reminder"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <Input
              id="reminder-title"
              name="title"
              type="text"
              label="Title"
              icon={Type}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter reminder title"
              error={error}
              disabled={isLoading}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 glass-morphism border border-gray-100/20 dark:border-white/5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="due-date-time"
                  name="dueDateTime"
                  type="datetime-local"
                  label="Due Date & Time"
                  icon={Calendar}
                  value={dueDateTime}
                  onChange={(e) => setDueDateTime(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Repeat
                </label>
                <select
                  value={repeatInterval || ''}
                  onChange={(e) => setRepeatInterval(e.target.value as typeof repeatInterval)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 glass-morphism border border-gray-100/20 dark:border-white/5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
                >
                  <option value="">Don't repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0.5 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="tag-input"
                  name="tag"
                  type="text"
                  label=""
                  icon={TagIcon}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || isLoading}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}