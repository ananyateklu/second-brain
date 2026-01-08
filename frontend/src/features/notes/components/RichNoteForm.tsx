import { useState } from 'react';
import { Control, Controller, UseFormRegister, UseFormSetValue, FieldErrors, useWatch } from 'react-hook-form';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { NoteFormData } from '../hooks/use-note-form';
import { NoteImageAttachment } from './NoteImageAttachment';
import { useBoundStore } from '../../../store/bound-store';
import type { FileAttachment } from '../../../utils/multimodal-models';
import type { NoteImage } from '../../../types/notes';

interface RichNoteFormProps {
  register: UseFormRegister<NoteFormData>;
  control: Control<NoteFormData>;
  setValue: UseFormSetValue<NoteFormData>;
  errors: FieldErrors<NoteFormData>;
  isSubmitting: boolean;
  /** Callback when title changes - for dirty tracking */
  onTitleChange?: (title: string) => void;
  /** Initial tags from the note entity - passed to editor to display all tags */
  initialTags?: string[];
  /** New images being added */
  newImages?: FileAttachment[];
  /** Existing images from the note */
  existingImages?: NoteImage[];
  /** IDs of existing images marked for deletion */
  deletedImageIds?: string[];
  /** Callback when new images are added */
  onAddImages?: (images: FileAttachment[]) => void;
  /** Callback when a new image is removed */
  onRemoveNewImage?: (imageId: string) => void;
  /** Callback when an existing image is marked for deletion */
  onDeleteExistingImage?: (imageId: string) => void;
  /** Callback when an existing image deletion is undone */
  onUndoDeleteExistingImage?: (imageId: string) => void;
}

export function RichNoteForm({
  register,
  control,
  setValue,
  errors,
  isSubmitting,
  onTitleChange,
  initialTags = [],
  newImages = [],
  existingImages = [],
  deletedImageIds = [],
  onAddImages,
  onRemoveNewImage,
  onDeleteExistingImage,
  onUndoDeleteExistingImage,
}: RichNoteFormProps) {
  // Check if image handling is enabled (callbacks provided)
  const imageHandlingEnabled = !!(onAddImages && onRemoveNewImage);

  // Theme for tag styling
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Track tags for external display
  const [displayTags, setDisplayTags] = useState<string[]>(initialTags);

  // Use useWatch to get reactive contentJson value (updates when form resets)
  const contentJson = useWatch({ control, name: 'contentJson' });

  return (
    <div className="flex flex-col h-full">
      {/* Title - Sticky at top, using Controller for controlled input */}
      <div className="shrink-0 bg-transparent -mx-1 md:-mx-2 px-1 md:px-2 pb-2">
        <Controller
          name="title"
          control={control}
          rules={{
            required: 'Title is required',
            minLength: {
              value: 1,
              message: 'Title must be at least 1 character',
            },
            maxLength: {
              value: 200,
              message: 'Title must be less than 200 characters',
            },
          }}
          render={({ field }) => (
            <input
              id="title"
              placeholder="Untitled"
              disabled={isSubmitting}
              className="w-full bg-transparent text-2xl md:text-4xl font-bold border-none outline-none placeholder-[var(--text-tertiary)] text-[var(--text-primary)] px-1 md:px-2 py-1.5 md:py-2"
              autoFocus
              autoComplete="off"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                onTitleChange?.(e.target.value);
              }}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        {errors.title && (
          <p className="text-sm text-[var(--color-error-text)] mt-1 px-1 md:px-2">{errors.title.message}</p>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto thin-scrollbar pr-1 md:pr-2 min-h-0">
        {/* Rich Content Editor */}
        <div className="min-h-[150px] md:min-h-[200px]">
          <Controller
            name="content"
            control={control}
            rules={{ required: 'Content is required' }}
            render={({ field }) => (
              <RichTextEditor
                contentJson={contentJson}
                initialTags={initialTags}
                onChange={(markdown, json) => {
                  // Update both content (markdown for search) and contentJson (canonical)
                  field.onChange(markdown);
                  setValue('contentJson', json, { shouldDirty: true });
                }}
                onTagsChange={(tags) => {
                  // Convert array of tags back to comma-separated string for the form
                  setValue('tags', tags.join(', '), { shouldDirty: true });
                  // Update local display tags
                  setDisplayTags(tags);
                }}
                editable={!isSubmitting}
                hideTagsDisplay
              />
            )}
          />
          {errors.content && (
            <p className="text-sm text-[var(--color-error-text)] mt-1 px-1 md:px-2">{errors.content.message}</p>
          )}
        </div>

        {/* Hidden tags input to register it */}
        <input type="hidden" {...register('tags')} />
      </div>

      {/* Tags Display - Fixed above images */}
      {displayTags.length > 0 && (
        <div className="shrink-0 px-1 md:px-2 py-1.5 md:py-2 flex flex-wrap gap-1 md:gap-1.5">
          <span className="text-xs font-medium self-center mr-1" style={{ color: 'var(--text-tertiary)' }}>
            Tags:
          </span>
          {displayTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-md font-medium px-2 py-0.5 text-xs"
              style={{
                backgroundColor: isDarkMode
                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                opacity: isDarkMode ? 1 : 0.7,
              }}
            >
              <span className="opacity-50 mr-0.5">#</span>{tag}
            </span>
          ))}
        </div>
      )}

      {/* Image Attachments - Fixed at bottom */}
      {imageHandlingEnabled && (
        <div className="shrink-0 pt-2">
          <NoteImageAttachment
            newImages={newImages}
            existingImages={existingImages}
            deletedImageIds={deletedImageIds}
            onAddImages={onAddImages}
            onRemoveNewImage={onRemoveNewImage}
            onDeleteExistingImage={onDeleteExistingImage ?? (() => { /* no-op */ })}
            onUndoDeleteExistingImage={onUndoDeleteExistingImage ?? (() => { /* no-op */ })}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}

