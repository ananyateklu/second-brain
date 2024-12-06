import { Type, Tag as TagIcon, X } from 'lucide-react';
import { Note } from '../../../../types/note';

interface MainContentProps {
  idea: Note;
  onUpdate: (updates: Partial<Note>) => void;
}

export function MainContent({ idea, onUpdate }: MainContentProps) {
  const handleAddTag = (value: string) => {
    const trimmedTag = value.trim();
    if (trimmedTag && !(idea.tags || []).includes(trimmedTag)) {
      onUpdate({ tags: [...(idea.tags || []), trimmedTag] });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({ tags: (idea.tags || []).filter(tag => tag !== tagToRemove) });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
            <Type className="w-4 h-4" />
            Title
          </label>
          <input
            type="text"
            value={idea.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full h-[42px] px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
            placeholder="Enter idea title"
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
            <Type className="w-4 h-4" />
            Content
          </label>
          <textarea
            value={idea.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={8}
            className="w-full min-h-[200px] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none"
            placeholder="Write your idea here..."
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
            <TagIcon className="w-4 h-4" />
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a tag"
              className="w-full h-[42px] px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    handleAddTag(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>
          {(idea.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(idea.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm"
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
          )}
        </div>
      </div>
    </div>
  );
}
