import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useBoundStore } from '../../../store/bound-store';
import { useUpdateNote, useArchiveNote, useUnarchiveNote, useMoveToFolder, useNotes, useNote } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote, noteToFormData } from '../hooks/use-note-form';
import { formatRelativeDate } from '../../../utils/date-utils';
import { NOTES_FOLDERS } from '../../../lib/constants';
import { NoteVersionHistoryPanel } from './NoteVersionHistoryPanel';
import { fileAttachmentsToNoteImages } from '../utils/note-image-utils';
import type { FileAttachment } from '../../../utils/multimodal-models';
import type { Note, NoteListItem } from '../../../types/notes';

// Props for the extracted form content component
interface EditNoteFormContentProps {
  note: Note;
  allNotes: NoteListItem[] | undefined;
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
function EditNoteFormContent({ note, allNotes }: EditNoteFormContentProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // All state initializes from note - resets automatically on remount (key change)
  const [isArchived, setIsArchived] = useState(note.isArchived);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(note.folder);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Image attachment state
  const [newImages, setNewImages] = useState<FileAttachment[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // Mutations
  const updateNoteMutation = useUpdateNote();
  const archiveNoteMutation = useArchiveNote();
  const unarchiveNoteMutation = useUnarchiveNote();
  const moveToFolderMutation = useMoveToFolder();

  // Get unique folders from all notes
  const availableFolders = useMemo(() => {
    if (!allNotes) return [];
    const folders = allNotes
      .map(n => n.folder)
      .filter((folder): folder is string => !!folder);
    return Array.from(new Set(folders)).sort();
  }, [allNotes]);

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

  // Handlers
  const handleArchiveToggle = async () => {
    if (isArchived) {
      await unarchiveNoteMutation.mutateAsync(note.id);
      setIsArchived(false);
      if (currentFolder === NOTES_FOLDERS.ARCHIVED) {
        setCurrentFolder(undefined);
      }
    } else {
      await archiveNoteMutation.mutateAsync(note.id);
      setIsArchived(true);
      setCurrentFolder(NOTES_FOLDERS.ARCHIVED);
    }
  };

  const handleFolderChange = async (folder: string | null) => {
    setCurrentFolder(folder || undefined);
    setIsFolderDropdownOpen(false);
    await moveToFolderMutation.mutateAsync({ id: note.id, folder });
  };

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
    <>
      {/* Header action buttons - rendered via Modal's headerAction prop would require lifting state,
          so we render them at the top of the body instead */}
      <div className="flex items-center justify-between gap-2 mb-4 -mt-2">
        <div className="flex items-center gap-2">
          {/* Folder Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsFolderDropdownOpen(!isFolderDropdownOpen); }}
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
                className="absolute top-full left-0 mt-1 min-w-[200px] max-h-64 overflow-y-auto thin-scrollbar rounded-xl border shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--surface-card-solid)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="p-1">
                  {/* Remove from folder */}
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

                  {/* Existing folders */}
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
            onClick={() => { void handleArchiveToggle(); }}
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
        </div>

        {/* Update Button - right side */}
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

      {/* Main content area - flex row for form + history panel */}
      <div
        className="flex overflow-hidden -mx-6 -mb-6 rounded-b-3xl"
        style={{
          height: 'calc(100% - 40px)',
          backgroundColor: 'var(--surface-elevated)',
        }}
      >
        {/* Form area */}
        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          className="flex-1 flex flex-col min-w-0 overflow-hidden p-6"
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
          onClose={() => { setIsHistoryOpen(false); }}
          onRestore={() => {
            // Note data will be refreshed via query invalidation
            // Component will remount with new data due to key change
          }}
        />
      </div>
    </>
  );
}

/**
 * EditNoteModal - Parent component that handles loading/error states
 * and uses key-based reset for the form content.
 */
export function EditNoteModal() {
  const isOpen = useBoundStore((state) => state.isEditModalOpen);
  const editingNoteId = useBoundStore((state) => state.editingNoteId);
  const closeModal = useBoundStore((state) => state.closeEditModal);

  // Fetch the full note with content
  const { data: editingNote, isLoading: isLoadingNote, error: noteError } = useNote(editingNoteId ?? '');
  const { data: allNotes } = useNotes();

  // Form key forces remount when note identity changes
  // This handles both: switching notes AND after save (new updatedAt)
  const formKey = editingNote
    ? `${editingNote.id}-${editingNote.updatedAt}`
    : 'empty';

  const handleClose = useCallback(() => {
    closeModal();
  }, [closeModal]);

  // Don't render if modal is not open or no note ID
  if (!isOpen || !editingNoteId) return null;

  // Show loading state while fetching full note
  if (isLoadingNote) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Note"
        maxWidth="max-w-[80vw]"
        className="h-[85vh] flex flex-col"
        icon={
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
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
        icon={
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
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
      icon={
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v4a1 1 0 001 1h4" opacity="0.6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={1.5} />
        </svg>
      }
      subtitle={editingNote.updatedAt ? formatRelativeDate(editingNote.updatedAt) : undefined}
    >
      {/* Key-based reset: when formKey changes, component remounts with fresh state */}
      <EditNoteFormContent
        key={formKey}
        note={editingNote}
        allNotes={allNotes}
      />
    </Modal>
  );
}
