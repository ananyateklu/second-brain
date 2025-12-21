import { useEffect, useRef, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useBoundStore } from '../../../store/bound-store';
import { useUpdateNote, useArchiveNote, useUnarchiveNote, useMoveToFolder, useNotes, useNote } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote, noteToFormData } from '../hooks/use-note-form';
import { formatRelativeDate } from '../../../utils/date-utils';
import { NoteVersionHistoryPanel } from './NoteVersionHistoryPanel';
import { fileAttachmentsToNoteImages } from '../utils/note-image-utils';
import type { FileAttachment } from '../../../utils/multimodal-models';
import type { Note } from '../../../types/notes';

// Handle exposed by EditNoteFormContent for parent to access form state
interface EditNoteFormHandle {
  isDirty: boolean;
  isSubmitting: boolean;
  submit: () => void;
}

// Props for the extracted form content component
interface EditNoteFormContentProps {
  note: Note;
  isHistoryOpen: boolean;
  onHistoryClose: () => void;
  onFormStateChange: (state: { isDirty: boolean; isSubmitting: boolean }) => void;
}

/**
 * EditNoteFormContent - Contains all form logic and state.
 *
 * This component is keyed by `${noteId}-${updatedAt}` in the parent.
 * When the key changes (different note OR same note with new updatedAt after save),
 * React unmounts and remounts this component, automatically resetting all state
 * to initial values derived from the new note prop.
 *
 * This eliminates the need for:
 * - formSyncedNoteId state (sync guard)
 * - lastNoteStateRef (change detection)
 * - prevNoteIdRef (previous ID tracking)
 * - useEffect with setState (state sync)
 */
const EditNoteFormContent = forwardRef<EditNoteFormHandle, EditNoteFormContentProps>(
  function EditNoteFormContent({ note, isHistoryOpen, onHistoryClose, onFormStateChange }, ref) {
  const formRef = useRef<HTMLFormElement>(null);

  // Image attachment state
  const [newImages, setNewImages] = useState<FileAttachment[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // Mutations
  const updateNoteMutation = useUpdateNote();

  // Compute the saved form baseline from note
  const savedFormData = useMemo(() => noteToFormData(note), [note]);

  // Form initialized with note data - no reset() needed, remount handles it
  const { register, control, setValue, handleSubmit, errors, isSubmitting, isDirty: rhfIsDirty, watchedValues } = useNoteForm({
    defaultValues: savedFormData,
    onSubmit: async (data) => {
      const noteData = formDataToNote(data);
      const images = fileAttachmentsToNoteImages(newImages);
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          ...noteData,
          images: images.length > 0 ? images : undefined,
          deletedImageIds: deletedImageIds.length > 0 ? deletedImageIds : undefined,
        },
      });
      // After save, the query invalidation triggers refetch.
      // Parent's formKey changes due to new updatedAt.
      // This component remounts with fresh data from server.
      // No manual reset or state updates needed here.
    },
  });

  // Compute dirty state from watched values vs saved baseline
  const isDirty = useMemo(() => {
    if (!watchedValues) return rhfIsDirty;
    const titleDirty = (watchedValues.title ?? '') !== savedFormData.title;
    const contentDirty = (watchedValues.content ?? '') !== savedFormData.content;
    const tagsDirty = (watchedValues.tags ?? '') !== savedFormData.tags;
    const hasImageChanges = newImages.length > 0 || deletedImageIds.length > 0;
    return titleDirty || contentDirty || tagsDirty || hasImageChanges;
  }, [watchedValues, savedFormData, newImages, deletedImageIds, rhfIsDirty]);

  // Expose form state and submit function to parent via ref
  useImperativeHandle(ref, () => ({
    isDirty,
    isSubmitting,
    submit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }), [isDirty, isSubmitting]);

  // Notify parent of form state changes for header Update button
  useEffect(() => {
    onFormStateChange({ isDirty, isSubmitting });
  }, [isDirty, isSubmitting, onFormStateChange]);

  // Handlers
  const handleAddImages = useCallback((images: FileAttachment[]) => {
    setNewImages(prev => [...prev, ...images]);
  }, []);

  const handleRemoveNewImage = useCallback((imageId: string) => {
    setNewImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const handleDeleteExistingImage = useCallback((imageId: string) => {
    setDeletedImageIds(prev => [...prev, imageId]);
  }, []);

  const handleUndoDeleteExistingImage = useCallback((imageId: string) => {
    setDeletedImageIds(prev => prev.filter(id => id !== imageId));
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDirty, isSubmitting]);

  return (
    <div
      className="flex overflow-hidden -mx-6 -mt-6 -mb-6 rounded-b-3xl"
      style={{
        height: '100%',
        backgroundColor: 'var(--surface-elevated)',
      }}
    >
      {/* Form area */}
      <form
        ref={formRef}
        onSubmit={handleFormSubmit}
        className="flex-1 flex flex-col min-w-0 overflow-hidden p-6 pb-0"
      >
        <RichNoteForm
          register={register}
          control={control}
          setValue={setValue}
          errors={errors}
          isSubmitting={isSubmitting}
          initialTags={note.tags ?? []}
          newImages={newImages}
          existingImages={note.images}
          deletedImageIds={deletedImageIds}
          onAddImages={handleAddImages}
          onRemoveNewImage={handleRemoveNewImage}
          onDeleteExistingImage={handleDeleteExistingImage}
          onUndoDeleteExistingImage={handleUndoDeleteExistingImage}
        />
      </form>

      {/* Version History Panel */}
      <NoteVersionHistoryPanel
        noteId={note.id}
        isOpen={isHistoryOpen}
        onClose={onHistoryClose}
        onRestore={() => {
          // Note data will be refreshed via query invalidation
          // Component will remount with new data due to key change
        }}
      />
    </div>
  );
});

/**
 * EditNoteModal - Parent component that handles loading/error states,
 * header actions, and uses key-based reset for the form content.
 */
export function EditNoteModal() {
  const isOpen = useBoundStore((state) => state.isEditModalOpen);
  const editingNoteId = useBoundStore((state) => state.editingNoteId);
  const closeModal = useBoundStore((state) => state.closeEditModal);
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Header action UI state only
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  // Form state for Update button in header
  const formRef = useRef<EditNoteFormHandle>(null);
  const [formState, setFormState] = useState({ isDirty: false, isSubmitting: false });

  const handleFormStateChange = useCallback((state: { isDirty: boolean; isSubmitting: boolean }) => {
    setFormState(state);
  }, []);

  // Fetch the full note with content
  const { data: editingNote, isLoading: isLoadingNote, error: noteError } = useNote(editingNoteId ?? '');
  const { data: allNotes } = useNotes();

  // Mutations for header actions
  const archiveNoteMutation = useArchiveNote();
  const unarchiveNoteMutation = useUnarchiveNote();
  const moveToFolderMutation = useMoveToFolder();

  // Derive folder and archive state from note (mutations invalidate cache, triggering re-fetch)
  const currentFolder = editingNote?.folder;
  const isArchived = editingNote?.isArchived ?? false;

  // Get unique folders from all notes
  const availableFolders = useMemo(() => {
    if (!allNotes) return [];
    const folders = allNotes
      .map(n => n.folder)
      .filter((folder): folder is string => !!folder);
    return Array.from(new Set(folders)).sort();
  }, [allNotes]);

  // Form key forces remount when note identity changes
  const formKey = editingNote
    ? `${editingNote.id}-${editingNote.updatedAt}`
    : 'empty';

  const handleClose = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const handleArchiveToggle = async () => {
    if (!editingNote) return;
    if (isArchived) {
      await unarchiveNoteMutation.mutateAsync(editingNote.id);
    } else {
      await archiveNoteMutation.mutateAsync(editingNote.id);
    }
  };

  const handleFolderChange = async (folder: string | null) => {
    if (!editingNote) return;
    setIsFolderDropdownOpen(false);
    await moveToFolderMutation.mutateAsync({ id: editingNote.id, folder });
  };

  // Don't render if modal is not open or no note ID
  if (!isOpen || !editingNoteId) return null;

  // Modal icon
  const modalIcon = (
    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  // Header actions - folder, history, archive buttons
  const headerActions = editingNote ? (
    <div className="flex items-center gap-2">
      {/* Folder Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setIsFolderDropdownOpen(!isFolderDropdownOpen); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
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
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="max-w-[80px] truncate">{currentFolder || 'Folder'}</span>
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
            className="absolute top-full right-0 mt-1 min-w-[200px] max-h-64 overflow-y-auto thin-scrollbar rounded-xl border shadow-xl z-50"
            style={{
              backgroundColor: 'var(--surface-card-solid)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="p-1">
              <button
                type="button"
                onClick={() => { void handleFolderChange(null); }}
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

              {availableFolders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => { void handleFolderChange(folder); }}
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
                          void handleFolderChange(value);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    onClick={(e) => { e.stopPropagation(); }}
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
        variant={isHistoryOpen ? "primary" : "secondary"}
        onClick={() => { setIsHistoryOpen(!isHistoryOpen); }}
        title={isHistoryOpen ? "Close version history" : "View version history"}
        className="!px-2.5 !py-1.5 !text-xs"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        onClick={() => { void handleArchiveToggle(); }}
        title={isArchived ? 'Restore from archive' : 'Archive note'}
        className="!px-2.5 !py-1.5 !text-xs"
      >
        {isArchived ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3-3m0 0l3 3m-3-3v6" />
            </svg>
            Restore
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive
          </>
        )}
      </Button>

      {/* Update Button - shows only when form is dirty */}
      {formState.isDirty && (
        <Button
          type="button"
          variant="primary"
          isLoading={formState.isSubmitting}
          disabled={formState.isSubmitting}
          onClick={() => { formRef.current?.submit(); }}
          className="!px-2.5 !py-1.5 !text-xs"
        >
          {formState.isSubmitting ? (
            <>Saving...</>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update
            </>
          )}
        </Button>
      )}
    </div>
  ) : undefined;

  // Show loading state while fetching full note
  if (isLoadingNote) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Note"
        maxWidth="max-w-[80vw]"
        className="h-[85vh] flex flex-col"
        icon={modalIcon}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--color-brand-500)',
              }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>Loading note...</p>
          </div>
        </div>
      </Modal>
    );
  }

  // Show error state if note fetch failed
  if (noteError || !editingNote) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Note"
        maxWidth="max-w-[80vw]"
        className="h-[85vh] flex flex-col"
        icon={modalIcon}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-error)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p style={{ color: 'var(--text-primary)' }}>Failed to load note</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {noteError instanceof Error ? noteError.message : 'The note could not be found'}
            </p>
            <Button variant="secondary" onClick={handleClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Edit Note"
      maxWidth="max-w-[80vw]"
      className="h-[85vh] flex flex-col"
      icon={modalIcon}
      subtitle={editingNote.updatedAt ? formatRelativeDate(editingNote.updatedAt) : undefined}
      headerAction={headerActions}
    >
      {/* Key-based reset: when formKey changes, component remounts with fresh state */}
      <EditNoteFormContent
        key={formKey}
        ref={formRef}
        note={editingNote}
        isHistoryOpen={isHistoryOpen}
        onHistoryClose={() => { setIsHistoryOpen(false); }}
        onFormStateChange={handleFormStateChange}
      />
    </Modal>
  );
}
