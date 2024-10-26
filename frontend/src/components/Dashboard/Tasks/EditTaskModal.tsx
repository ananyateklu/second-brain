import React, { useState, useEffect } from 'react';
import { X, Type, Tag as TagIcon, Calendar, AlertCircle, Link2, Plus, Loader, Save, Trash2 } from 'lucide-react';
import { Input } from '../../shared/Input';
import { Task, useTasks } from '../../../contexts/TasksContext';
import { AddLinkModal } from './AddLinkModal';
import { useNotes } from '../../../contexts/NotesContext';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const { updateTask, deleteTask } = useTasks();
  const { notes } = useNotes();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
  const [priority, setPriority] = useState(task.priority);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(task.tags);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
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

  const linkedItems = [
    ...task.linkedNotes.map(id => {
      const note = notes.find(n => n.id === id);
      return note ? { ...note, type: 'note' as const } : null;
    }),
    ...task.linkedIdeas.map(id => {
      const idea = notes.find(n => n.id === id && n.tags.includes('idea'));
      return idea ? { ...idea, type: 'idea' as const } : null;
    })
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Task
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6 p-6">
          <div className="col-span-2 space-y-4">
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
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your task..."
                rows={4}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
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
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : p === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover'
                      }`}
                    >
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
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

          <div className="col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Connected Items
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLinkModal(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {linkedItems.length > 0 ? (
                linkedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-dark-hover hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group relative"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                        item.type === 'idea'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <Link2 className={`w-4 h-4 ${
                          item.type === 'idea'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Handle removing link
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No connected items yet
                </p>
              )}
            </div>
          </div>

          <div className="col-span-3 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
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

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        taskId={task.id}
      />
    </div>
  );
}