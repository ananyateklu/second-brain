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
  onTagInputChange: (value: string | string[]) => void;
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
    <div className="flex flex-col min-h-0 p-6 bg-[var(--color-surface)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="note-title" className="block text-sm font-medium text-[var(--color-text)]">
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
            className="bg-[var(--color-surface)] border-[var(--color-border)]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[var(--color-text)]">
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
            className="w-full px-3 py-2 bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none rounded-lg border border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[var(--color-text)]">
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
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-[var(--color-accent)] transition-colors"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddTag();
                }
              }}
              placeholder="Add a tag"
              disabled={isLoading}
              className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
            />
            <button
              type="button"
              onClick={onAddTag}
              disabled={!tagInput.trim() || isLoading}
              className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}