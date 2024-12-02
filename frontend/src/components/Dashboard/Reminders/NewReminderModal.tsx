import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Calendar, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useReminders } from '../../../contexts/RemindersContext';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define the RepeatInterval type for consistency
type RepeatInterval = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

export function NewReminderModal({ isOpen, onClose }: NewReminderModalProps) {
  const { addReminder } = useReminders();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval | undefined>();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!dueDateTime) {
      setError('Due date and time is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await addReminder({
        title: title.trim(),
        description: description.trim(),
        dueDateTime: new Date(dueDateTime).toISOString(),
        repeatInterval,
        tags,
        isSnoozed: false,
        isCompleted: false,
        isDeleted: false
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating reminder:', error);
      setError('Failed to create reminder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E] dark:border-[#2C2C2E]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Reminder
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="reminder-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <SuggestionButton
                  type="title"
                  itemType="reminder"
                  input={{ content: description }}
                  onSuggestion={(suggestion) => setTitle(suggestion as string)}
                  disabled={isLoading}
                  context={{
                    currentTitle: title,
                    tags,
                    dueDate: dueDateTime
                  }}
                />
              </div>
              <Input
                id="reminder-title"
                name="title"
                type="text"
                label=""
                icon={Type}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter reminder title"
                error={error}
                disabled={isLoading}
                className="bg-[#1C1C1E] dark:bg-[#1C1C1E] border-[#2C2C2E] dark:border-[#2C2C2E]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <SuggestionButton
                  type="content"
                  itemType="reminder"
                  input={{ title }}
                  onSuggestion={(suggestion) => setDescription(suggestion as string)}
                  disabled={isLoading}
                  context={{
                    currentContent: description,
                    tags,
                    dueDate: dueDateTime
                  }}
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#64ab6f]/50 focus:border-transparent transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                  className="bg-[#1C1C1E] dark:bg-[#1C1C1E] border-[#2C2C2E] dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Repeat
                </label>
                <select
                  value={repeatInterval || ''}
                  onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval | undefined)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#64ab6f]/50 focus:border-transparent text-gray-400 transition-colors"
                >
                  <option value="">Don't repeat</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                <SuggestionButton
                  type="tags"
                  itemType="reminder"
                  input={{ title, content: description }}
                  onSuggestion={(suggestion) => setTags(suggestion as string[])}
                  disabled={isLoading}
                  context={{
                    currentTags: tags
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#64ab6f]/20 text-[#64ab6f] rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0.5 hover:text-[#64ab6f]"
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
                  className="bg-[#1C1C1E] dark:bg-[#1C1C1E] border-[#2C2C2E] dark:border-[#2C2C2E]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || isLoading}
                  className="px-4 py-2 bg-[#1C1C1E] text-gray-400 hover:bg-[#2C2C2E] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="px-4 py-2 text-gray-400 hover:bg-[#2C2C2E] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#64ab6f] hover:bg-[#64ab6f]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Reminder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}