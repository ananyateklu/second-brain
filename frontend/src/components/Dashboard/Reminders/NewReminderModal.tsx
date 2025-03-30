import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Calendar, Loader, AlignLeft } from 'lucide-react';
import { Input } from '../../shared/Input';
import { TextArea } from '../../shared/TextArea';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RepeatInterval = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

export function NewReminderModal({ isOpen, onClose }: NewReminderModalProps) {
  const { colors } = useTheme();
  const { addReminder } = useReminders();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval | undefined>();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Reminder']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const taskColor = colors.task;

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (tagToRemove !== 'Reminder') { // Prevent removing the 'Reminder' tag
      setTags(tags.filter(tag => tag !== tagToRemove));
    }
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
      addReminder({
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div
          style={{ borderColor: colors.border }}
          className="flex items-center justify-between p-4 border-b"
        >
          <h2
            style={{ color: colors.text }}
            className="text-xl font-semibold"
          >
            Create New Reminder
          </h2>
          <button
            onClick={onClose}
            style={{
              color: colors.textSecondary,
              '--hover-color': colors.text
            } as React.CSSProperties}
            className="p-1 rounded-md transition-colors hover:text-[--hover-color] hover:bg-black/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              {/* Title Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                  label="Title"
                  icon={Type}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter reminder title"
                  error={error}
                  disabled={isLoading}
                  required
                  requiredIndicatorColor={taskColor}
                />
              </div>

              {/* Description Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                <TextArea
                  id="reminder-description"
                  name="description"
                  label="Description"
                  icon={AlignLeft}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description"
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              {/* Due Date and Repeat Interval */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    id="reminder-due-date"
                    name="dueDateTime"
                    type="datetime-local"
                    label="Due Date & Time"
                    icon={Calendar}
                    value={dueDateTime}
                    onChange={(e) => setDueDateTime(e.target.value)}
                    error={!dueDateTime ? 'Due date and time is required' : ''}
                    disabled={isLoading}
                    required
                    requiredIndicatorColor={taskColor}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    Repeat Interval
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setRepeatInterval(interval)}
                        disabled={isLoading}
                        style={{
                          backgroundColor: repeatInterval === interval ? `${colors.accent}20` : colors.surface,
                          color: repeatInterval === interval ? colors.accent : colors.textSecondary,
                          borderColor: colors.border,
                          '--hover-bg': colors.surfaceHover,
                        } as React.CSSProperties}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--hover-bg]"
                      >
                        {interval}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRepeatInterval(undefined)}
                      disabled={isLoading}
                      style={{
                        backgroundColor: !repeatInterval ? `${colors.accent}20` : colors.surface,
                        color: !repeatInterval ? colors.accent : colors.textSecondary,
                        borderColor: colors.border,
                        '--hover-bg': colors.surfaceHover,
                      } as React.CSSProperties}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--hover-bg]"
                    >
                      No Repeat
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                      style={{
                        backgroundColor: '#a855f733',
                        color: '#a855f7',
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                    >
                      {tag}
                      {tag !== 'Reminder' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{ '--hover-color': '#a855f7' } as React.CSSProperties}
                          className="p-0.5 transition-colors hover:text-[--hover-color]"
                          aria-label={`Remove ${tag} tag`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
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
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.textSecondary,
                      borderColor: colors.border,
                      '--hover-bg': colors.surfaceHover,
                    } as React.CSSProperties}
                    className="px-4 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[--hover-bg]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  color: colors.textSecondary,
                  borderColor: colors.border,
                  '--hover-bg': colors.surfaceHover,
                } as React.CSSProperties}
                className="px-4 py-2 rounded-lg border transition-colors hover:bg-[--hover-bg]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !title.trim() || !dueDateTime}
                style={{
                  backgroundColor: colors.accent,
                  color: colors.text,
                  '--hover-bg': `${colors.accent}cc`,
                } as React.CSSProperties}
                className="px-4 py-2 rounded-lg font-medium transition-colors hover:bg-[--hover-bg] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Reminder'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}