import { Control, Controller, UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { NoteFormData } from '../hooks/use-note-form';

interface RichNoteFormProps {
  register: UseFormRegister<NoteFormData>;
  control: Control<NoteFormData>;
  setValue: UseFormSetValue<NoteFormData>;
  errors: FieldErrors<NoteFormData>;
  isSubmitting: boolean;
}

export function RichNoteForm({
  register,
  control,
  setValue,
  errors,
  isSubmitting,
}: RichNoteFormProps) {
  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Title - Sticky at top */}
      <div className="sticky top-0 z-20 bg-[var(--surface-elevated)] -mx-2 px-2 pb-2">
        <input
          id="title"
          placeholder="Untitled"
          disabled={isSubmitting}
          className="w-full bg-transparent text-4xl font-bold border-none outline-none placeholder-[var(--text-tertiary)] text-[var(--text-primary)] px-2 py-2"
          autoFocus
          autoComplete="off"
          {...register('title', {
            required: 'Title is required',
            minLength: {
              value: 1,
              message: 'Title must be at least 1 character',
            },
            maxLength: {
              value: 200,
              message: 'Title must be less than 200 characters',
            },
          })}
        />
        {errors.title && (
          <p className="text-sm text-[var(--color-error-text)] mt-1 px-2">{errors.title.message}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
        {/* Rich Content Editor */}
        <div className="min-h-[300px]">
          <Controller
            name="content"
            control={control}
            rules={{ required: 'Content is required' }}
            render={({ field }) => (
              <RichTextEditor
                content={field.value || ''}
                onChange={field.onChange}
                onTagsChange={(tags) => {
                  // Convert array of tags back to comma-separated string for the form
                  setValue('tags', tags.join(', '), { shouldDirty: true });
                }}
                editable={!isSubmitting}
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
    </div>
  );
}

