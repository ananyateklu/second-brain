import { useEffect, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useUIStore } from '../../../store/ui-store';
import { useUpdateNote } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote, noteToFormData } from '../hooks/use-note-form';
import { formatRelativeDate } from '../../../utils/date-utils';

export function EditNoteModal() {
  const isOpen = useUIStore((state) => state.isEditModalOpen);
  const editingNote = useUIStore((state) => state.editingNote);
  const closeModal = useUIStore((state) => state.closeEditModal);
  const updateNoteMutation = useUpdateNote();
  const formRef = useRef<HTMLFormElement>(null);

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
        isDirty ? (
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
        ) : null
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
    </Modal>
  );
}

