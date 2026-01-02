/**
 * Focus Hooks
 * Export all hooks for the focus/productivity feature
 */

// Query hooks
export { useTodayPlan, type UseTodayPlanOptions } from './use-today-plan';
export { useBacklog, type UseBacklogOptions } from './use-backlog';

// Mutation hooks
export {
  useCreateFocusItem,
  useUpdateFocusItem,
  useSetCurrentFocus,
  useCompleteFocusItem,
  useDeferFocusItem,
  useDeleteFocusItem,
  useReorderFocusItems,
} from './use-focus-mutations';

// Form hooks
export { useQuickCapture, type UseQuickCaptureReturn } from './use-quick-capture';

// AI hooks
export { useFocusSuggestions, type UseFocusSuggestionsOptions } from './use-focus-suggestions';
export { useProgressSummary, type UseProgressSummaryOptions } from './use-progress-summary';

// Claude Code integration
export { useClaudeSession } from './use-claude-session';
export type { UseClaudeSessionOptions, UseClaudeSessionReturn } from '../types/claude-session';
