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

      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E] dark:border-[#2C2C2E]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Task
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
                <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                id="task-title"
                name="title"
                type="text"
                label="Title"
                icon={Type}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="Enter task title"
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
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#2C2C2E] dark:border-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#64ab6f]/50 focus:border-transparent transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="due-date"
                  name="dueDate"
                  type="datetime-local"
                  label="Due Date"
                  icon={Calendar}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLoading}
                  className="bg-[#1C1C1E] dark:bg-[#1C1C1E] border-[#2C2C2E] dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          : 'bg-[#1C1C1E] text-gray-400 hover:bg-[#2C2C2E]'
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}