/**
 * Quick Capture Hook
 * Manages form state and submission for quick focus item creation
 */

import { useState, useCallback } from 'react';
import { useCreateFocusItem } from './use-focus-mutations';
import { focusService } from '../../../services/focus.service';
import type { FocusPriority, QuickCaptureFormState } from '../types';

/**
 * Default form state for quick capture
 */
const DEFAULT_FORM_STATE: QuickCaptureFormState = {
  title: '',
  priority: 3, // Low priority by default
  scheduleForToday: true,
  estimatedMinutes: undefined,
};

/**
 * Return type for useQuickCapture hook
 */
export interface UseQuickCaptureReturn {
  /** Current form state */
  formState: QuickCaptureFormState;
  /** Set the title */
  setTitle: (title: string) => void;
  /** Set the priority */
  setPriority: (priority: FocusPriority) => void;
  /** Set whether to schedule for today */
  setScheduleForToday: (scheduleForToday: boolean) => void;
  /** Set estimated minutes */
  setEstimatedMinutes: (minutes: number | undefined) => void;
  /** Submit the form */
  submit: () => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Reset form to defaults */
  reset: () => void;
  /** Whether the form is valid (has a title) */
  isValid: boolean;
  /** Error message if submission failed */
  error: string | null;
}

/**
 * Hook for quick capture form logic
 * Manages form state and handles submission via useCreateFocusItem
 *
 * @example
 * ```tsx
 * function QuickCaptureForm() {
 *   const {
 *     formState,
 *     setTitle,
 *     setPriority,
 *     submit,
 *     isSubmitting,
 *     reset,
 *     isValid,
 *   } = useQuickCapture();
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     await submit();
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formState.title}
 *         onChange={(e) => setTitle(e.target.value)}
 *         placeholder="What do you want to focus on?"
 *       />
 *       <button type="submit" disabled={!isValid || isSubmitting}>
 *         {isSubmitting ? 'Adding...' : 'Add'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useQuickCapture(): UseQuickCaptureReturn {
  const [formState, setFormState] = useState<QuickCaptureFormState>(DEFAULT_FORM_STATE);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateFocusItem();

  // Setters
  const setTitle = useCallback((title: string) => {
    setFormState((prev) => ({ ...prev, title }));
    setError(null);
  }, []);

  const setPriority = useCallback((priority: FocusPriority) => {
    setFormState((prev) => ({ ...prev, priority }));
  }, []);

  const setScheduleForToday = useCallback((scheduleForToday: boolean) => {
    setFormState((prev) => ({ ...prev, scheduleForToday }));
  }, []);

  const setEstimatedMinutes = useCallback((estimatedMinutes: number | undefined) => {
    setFormState((prev) => ({ ...prev, estimatedMinutes }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
    setError(null);
  }, []);

  // Submit
  const submit = useCallback(async () => {
    const { title, priority, scheduleForToday, estimatedMinutes } = formState;

    // Validate
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        priority,
        scheduledDate: scheduleForToday ? focusService.getTodayDateString() : undefined,
        estimatedMinutes,
      });

      // Reset form on success
      reset();
    } catch (err) {
      // Error is already handled by useApiMutation toast
      // Set local error state for form display if needed
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  }, [formState, createMutation, reset]);

  // Validation
  const isValid = formState.title.trim().length > 0;

  return {
    formState,
    setTitle,
    setPriority,
    setScheduleForToday,
    setEstimatedMinutes,
    submit,
    isSubmitting: createMutation.isPending,
    reset,
    isValid,
    error,
  };
}

export default useQuickCapture;
