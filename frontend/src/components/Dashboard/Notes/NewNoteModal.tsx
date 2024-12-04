import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useNotes } from '../../../contexts/notesContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewNoteModal({ isOpen, onClose }: NewNoteModalProps) {
  const { addNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
      await addNote({
        title: title.trim(),
        content: content.trim(),
        tags,
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        isDeleted: false,
        isIdea: false
      });
      
      onClose();
    } catch (error) {
      console.error(error);
      setError('Failed to create note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Create New Note
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="note-title" className="block text-sm font-medium text-[var(--color-text)]">
                  Title
                </label>
                <SuggestionButton
                  type="title"
                  itemType="note"
                  input={{ content, title }}
                  onSuggestion={(suggestion) => setTitle(suggestion as string)}
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
                label="Title"
                icon={Type}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="Enter note title"
                error={error}
                disabled={isLoading}
                className="bg-[var(--color-surface)] border-[var(--color-border)]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[var(--color-text)]">
                  Content
                </label>
                <SuggestionButton
                  type="content"
                  itemType="note"
                  input={{ title }}
                  onSuggestion={(suggestion) => setContent(suggestion as string)}
                  disabled={isLoading}
                  context={{
                    currentContent: content,
                    tags
                  }}
                />
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note content..."
                rows={6}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-all text-[var(--color-text)] placeholder:text-[var(--color-textSecondary)]"
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
                  className="bg-[var(--color-surface)] border-[var(--color-border)]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || isLoading}
                  className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="px-4 py-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}