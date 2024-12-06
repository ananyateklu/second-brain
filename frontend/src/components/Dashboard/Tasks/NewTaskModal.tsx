import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Calendar, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTaskModal({ isOpen, onClose }: NewTaskModalProps) {
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
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

    setIsLoading(true);
    setError('');

    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        tags
      });

      onClose();
    } catch (error) {
      console.error(error);
      setError('Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              Create New Task
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Title
                </label>
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
                label=""
                type="text"
                icon={Type}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="Enter task title"
                error={error}
                disabled={isLoading}
                className="!bg-[var(--color-background)]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Description
                </label>
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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your task..."
                rows={3}
                disabled={isLoading}
                className="w-full min-h-[46px] px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Due Date
                </label>
                <Input
                  label=""
                  type="datetime-local"
                  icon={Calendar}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLoading}
                  className="!bg-[var(--color-background)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      disabled={isLoading}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        priority === p
                          ? p === 'high'
                            ? 'bg-red-900/20 text-red-400'
                            : p === 'medium'
                              ? 'bg-yellow-900/20 text-yellow-400'
                              : 'bg-green-900/20 text-green-400'
                          : 'bg-[var(--color-background)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Tags
                </label>
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
                  'Create Task'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}