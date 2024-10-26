import React, { useState, useEffect } from 'react';
import { X, Type, Tag as TagIcon, Loader, Save, Star, FileText, Archive, Trash2 } from 'lucide-react';
import { Input } from '../../shared/Input';
import { Note } from '../../../contexts/NotesContext';
import { useNotes } from '../../../contexts/NotesContext';
import { useNavigate } from 'react-router-dom';
import { SuggestionButton } from '../../shared/SuggestionButton';

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
  const navigate = useNavigate();
  const { updateNote, toggleFavoriteNote, archiveNote, deleteNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setIsFavorite(note.isFavorite);
      setError('');
    }
  }, [note]);

  if (!isOpen || !note) return null;

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

  const handleArchive = () => {
    archiveNote(note.id);
    onClose();
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNote(note.id);
      onClose();
      navigate('/dashboard/notes');
    } catch (error) {
      setError('Failed to delete note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = async () => {
    await toggleFavoriteNote(note.id);
    setIsFavorite(!isFavorite);
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
      await updateNote(note.id, {
        title: title.trim(),
        content: content.trim(),
        tags,
      });
      onClose();
    } catch (error) {
      setError('Failed to update note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass-morphism rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Note
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
            >
              <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleArchive}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              title="Archive note"
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                rows={8}
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

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            
            <div className="relative w-full max-w-md glass-morphism rounded-xl p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Delete Note
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Are you sure you want to delete this note? This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}