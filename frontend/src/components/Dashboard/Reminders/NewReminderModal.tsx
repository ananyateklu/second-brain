import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useReminders } from '../../../contexts/remindersContextUtils';
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
        linkedItems: [],
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
      
      <div className="relative w-full max-w-2xl bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                Create New Reminder
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
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
                label=""
                type="text"
                icon={Type}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter reminder title"
                error={error}
                disabled={isLoading}
                className="!bg-[var(--color-background)]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
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
                rows={3}
                className="w-full min-h-[46px] px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none"
                placeholder="Add a description"
              />
            </div>

            {/* Due Date and Time & Repeat Interval */}
            <div className="grid grid-cols-2 gap-6">
              {/* Due Date and Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Due Date & Time
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dueDateTime}
                    onChange={(e) => setDueDateTime(e.target.value)}
                    className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] appearance-none"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Repeat Interval */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Repeat Interval
                </label>
                <select
                  value={repeatInterval || ''}
                  onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval | undefined)}
                  className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] appearance-none"
                >
                  <option value="">No Repeat</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0.5 hover:text-[var(--color-accent)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  label=""
                  type="text"
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
                  className="!bg-[var(--color-background)]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || isLoading}
                  className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
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
          </div>
        </form>
      </div>
    </div>
  );
}