import { Type, Tag as TagIcon, X } from 'lucide-react';
import { Input } from '../../../shared/Input';
import { SuggestionButton } from '../../../shared/SuggestionButton';

interface MainContentProps {
  title: string;
  content: string;
  tags: string[];
  tagInput: string;
  error: string;
  isLoading: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onTagInputChange: (tagInput: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  setError: (error: string) => void;
}

export function MainContent({
  title,
  content,
  tags,
  tagInput,
  error,
  isLoading,
  onTitleChange,
  onContentChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  setError
}: MainContentProps) {
  return (
    <div className="flex flex-col min-h-0 p-6 bg-white dark:bg-[#111111]">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <SuggestionButton
              type="title"
              itemType="note"
              input={{ content }}
              onSuggestion={(suggestion) => onTitleChange(suggestion as string)}
              disabled={isLoading}
              context={{
                currentTitle: title,
                tags
              }}
            />
          </div>
          <Input
            id="note-title"
            name="title"
            type="text"
            label=""
            icon={Type}
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              setError('');
            }}
            placeholder="What's your note?"
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
              itemType="note"
              input={{ title }}
              onSuggestion={(suggestion) => onContentChange(suggestion as string)}
              disabled={isLoading}
              context={{
                currentContent: content,
                tags
              }}
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your note..."
            rows={8}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 resize-none rounded-lg border border-gray-200/50 dark:border-[#2C2C2E] focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags
            </label>
            <SuggestionButton
              type="tags"
              itemType="note"
              input={{ title, content }}
              onSuggestion={(suggestion) => onTagInputChange(suggestion as string[])}
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
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
                >
                  <X className="w-4 h-4" />
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
              onChange={(e) => onTagInputChange(e.target.value)}
              placeholder="Add a tag"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={onAddTag}
              disabled={!tagInput.trim() || isLoading}
              className="px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-glass text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-200/50 dark:border-gray-700/50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}