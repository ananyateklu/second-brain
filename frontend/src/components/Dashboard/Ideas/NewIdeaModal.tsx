import React, { useState } from 'react';
import { X, Type, Tag as TagIcon, Loader } from 'lucide-react';
import { Input } from '../../shared/Input';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';
import { useTheme } from '../../../contexts/themeContextUtils';
import { TextArea } from '../../shared/TextArea';
import { AlignLeft } from 'lucide-react';

interface NewIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewIdeaModal({ isOpen, onClose }: NewIdeaModalProps) {
  const { colors } = useTheme();
  const { createIdea } = useIdeas();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Idea']);
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
    if (tagToRemove !== 'Idea') { // Prevent removing the 'Idea' tag
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
      await createIdea(
        title.trim(),
        content.trim(),
        tags,
        false // isFavorite set to false initially
      );

      onClose();
    } catch (error) {
      console.error('Error creating idea:', error);
      setError('Failed to create idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div
          style={{ borderColor: colors.border }}
          className="flex items-center justify-between p-4 border-b"
        >
          <h2
            style={{ color: colors.text }}
            className="text-xl font-semibold"
          >
            Capture New Idea
          </h2>
          <button
            onClick={onClose}
            style={{
              color: colors.textSecondary,
              '--hover-color': colors.text
            } as React.CSSProperties}
            className="p-1 rounded-md transition-colors hover:text-[--hover-color] hover:bg-black/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              {/* Title Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                  label="Title"
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

              {/* Description Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                <TextArea
                  id="idea-content"
                  name="content"
                  label="Description"
                  icon={AlignLeft}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your idea..."
                  disabled={isLoading}
                  rows={6}
                />
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SuggestionButton
                    type="tags"
                    itemType="idea"
                    input={{ title, content }}
                    onSuggestion={(suggestion) => setTags(['Idea', ...(suggestion as string[])])}
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
                      style={{
                        backgroundColor: `${colors.accent}20`,
                        color: colors.accent,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                    >
                      {tag}
                      {tag !== 'Idea' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{ '--hover-color': colors.accent } as React.CSSProperties}
                          className="p-0.5 transition-colors hover:text-[--hover-color]"
                          aria-label={`Remove ${tag} tag`}
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
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.textSecondary,
                      borderColor: colors.border,
                      '--hover-bg': colors.surfaceHover,
                    } as React.CSSProperties}
                    className="px-4 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[--hover-bg]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  color: colors.textSecondary,
                  borderColor: colors.border,
                  '--hover-bg': colors.surfaceHover,
                } as React.CSSProperties}
                className="px-4 py-2 rounded-lg border transition-colors hover:bg-[--hover-bg]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !title.trim()}
                style={{
                  backgroundColor: colors.accent,
                  color: colors.text,
                  '--hover-bg': `${colors.accent}cc`,
                } as React.CSSProperties}
                className="px-4 py-2 rounded-lg font-medium transition-colors hover:bg-[--hover-bg] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Idea'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}