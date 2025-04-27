import React, { useState, useEffect } from 'react';
import { X, Type, Tag as TagIcon, Loader, AlignLeft, Server, CheckCircle } from 'lucide-react';
import { Input } from '../../shared/Input';
import { TextArea } from '../../shared/TextArea';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { SuggestionButton } from '../../shared/SuggestionButton';
import { TickTickTask } from '../../../types/integrations';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewNoteModal({ isOpen, onClose }: NewNoteModalProps) {
  const { colors } = useTheme();
  const { addNote, createTickTickNote, isTickTickConnected, tickTickProjectId } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Note']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [noteSource, setNoteSource] = useState<'local' | 'ticktick'>('local');

  useEffect(() => {
    if (!isTickTickConnected) {
      setNoteSource('local');
    }
  }, [isTickTickConnected]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (tagToRemove !== 'Note') {
      setTags(tags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (noteSource === 'ticktick' && !tickTickProjectId) {
      console.error("TickTick Project ID is not set. Cannot create note in TickTick.");
      setError("Please select a TickTick project in settings first.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (noteSource === 'ticktick' && tickTickProjectId) {
        // Create note in TickTick
        const tickTickNoteData: Partial<TickTickTask> = {
          title: title.trim(),
          content: content.trim(),
          tags: tags.filter(t => t !== 'Note')
        };
        await createTickTickNote(tickTickProjectId, tickTickNoteData);
      } else {
        // Create local note
        addNote({
          title: title.trim(),
          content: content.trim(),
          tags,
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          isDeleted: false,
          isIdea: false
        });
      }

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        style={{
          backgroundColor: `${colors.surface}`,
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
            Create New Note
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
                />
              </div>

              {/* Content Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                <TextArea
                  id="note-content"
                  name="content"
                  label="Content"
                  icon={AlignLeft}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note content..."
                  disabled={isLoading}
                  rows={6}
                />
              </div>

              {/* Note Source Selector (if TickTick is connected) */}
              {isTickTickConnected && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    Save Note To
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteSource('local')}
                      disabled={isLoading}
                      style={{
                        backgroundColor: noteSource === 'local' ? `${colors.accent}20` : colors.surface,
                        color: noteSource === 'local' ? colors.accent : colors.textSecondary,
                        borderColor: noteSource === 'local' ? colors.accent : colors.border,
                        '--hover-bg': colors.surfaceHover,
                      } as React.CSSProperties}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--hover-bg] flex items-center justify-center gap-2"
                    >
                      <Server className="w-4 h-4" /> Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteSource('ticktick')}
                      disabled={isLoading || !tickTickProjectId}
                      style={{
                        backgroundColor: noteSource === 'ticktick' ? `#4CAF5020` : colors.surface,
                        color: noteSource === 'ticktick' ? `#4CAF50` : colors.textSecondary,
                        borderColor: noteSource === 'ticktick' ? `#4CAF50` : colors.border,
                        '--hover-bg': colors.surfaceHover,
                      } as React.CSSProperties}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--hover-bg] flex items-center justify-center gap-2 ${!tickTickProjectId ? 'cursor-not-allowed' : ''}`}
                      title={!tickTickProjectId ? "Connect TickTick and select a project in Settings" : ""}
                    >
                      <CheckCircle className="w-4 h-4" /> TickTick
                    </button>
                  </div>
                  {!tickTickProjectId && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">A TickTick project must be selected in settings to save notes there.</p>
                  )}
                </div>
              )}

              {/* Tags Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                      style={{
                        backgroundColor: `${colors.accent}20`,
                        color: colors.accent,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{ '--hover-color': colors.accent } as React.CSSProperties}
                        className="p-0.5 transition-colors hover:text-[--hover-color]"
                        aria-label={`Remove ${tag} tag`}
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
                  noteSource === 'ticktick' ? 'Create in TickTick' : 'Create Local Note'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}