import React, { useState, useEffect } from 'react';
import { X, Type, Tag as TagIcon, Calendar, AlertCircle, Plus, Loader, Save, Trash2, CheckSquare } from 'lucide-react';
import { Input } from '../../shared/Input';
import { Task, useTasks } from '../../../contexts/TasksContext';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const { updateTask, deleteTask } = useTasks();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
  const [priority, setPriority] = useState(task.priority);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(task.tags);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
      setPriority(task.priority);
      setTags(task.tags);
      setError('');
    }
  }, [task]);

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
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
        onClose();
      } catch (error) {
        setError('Failed to delete task');
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
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        tags
      });
      
      onClose();
    } catch (error) {
      setError('Failed to update task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-white/50 dark:bg-gray-900/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30"
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Task
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated {new Date(task.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                title="Delete task"
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
                  icon={Type}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter task title"
                  error={error}
                  disabled={isLoading}
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
                      tags
                    }}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg -z-10" />
                  
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your task..."
                    rows={6}
                    disabled={isLoading}
                    className={`
                      w-full
                      px-4 py-3
                      backdrop-blur-glass
                      bg-white/70 dark:bg-gray-800/70
                      rounded-lg
                      border border-gray-200/50 dark:border-gray-700/50
                      text-gray-900 dark:text-gray-100
                      placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary-500/30
                      focus:border-transparent
                      transition-all
                      duration-200
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      resize-none
                    `}
                  />
                  
                  <div className="absolute inset-0 border-2 border-primary-500/20 dark:border-primary-400/20 rounded-lg pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity duration-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Due Date Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg -z-10" />
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                        <Calendar className="h-5 w-5 text-[#3B7443]" />
                      </div>
                      <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`
                          w-full
                          px-4 py-2
                          pl-10
                          backdrop-blur-glass
                          bg-white/70 dark:bg-gray-800/70
                          rounded-lg
                          border border-gray-200/50 dark:border-gray-700/50
                          text-gray-900 dark:text-gray-100
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500/30
                          focus:border-transparent
                          transition-all
                          duration-200
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                          [color-scheme:auto]
                        `}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Priority Buttons */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('low')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        priority === 'low'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                      disabled={isLoading}
                    >
                      Low
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('medium')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        priority === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                          : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                      disabled={isLoading}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('high')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        priority === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                          : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                      disabled={isLoading}
                    >
                      High
                    </button>
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
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}