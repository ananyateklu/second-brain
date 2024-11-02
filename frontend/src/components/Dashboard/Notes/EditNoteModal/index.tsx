import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../../../../contexts/NotesContext';
import { useNotes } from '../../../../contexts/NotesContext';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  // Get current note from context to ensure we have latest data
  const currentNote = notes.find(n => n.id === note?.id);

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setTags(currentNote.tags);
      setError('');
    }
  }, [currentNote]);

  // Update linked notes whenever they change
  useEffect(() => {
    if (currentNote) {
      const linkedNotesList = notes.filter(n =>
        currentNote.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);
    }
  }, [currentNote, currentNote?.linkedNoteIds, notes]);

  if (!isOpen || !currentNote) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNote(currentNote.id);
      navigate('/dashboard/notes');
      onClose();
    } catch (error) {
      setError('Failed to delete note');
    } finally {
      setIsLoading(false);
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
      await updateNote(currentNote.id, {
        title: title.trim(),
        content: content.trim(),
        tags
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
      
      <div className="relative w-full h-[calc(100vh-4rem)] max-w-5xl mx-auto flex glass-morphism rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Header 
            note={currentNote}
            onClose={onClose}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />

          <div className="flex-1 grid grid-cols-[1fr,300px] min-h-0">
            <MainContent
              title={title}
              content={content}
              tags={tags}
              tagInput={tagInput}
              error={error}
              isLoading={isLoading}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onTagInputChange={(value) => {
                // Ensure we're always setting a string
                if (Array.isArray(value)) {
                  setTags([...tags, ...value]);
                  setTagInput('');
                } else {
                  setTagInput(value);
                }
              }}
              onAddTag={() => {
                const trimmedTag = tagInput.trim();
                if (trimmedTag && !tags.includes(trimmedTag)) {
                  setTags([...tags, trimmedTag]);
                  setTagInput('');
                }
              }}
              onRemoveTag={(tag) => setTags(tags.filter(t => t !== tag))}
              setError={setError}
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              onShowAddLink={() => setShowAddLinkModal(true)}
              currentNoteId={currentNote?.id || ''}
            />
          </div>

          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          isLoading={isLoading}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />

        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          sourceNoteId={currentNote.id}
          onLinkAdded={() => setShowAddLinkModal(false)}
        />
      </div>
    </div>
  );
}