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
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-6">
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
              icon={Type}
              value={title}
              onChange={(e) => {
                onTitleChange(e.target.value);
                setError('');
              }}
              placeholder="Enter note title"
              error={error}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content
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
              placeholder="Write your note content..."
              rows={8}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </label>
              <SuggestionButton
                type="tags"
                itemType="note"
                input={{ title, content }}
                onSuggestion={(suggestion) => {
                  if (Array.isArray(suggestion)) {
                    // Add suggested tags directly to the tags array
                    const newTags = suggestion.filter(tag => !tags.includes(tag));
                    onTagInputChange(newTags);
                  }
                }}
                disabled={isLoading}
                context={{
                  currentTags: tags
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
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
                onChange={(e) => onTagInputChange(e.target.value)}
                placeholder="Add a tag"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={onAddTag}
                disabled={!tagInput.trim() || isLoading}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}