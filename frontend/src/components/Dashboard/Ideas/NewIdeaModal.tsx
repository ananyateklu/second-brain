import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useNotes } from '../../../contexts/NotesContext';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface NewIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewIdeaModal({ isOpen, onClose }: NewIdeaModalProps) {
  const { addNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['idea']);
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
    if (tagToRemove !== 'idea') { // Prevent removing the 'idea' tag
      setTags(tags.filter(tag => tag !== tagToRemove));
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
      await addNote({
        title: title.trim(),
        content: content.trim(),
        tags,
        isPinned: false,
        isFavorite: false
      });
      
      onClose();
    } catch (error) {
      setError('Failed to create idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Capture New Idea
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
                <label htmlFor="idea-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <SuggestionButton
                  type="title"
                  itemType="idea"
                  input={{ content }}
                  onSuggestion={(suggestion) => setTitle(suggestion as string)}
                  disabled={isLoading}
                  context={{
                    currentTitle: title,
                    tags
                  }}
                />
              </div>
              <Input
                id="idea-title"
                name="title"
                type="text"
                icon={Type}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="What's your idea?"
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
                  itemType="idea"
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
                placeholder="Describe your idea..."
                rows={6}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                <SuggestionButton
                  type="tags"
                  itemType="idea"
                  input={{ title, content }}
                  onSuggestion={(suggestion) => setTags(['idea', ...(suggestion as string[])])}
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
                    {tag !== 'idea' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="p-0.5 hover:text-primary-800 dark:hover:text-primary-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
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

          <div className="flex justify-end gap-3 mt-6">
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
                  <span>Creating...</span>
                </>
              ) : (
                'Create Idea'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}