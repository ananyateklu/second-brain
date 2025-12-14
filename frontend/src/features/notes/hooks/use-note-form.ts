import { useForm, useWatch } from 'react-hook-form';
import { Note } from '../types/note';

export interface NoteFormData {
  title: string;
  content: string;
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
      tags: watchedTags,
    },
  };
}

// Helper to check if a tag exists in content (as #tag)
function tagExistsInContent(content: string, tag: string): boolean {
  if (!content || !tag) return false;
  // Check for #tag pattern (case-insensitive)
  const pattern = new RegExp(`#${tag}\\b`, 'i');
  return pattern.test(content);
}

// Helper to convert Note to form data
export function noteToFormData(note: Note): NoteFormData {
  let content = note.content || '';
  
  // Ensure tags from note.tags are present in content as #tag mentions
  // This is important for imported notes where tags might be stored separately
  if (note.tags && note.tags.length > 0) {
    const tagsToAdd: string[] = [];
    
    // Find tags that aren't already in content
    for (const tag of note.tags) {
      if (tag && !tagExistsInContent(content, tag)) {
        tagsToAdd.push(`#${tag}`);
      }
    }
    
    // Append missing tags to content if any
    if (tagsToAdd.length > 0) {
      // If content is empty, just add tags
      if (!content.trim()) {
        content = tagsToAdd.join(' ');
      } else {
        // Otherwise, append tags with a space separator
        // For HTML content, append as plain text (will be converted)
        // For markdown, append as markdown
        const isHtml = content.trim().startsWith('<');
        if (isHtml) {
          // For HTML, append tags as text nodes (they'll be converted to mentions by the editor)
          content = `${content} ${tagsToAdd.join(' ')}`;
        } else {
          // For markdown/plain text, append tags
          content = `${content}\n\n${tagsToAdd.join(' ')}`;
        }
      }
    }
  }
  
  return {
    title: note.title,
    content: content,
    tags: note.tags.join(', '),
  };
}

// Helper to convert form data to create/update payload
export function formDataToNote(data: NoteFormData) {
  return {
    title: data.title.trim(),
    content: data.content.trim(),
    tags: data.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag),
  };
}

