import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '../../../components/ui/Dialog';
import { RichNoteForm } from './RichNoteForm';
import { Button } from '../../../components/ui/Button';
import { useBoundStore } from '../../../store/bound-store';
import { useCreateNote } from '../hooks/use-notes-query';
import { useNoteForm, formDataToNote } from '../hooks/use-note-form';
import { fileAttachmentsToNoteImages } from '../utils/note-image-utils';
import type { FileAttachment } from '../../../utils/multimodal-models';

export function CreateNoteModal() {
  const isOpen = useBoundStore((state) => state.isCreateModalOpen);
  const createModalSourceRect = useBoundStore((state) => state.createModalSourceRect);
  const closeModal = useBoundStore((state) => state.closeCreateModal);
  const createNoteMutation = useCreateNote();
  const formRef = useRef<HTMLFormElement>(null);

  // Image attachment state
  const [newImages, setNewImages] = useState<FileAttachment[]>([]);

  const { register, control, setValue, handleSubmit, errors, isSubmitting, isDirty, reset } = useNoteForm({
    onSubmit: async (data) => {
      const noteData = formDataToNote(data);
      const images = fileAttachmentsToNoteImages(newImages);
      await createNoteMutation.mutateAsync({
        ...noteData,
        isArchived: false,
        images: images.length > 0 ? images : undefined,
      });
      closeModal();
    },
  });

  // Image handlers
  const handleAddImages = useCallback((images: FileAttachment[]) => {
    setNewImages(prev => [...prev, ...images]);
  }, []);

  const handleRemoveNewImage = useCallback((imageId: string) => {
    setNewImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

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

  // Handle modal close with form reset
  const handleClose = useCallback(() => {
    closeModal();
    reset({
      title: '',
      content: '',
      contentJson: null,
      tags: '',
    });
    setNewImages([]);
  }, [closeModal, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[80vw] h-[85vh] flex flex-col p-0" sourceRect={createModalSourceRect} hideCloseButton description="Create a new note with title, content, and tags">
        <DialogHeader className="flex-row items-center justify-between rounded-t-3xl !py-3">
          <DialogTitle
            icon={
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v4a1 1 0 001 1h4" opacity="0.6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" strokeWidth={1.5} />
              </svg>
            }
          >
            Create New Note
          </DialogTitle>
          <div className="flex items-center gap-2">
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
                className="!px-2.5 !py-1.5 !text-xs"
              >
                {isSubmitting ? (
                  <>Creating...</>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Note
                  </>
                )}
              </Button>
            )}
            {/* Close Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="!p-1.5 !rounded-lg"
              title="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </DialogHeader>
        <DialogBody className="flex-1 overflow-hidden">
          <form ref={formRef} onSubmit={(e) => { void handleSubmit(e); }} className="h-full flex flex-col">
            <RichNoteForm
              register={register}
              control={control}
              setValue={setValue}
              errors={errors}
              isSubmitting={isSubmitting}
              newImages={newImages}
              onAddImages={handleAddImages}
              onRemoveNewImage={handleRemoveNewImage}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

