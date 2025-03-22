import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Calendar, Loader, AlignLeft } from 'lucide-react';
import { Input } from '../../shared/Input';
import { TextArea } from '../../shared/TextArea';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PriorityLevel = 'low' | 'medium' | 'high';

export function NewTaskModal({ isOpen, onClose }: NewTaskModalProps) {
  const { colors } = useTheme();
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

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
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleTouched(true);

    if (!title.trim() || !dueDate) {
      return;
    }

    setIsLoading(true);

    try {
      addTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        tags
      });

      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (p: PriorityLevel, isSelected: boolean) => {
    if (!isSelected) return `${colors.surface}`;
    if (p === 'high') return '#dc262620';
    if (p === 'medium') return '#fbbf2420';
    return '#22c55e20';
  };

  const getPriorityTextColor = (p: PriorityLevel, isSelected: boolean) => {
    if (!isSelected) return colors.textSecondary;
    if (p === 'high') return '#dc2626';
    if (p === 'medium') return '#fbbf24';
    return '#22c55e';
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
            Create New Task
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
                    itemType="task"
                    input={{ content: description }}
                    onSuggestion={(suggestion) => setTitle(suggestion as string)}
                    disabled={isLoading}
                    context={{
                      currentTitle: title,
                      tags,
                      dueDate,
                      priority
                    }}
                  />
                </div>
                <Input
                  id="task-title"
                  name="title"
                  type="text"
                  label="Title"
                  icon={Type}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTitleTouched(true)}
                  placeholder="Enter task title"
                  error={titleTouched && !title.trim() ? 'Title is required' : ''}
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
                    itemType="task"
                    input={{ title }}
                    onSuggestion={(suggestion) => setDescription(suggestion as string)}
                    disabled={isLoading}
                    context={{
                      currentContent: description,
                      tags,
                      dueDate,
                      priority
                    }}
                  />
                </div>
                <TextArea
                  id="task-description"
                  name="description"
                  label="Description"
                  icon={AlignLeft}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your task..."
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              {/* Due Date and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    id="task-due-date"
                    name="dueDate"
                    type="datetime-local"
                    label="Due Date"
                    icon={Calendar}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    error={!dueDate ? 'Due date is required' : ''}
                    disabled={isLoading}
                    disableRecording
                    required
                    requiredIndicatorColor={taskColor}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        disabled={isLoading}
                        style={{
                          backgroundColor: getPriorityColor(p, priority === p),
                          color: getPriorityTextColor(p, priority === p),
                          borderColor: colors.border,
                          '--hover-bg': colors.surfaceHover,
                        } as React.CSSProperties}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--hover-bg]"
                      >
                        <span className="capitalize">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SuggestionButton
                    type="tags"
                    itemType="task"
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
                        backgroundColor: `${colors.accent}20`,
                        color: colors.accent,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{ '--hover-color': colors.accent } as React.CSSProperties}
                        className="p-0.5 transition-colors hover:text-[--hover-color]"
                        aria-label={`Remove ${tag} tag`}
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
                disabled={isLoading || !title.trim() || !dueDate}
                style={{
                  backgroundColor: colors.accent,
                  color: colors.accentForeground,
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
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}