import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { NoteFormData } from '../hooks/use-note-form';

interface NoteFormProps {
  register: UseFormRegister<NoteFormData>;
  errors: FieldErrors<NoteFormData>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function NoteForm({ 
  register, 
  errors, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  submitLabel = 'Create Note'
}: NoteFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title Input */}
      <Input
        id="title"
        label="Title"
        placeholder="Enter note title"
        error={errors.title?.message}
        required
        disabled={isSubmitting}
        autoFocus
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

      {/* Content Textarea */}
      <Textarea
        id="content"
        label="Content"
        rows={10}
        placeholder="Write your note content here..."
        error={errors.content?.message}
        required
        disabled={isSubmitting}
        {...register('content', {
          required: 'Content is required',
          minLength: {
            value: 1,
            message: 'Content must be at least 1 character',
          },
        })}
      />

      {/* Tags Input */}
      <Input
        id="tags"
        label="Tags"
        placeholder="e.g. ideas, work, personal"
        helperText="Comma-separated"
        error={errors.tags?.message}
        disabled={isSubmitting}
        {...register('tags')}
      />

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 pt-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          {isSubmitting ? (
            <>Saving...</>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

