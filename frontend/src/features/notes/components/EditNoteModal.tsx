import { useEffect, useRef, useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useUIStore } from '../../../store/ui-store';
import { useUpdateNote, useArchiveNote, useUnarchiveNote, useMoveToFolder, useNotes } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote, noteToFormData } from '../hooks/use-note-form';
import { formatRelativeDate } from '../../../utils/date-utils';
import { useThemeStore } from '../../../store/theme-store';
import { NOTES_FOLDERS } from '../../../lib/constants';
import { NoteVersionHistoryPanel } from './NoteVersionHistoryPanel';

export function EditNoteModal() {
  const isOpen = useUIStore((state) => state.isEditModalOpen);
  const editingNote = useUIStore((state) => state.editingNote);
  const closeModal = useUIStore((state) => state.closeEditModal);
  const updateNoteMutation = useUpdateNote();
  const archiveNoteMutation = useArchiveNote();
  const unarchiveNoteMutation = useUnarchiveNote();
  const moveToFolderMutation = useMoveToFolder();
  const { data: allNotes } = useNotes();
  const formRef = useRef<HTMLFormElement>(null);
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const [isArchived, setIsArchived] = useState(editingNote?.isArchived ?? false);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(editingNote?.folder);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Get unique folders from all notes
  const availableFolders = useMemo(() => {
    if (!allNotes) return [];
    const folders = allNotes
      .map(note => note.folder)
      .filter((folder): folder is string => !!folder);
    return Array.from(new Set(folders)).sort();
  }, [allNotes]);

  // Sync local states with editingNote - use ref to track previous note ID
  const prevNoteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (editingNote && editingNote.id !== prevNoteIdRef.current) {
      prevNoteIdRef.current = editingNote.id;
      /* eslint-disable react-hooks/set-state-in-effect -- Valid state sync from prop data */
      setIsArchived(editingNote.isArchived);
      setCurrentFolder(editingNote.folder);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [editingNote]);

  const handleArchiveToggle = async () => {
    if (!editingNote) return;

    if (isArchived) {
      await unarchiveNoteMutation.mutateAsync(editingNote.id);
      setIsArchived(false);
      // Remove from Archived folder (only if currently in Archived folder)
      if (currentFolder === NOTES_FOLDERS.ARCHIVED) {
        setCurrentFolder(undefined);
      }
    } else {
      await archiveNoteMutation.mutateAsync(editingNote.id);
      setIsArchived(true);
      // Move to Archived folder
      setCurrentFolder(NOTES_FOLDERS.ARCHIVED);
    }
  };

  const handleFolderChange = async (folder: string | null) => {
    if (!editingNote) return;
    setCurrentFolder(folder || undefined);
    setIsFolderDropdownOpen(false);
    await moveToFolderMutation.mutateAsync({ id: editingNote.id, folder });
  };

  const { register, control, setValue, handleSubmit, errors, isSubmitting, isDirty, reset } = useNoteForm({
    defaultValues: editingNote ? noteToFormData(editingNote) : undefined,
    onSubmit: async (data) => {
      if (!editingNote) return;

      const noteData = formDataToNote(data);
      await updateNoteMutation.mutateAsync({
        id: editingNote.id,
        data: noteData,
      });
      closeModal();
    },
  });

  // Reset form when editing note changes (use note ID to detect changes)
  useEffect(() => {
    if (editingNote && isOpen) {
      const formData = noteToFormData(editingNote);
      reset(formData, {
        keepDefaultValues: false,
      });
    }
  }, [editingNote, isOpen, reset]);

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSubmitting && formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDirty, isSubmitting]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset({
        title: '',
        content: '',
        tags: '',
      });
    }
  }, [isOpen, reset]);

  if (!editingNote) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Edit Note"
      maxWidth="max-w-[80vw]"
      className="h-[85vh] flex flex-col"
      icon={
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {/* Fancy note/document with pen icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v4a1 1 0 001 1h4" opacity="0.6" />
          {/* Pen/pencil overlay */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={1.5} />
        </svg>
      }
      subtitle={editingNote?.updatedAt ? formatRelativeDate(editingNote.updatedAt) : undefined}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Folder Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: currentFolder
                  ? isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)'
                  : 'var(--surface-elevated)',
                color: currentFolder ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                border: `1px solid ${currentFolder ? 'var(--color-brand-400)' : 'var(--border)'}`,
              }}
              disabled={moveToFolderMutation.isPending}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="max-w-[120px] truncate">{currentFolder || 'No folder'}</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${isFolderDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Folder Dropdown */}
            {isFolderDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1 min-w-[200px] max-h-64 overflow-y-auto rounded-xl border shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--surface-card-solid)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="p-1">
                  {/* Remove from folder */}
                  <button
                    type="button"
                    onClick={() => handleFolderChange(null)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: !currentFolder ? 'var(--color-brand-600)' : 'transparent',
                      color: !currentFolder ? '#ffffff' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (currentFolder) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (currentFolder) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    No folder
                  </button>

                  {availableFolders.length > 0 && (
                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                  )}

                  {/* Existing folders */}
                  {availableFolders.map((folder) => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => handleFolderChange(folder)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        backgroundColor: currentFolder === folder ? 'var(--color-brand-600)' : 'transparent',
                        color: currentFolder === folder ? '#ffffff' : 'var(--text-primary)',
                      }}
                      onMouseEnter={(e) => {
                        if (currentFolder !== folder) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (currentFolder !== folder) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{folder}</span>
                    </button>
                  ))}

                  {/* Create new folder input */}
                  <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                    <div className="px-2 py-1">
                      <input
                        type="text"
                        placeholder="New folder name..."
                        className="w-full px-2 py-1.5 rounded-md text-sm"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.currentTarget.value.trim();
                            if (value) {
                              handleFolderChange(value);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsHistoryOpen(true)}
            title="View version history"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </Button>

          {/* Archive/Unarchive Button */}
          <Button
            type="button"
            variant="secondary"
            isLoading={archiveNoteMutation.isPending || unarchiveNoteMutation.isPending}
            disabled={archiveNoteMutation.isPending || unarchiveNoteMutation.isPending}
            onClick={handleArchiveToggle}
            title={isArchived ? 'Restore from archive' : 'Archive note'}
          >
            {isArchived ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3-3m0 0l3 3m-3-3v6" />
                </svg>
                Restore
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </>
            )}
          </Button>
          {/* Update Button */}
          {isDirty && (
            <Button
              type="button"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => {
                if (formRef.current) {
                  formRef.current.requestSubmit();
                }
              }}
            >
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Note
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="h-full flex flex-col">
        <RichNoteForm
          register={register}
          control={control}
          setValue={setValue}
          errors={errors}
          isSubmitting={isSubmitting}
        />
      </form>

      {/* Version History Panel */}
      {isHistoryOpen && editingNote && (
        <NoteVersionHistoryPanel
          noteId={editingNote.id}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={() => {
            // Refresh the note data after restore
            closeModal();
          }}
        />
      )}
    </Modal>
  );
}

