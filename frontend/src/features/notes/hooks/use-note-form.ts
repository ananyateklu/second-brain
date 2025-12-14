import { useForm, useWatch } from 'react-hook-form';
import type { JSONContent } from '@tiptap/react';
import { Note } from '../types/note';

export interface NoteFormData {
  title: string;
  content: string;
  /** TipTap JSON content - canonical format for editing */
  contentJson: JSONContent | null;
  tags: string;
}

export interface UseNoteFormOptions {
  defaultValues?: Partial<NoteFormData>;
  onSubmit: (data: NoteFormData) => void | Promise<void>;
}

export function useNoteForm({ defaultValues, onSubmit }: UseNoteFormOptions) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting, isDirty, dirtyFields, defaultValues: formDefaultValues },
    reset,
  } = useForm<NoteFormData>({
    defaultValues: {
      title: defaultValues?.title || '',
      content: defaultValues?.content || '',
      contentJson: defaultValues?.contentJson || null,
      tags: defaultValues?.tags || '',
    },
  });

  const onSubmitWrapper = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  // useWatch subscribes to form changes and triggers re-renders
  // This is more reliable than watch() for detecting field changes
  const watchedTitle = useWatch({ control, name: 'title' });
  const watchedContent = useWatch({ control, name: 'content' });
  const watchedContentJson = useWatch({ control, name: 'contentJson' });
  const watchedTags = useWatch({ control, name: 'tags' });

  return {
    register,
    control,
    setValue,
    watch,
    getValues,
    handleSubmit: onSubmitWrapper,
    errors,
    isSubmitting,
    isDirty,
    dirtyFields,
    formDefaultValues,
    reset,
    // Expose watched values for reliable dirty tracking
    watchedValues: {
      title: watchedTitle,
      content: watchedContent,
      contentJson: watchedContentJson,
      tags: watchedTags,
    },
  };
}

// Helper to convert Note to form data
export function noteToFormData(note: Note): NoteFormData {
  return {
    title: note.title,
    content: note.content || '',
    contentJson: note.contentJson ?? null,
    tags: note.tags.join(', '),
  };
}

// Helper to convert form data to create/update payload
export function formDataToNote(data: NoteFormData) {
  return {
    title: data.title.trim(),
    content: data.content.trim(),
    // Include contentJson for API (canonical format)
    contentJson: data.contentJson,
    // Flag to indicate contentJson should be updated (even if null)
    updateContentJson: true,
    tags: data.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag),
  };
}

