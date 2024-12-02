import { AlertCircle, X, Tag, Calendar } from 'lucide-react';
import { Input } from '../../../shared/Input';

interface MainContentProps {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  status: 'Incomplete' | 'Completed';
  tags: string[];
  error: string | null;
  isLoading: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: 'low' | 'medium' | 'high') => void;
  onDueDateChange: (value: string | null) => void;
  onStatusChange: (value: 'Incomplete' | 'Completed') => void;
  onTagsChange: (value: string[]) => void;
}

export function MainContent({
  title,
  description,
  priority,
  dueDate,
  status,
  tags,
  error,
  isLoading,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onStatusChange,
  onTagsChange,
}: MainContentProps) {
  return (
    <div className="p-6 overflow-y-auto bg-white dark:bg-[#111111]">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg border border-gray-200/50 dark:border-[#2C2C2E] focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
            placeholder="Task title"
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 resize-none rounded-lg border border-gray-200/50 dark:border-[#2C2C2E] focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
            placeholder="Task description"
            disabled={isLoading}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPriorityChange('low')}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                ${priority === 'low'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-500'
                  : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }
                transition-colors
              `}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => onPriorityChange('medium')}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                ${priority === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-500'
                  : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }
                transition-colors
              `}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => onPriorityChange('high')}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                ${priority === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-500'
                  : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }
                transition-colors
              `}
            >
              High
            </button>
          </div>
        </div>

        {/* Due Date */}
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-300" />
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due Date
            </label>
          </div>
          <input
            type="datetime-local"
            id="dueDate"
            value={dueDate || ''}
            onChange={(e) => onDueDateChange(e.target.value || null)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg border border-gray-200/50 dark:border-[#2C2C2E] focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
            disabled={isLoading}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStatusChange('Incomplete')}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                ${status === 'Incomplete'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }
                transition-colors
              `}
            >
              Incomplete
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Completed')}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                ${status === 'Completed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-500'
                  : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-[#2C2C2E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }
                transition-colors
              `}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="max-w-sm">
          <Input
            label="Tags"
            icon={Tag}
            value=""
            placeholder="Add tag..."
            disabled={isLoading}
            disableEnhancement
            disableRecording
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = (e.target as HTMLInputElement).value.trim();
                if (value && !tags.includes(value)) {
                  onTagsChange([...tags, value]);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onTagsChange(tags.filter(t => t !== tag))}
                    className="hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 