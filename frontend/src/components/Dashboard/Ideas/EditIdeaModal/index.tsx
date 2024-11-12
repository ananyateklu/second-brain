import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../../../../contexts/NotesContext';
import { useNotes } from '../../../../contexts/NotesContext';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from '../../Notes/EditNoteModal/LinkedNotesPanel';
import { DeleteConfirmDialog } from '../../Notes/EditNoteModal/DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';

interface EditIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Note | null;
}

export function EditIdeaModal({ isOpen, onClose, idea }: EditIdeaModalProps) {
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

  // Get current idea from context to ensure we have latest data
  const currentIdea = notes.find(n => n.id === idea?.id);

  useEffect(() => {
    if (currentIdea) {
      setTitle(currentIdea.title);
      setContent(currentIdea.content);
      setTags(currentIdea.tags);
      setError('');
    }
  }, [currentIdea]);

  // Update linked notes whenever they change
  useEffect(() => {
    if (currentIdea) {
      const linkedNotesList = notes.filter(n =>
        currentIdea.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);
    }
  }, [currentIdea, currentIdea?.linkedNoteIds, notes]);

  if (!isOpen || !currentIdea) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNote(currentIdea.id);
      setShowDeleteConfirm(false);
      navigate('/dashboard/ideas');
      onClose();
    } catch (error) {
      setError('Failed to delete idea');
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
      await updateNote(currentIdea.id, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.includes('idea') ? tags : ['idea', ...tags]
      });
      onClose();
    } catch (error) {
      setError('Failed to update idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-white/50 dark:bg-gray-900/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30"
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Header 
            idea={currentIdea}
            onClose={onClose}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />

          <div className="flex-1 grid grid-cols-[1fr,300px] min-h-0 overflow-hidden">
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
                if (Array.isArray(value)) {
                  setTags(['idea', ...value]);
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
              onRemoveTag={(tag) => tag !== 'idea' && setTags(tags.filter(t => t !== tag))}
              setError={setError}
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              onShowAddLink={() => setShowAddLinkModal(true)}
              currentNoteId={currentIdea?.id || ''}
              isIdea={true}
            />
          </div>

          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
          sourceNoteId={currentIdea.id}
          onLinkAdded={() => setShowAddLinkModal(false)}
        />
      </div>
    </div>
  );
}
