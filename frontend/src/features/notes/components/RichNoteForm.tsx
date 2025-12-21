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
      <div className="shrink-0 bg-[var(--surface-elevated)] -mx-2 px-2 pb-2">
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
              className="w-full bg-transparent text-4xl font-bold border-none outline-none placeholder-[var(--text-tertiary)] text-[var(--text-primary)] px-2 py-2"
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
          <p className="text-sm text-[var(--color-error-text)] mt-1 px-2">{errors.title.message}</p>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 min-h-0">
        {/* Rich Content Editor */}
        <div className="min-h-[200px]">
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
            <p className="text-sm text-[var(--color-error-text)] mt-1 px-2">{errors.content.message}</p>
          )}
        </div>

        {/* Hidden tags input to register it */}
        <input type="hidden" {...register('tags')} />
      </div>

      {/* Tags Display - Fixed above images */}
      {displayTags.length > 0 && (
        <div className="shrink-0 px-2 py-2 flex flex-wrap gap-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
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
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Images
            </span>
          </div>
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

