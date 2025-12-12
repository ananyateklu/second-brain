import { useEffect, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useBoundStore } from '../../../store/bound-store';
import { useCreateNote } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote } from '../hooks/use-note-form';

export function CreateNoteModal() {
  const isOpen = useBoundStore((state) => state.isCreateModalOpen);
  const closeModal = useBoundStore((state) => state.closeCreateModal);
  const createNoteMutation = useCreateNote();
  const formRef = useRef<HTMLFormElement>(null);

  const { register, control, setValue, handleSubmit, errors, isSubmitting, isDirty, reset } = useNoteForm({
    onSubmit: async (data) => {
      const noteData = formDataToNote(data);
      await createNoteMutation.mutateAsync({
        ...noteData,
        isArchived: false,
      });
      closeModal();
    },
  });

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Create New Note"
      maxWidth="max-w-[80vw]"
      className="h-[85vh] flex flex-col"
      icon={
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {/* Fancy note/document with plus icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v4a1 1 0 001 1h4" opacity="0.6" />
          {/* Plus overlay */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" strokeWidth={1.5} />
        </svg>
      }
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
              <>Creating...</>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Note
              </>
            )}
          </Button>
        ) : null
      }
    >
      <form ref={formRef} onSubmit={(e) => { void handleSubmit(e); }} className="h-full flex flex-col">
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

