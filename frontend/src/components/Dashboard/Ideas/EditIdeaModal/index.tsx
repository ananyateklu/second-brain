import { useState } from 'react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { Note } from '../../../../types/note';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { DeleteConfirmDialog } from '../../Tasks/EditTaskModal/DeleteConfirmDialog';
import { Save } from 'lucide-react';

interface EditIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Note;
}

export function EditIdeaModal({ isOpen, onClose, idea: initialIdea }: EditIdeaModalProps) {
  const { updateNote, deleteNote } = useNotes();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Note>>({});
  const [idea] = useState(initialIdea);

  if (!isOpen) return null;

  const handleUpdate = async (updates: Partial<Note>) => {
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateNote(idea.id, pendingChanges);
      setPendingChanges({});
      onClose();
    } catch (error) {
      console.error('Failed to save idea:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingChanges({});
    onClose();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteNote(idea.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete idea:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
        
        <div className="relative w-full max-w-4xl h-[calc(75vh-8rem)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl flex flex-col overflow-hidden">
          <Header
            idea={{ ...idea, ...pendingChanges }}
            onClose={handleCancel}
            onShowDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
            isSaving={isSaving}
          />

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <MainContent
                idea={{ ...idea, ...pendingChanges }}
                onUpdate={handleUpdate}
              />
            </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        isLoading={isDeleting}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
