/**
 * Focus Mutations Hooks
 * TanStack Query mutation hooks for focus item CRUD operations
 */

import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';
import { focusKeys } from '../../../lib/query-keys';
import { focusService } from '../../../services/focus.service';
import type {
  FocusItem,
  CreateFocusItemRequest,
  UpdateFocusItemRequest,
  DeferFocusItemRequest,
  ReorderFocusItemsRequest,
  TodaysPlanResponse,
  BacklogResponse,
} from '../types';

// ============================================
// Create Focus Item
// ============================================

/**
 * Hook to create a new focus item
 * Includes optimistic update for immediate UI feedback
 *
 * @example
 * ```tsx
 * const { mutate: createItem, isPending } = useCreateFocusItem();
 *
 * createItem({
 *   title: 'Review PR',
 *   priority: 1,
 *   scheduledDate: '2024-12-26',
 * });
 * ```
 */
export function useCreateFocusItem() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<FocusItem, CreateFocusItemRequest>(
    (request) => focusService.create(request),
    {
      successMessage: 'Focus item created',
      showSuccessToast: true,
      errorMessage: 'Failed to create focus item',
      invalidateQueries: [focusKeys.all],
      optimisticUpdate: {
        queryKey: focusKeys.todayPlan(todayDate),
        getOptimisticData: (newItem, currentData) => {
          const data = currentData as TodaysPlanResponse | undefined;
          if (!data) return data;

          const optimisticItem: FocusItem = {
            id: `temp-${Date.now()}`,
            userId: '',
            noteId: newItem.noteId ?? null,
            title: newItem.title,
            description: newItem.description ?? null,
            isCurrentFocus: false,
            priority: newItem.priority ?? 3,
            status: 'pending',
            scheduledDate: newItem.scheduledDate ?? null,
            estimatedMinutes: newItem.estimatedMinutes ?? null,
            actualMinutes: null,
            completedAt: null,
            deferredTo: null,
            aiSuggested: false,
            aiSuggestionReason: null,
            aiConfidence: null,
            sortOrder: (data.scheduledItems?.length ?? 0) + 1,
            focusStartedAt: null,
            accumulatedMinutes: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            linkedNote: null,
          };

          // Only add to today's plan if scheduled for today
          if (newItem.scheduledDate === todayDate) {
            return {
              ...data,
              scheduledItems: [...(data.scheduledItems ?? []), optimisticItem],
              totalEstimatedMinutes: data.totalEstimatedMinutes + (newItem.estimatedMinutes ?? 0),
            };
          }

          return data;
        },
      },
      onSettled: () => {
        // Invalidate both today's plan and backlog
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}

// ============================================
// Update Focus Item
// ============================================

/**
 * Context for optimistic update rollback
 */
interface UpdateFocusItemContext {
  previousTodayPlan?: TodaysPlanResponse;
  previousBacklog?: BacklogResponse;
}

/**
 * Hook to update an existing focus item
 *
 * @example
 * ```tsx
 * const { mutate: updateItem } = useUpdateFocusItem();
 *
 * updateItem({
 *   id: 'focus-123',
 *   data: { title: 'Updated title', priority: 2 },
 * });
 * ```
 */
export function useUpdateFocusItem() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<FocusItem, { id: string; data: UpdateFocusItemRequest }, UpdateFocusItemContext>(
    ({ id, data }) => focusService.update(id, data),
    {
      successMessage: 'Focus item updated',
      showSuccessToast: true,
      errorMessage: 'Failed to update focus item',
      onMutate: async ({ id, data }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: focusKeys.all });

        // Snapshot previous values
        const previousTodayPlan = queryClient.getQueryData<TodaysPlanResponse>(
          focusKeys.todayPlan(todayDate)
        );
        const previousBacklog = queryClient.getQueryData<BacklogResponse>(
          focusKeys.backlog()
        );

        // Optimistically update today's plan
        if (previousTodayPlan) {
          queryClient.setQueryData<TodaysPlanResponse>(
            focusKeys.todayPlan(todayDate),
            (old) => {
              if (!old) return old;

              // Handle clearing current focus (isCurrentFocus: false)
              const isClearingFocus = old.currentFocus?.id === id && data.isCurrentFocus === false;

              if (isClearingFocus && old.currentFocus) {
                // Move current focus back to scheduled items
                const clearedItem = {
                  ...old.currentFocus,
                  ...data,
                  isCurrentFocus: false,
                  status: 'pending' as const,
                  updatedAt: new Date().toISOString(),
                };
                return {
                  ...old,
                  currentFocus: null,
                  scheduledItems: [clearedItem, ...old.scheduledItems],
                };
              }

              // Handle uncomplete (status: 'pending') - add back to scheduled items
              if (data.status === 'pending') {
                // Find the item we're uncompleting (might need to add it back)
                const isUncompleting = old.scheduledItems.some(
                  (item) => item.id === id && item.status === 'completed'
                );
                if (isUncompleting) {
                  return {
                    ...old,
                    scheduledItems: old.scheduledItems.map((item) =>
                      item.id === id
                        ? { ...item, ...data, status: 'pending' as const, completedAt: null, updatedAt: new Date().toISOString() }
                        : item
                    ),
                    completedTodayCount: Math.max(0, old.completedTodayCount - 1),
                  };
                }
              }

              return {
                ...old,
                currentFocus: old.currentFocus?.id === id
                  ? { ...old.currentFocus, ...data, updatedAt: new Date().toISOString() }
                  : old.currentFocus,
                scheduledItems: old.scheduledItems.map((item) =>
                  item.id === id
                    ? { ...item, ...data, updatedAt: new Date().toISOString() }
                    : item
                ),
              };
            }
          );
        }

        // Optimistically update backlog
        if (previousBacklog) {
          queryClient.setQueryData<BacklogResponse>(
            focusKeys.backlog(),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                items: old.items.map((item) =>
                  item.id === id
                    ? { ...item, ...data, updatedAt: new Date().toISOString() }
                    : item
                ),
              };
            }
          );
        }

        return { previousTodayPlan, previousBacklog };
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousTodayPlan) {
          queryClient.setQueryData(focusKeys.todayPlan(todayDate), context.previousTodayPlan);
        }
        if (context?.previousBacklog) {
          queryClient.setQueryData(focusKeys.backlog(), context.previousBacklog);
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}

// ============================================
// Set Current Focus
// ============================================

/**
 * Hook to set an item as the current focus
 *
 * @example
 * ```tsx
 * const { mutate: setFocus } = useSetCurrentFocus();
 * setFocus('focus-123');
 * ```
 */
export function useSetCurrentFocus() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<FocusItem, string>(
    (id) => focusService.setCurrentFocus(id),
    {
      successMessage: 'Current focus set',
      showSuccessToast: true,
      errorMessage: 'Failed to set current focus',
      optimisticUpdate: {
        queryKey: focusKeys.todayPlan(todayDate),
        getOptimisticData: (id, currentData) => {
          const data = currentData as TodaysPlanResponse | undefined;
          if (!data) return data;

          // Find the item being set as current focus
          const newFocusItem = data.scheduledItems.find((item) => item.id === id);
          if (!newFocusItem) return data;

          return {
            ...data,
            // Previous current focus goes back to scheduled items
            currentFocus: {
              ...newFocusItem,
              isCurrentFocus: true,
              status: 'in_progress',
              focusStartedAt: new Date().toISOString(),
            },
            scheduledItems: data.scheduledItems
              .filter((item) => item.id !== id)
              .concat(
                data.currentFocus
                  ? [{
                      ...data.currentFocus,
                      isCurrentFocus: false,
                      status: 'pending' as const,
                      focusStartedAt: null,
                    }]
                  : []
              ),
          };
        },
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}

// ============================================
// Complete Focus Item
// ============================================

/**
 * Hook to mark a focus item as completed
 *
 * @example
 * ```tsx
 * const { mutate: complete } = useCompleteFocusItem();
 *
 * // Complete with actual time spent
 * complete({ id: 'focus-123', actualMinutes: 45 });
 * ```
 */
export function useCompleteFocusItem() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<FocusItem, { id: string; actualMinutes?: number }>(
    ({ id, actualMinutes }) => focusService.complete(id, actualMinutes),
    {
      successMessage: 'Item completed!',
      showSuccessToast: true,
      errorMessage: 'Failed to complete item',
      optimisticUpdate: {
        queryKey: focusKeys.todayPlan(todayDate),
        getOptimisticData: ({ id }, currentData) => {
          const data = currentData as TodaysPlanResponse | undefined;
          if (!data) return data;

          const wasCurrentFocus = data.currentFocus?.id === id;

          return {
            ...data,
            currentFocus: wasCurrentFocus ? null : data.currentFocus,
            scheduledItems: data.scheduledItems.filter((item) => item.id !== id),
            completedTodayCount: data.completedTodayCount + 1,
          };
        },
      },
      onSettled: () => {
        // Invalidate all focus queries and force refetch progress summary
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
        // Explicitly refetch summary queries to ensure updated stats
        void queryClient.refetchQueries({ queryKey: focusKeys.summary('today') });
        void queryClient.refetchQueries({ queryKey: focusKeys.summary('week') });
      },
    }
  );
}

// ============================================
// Defer Focus Item
// ============================================

/**
 * Hook to defer a focus item to another date
 *
 * @example
 * ```tsx
 * const { mutate: defer } = useDeferFocusItem();
 *
 * defer({
 *   id: 'focus-123',
 *   deferToDate: '2024-12-27',
 * });
 * ```
 */
export function useDeferFocusItem() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<FocusItem, { id: string; deferToDate: string }>(
    ({ id, deferToDate }) => focusService.defer(id, { deferToDate } as DeferFocusItemRequest),
    {
      successMessage: (data) => `Deferred to ${data.deferredTo}`,
      showSuccessToast: true,
      errorMessage: 'Failed to defer item',
      optimisticUpdate: {
        queryKey: focusKeys.todayPlan(todayDate),
        getOptimisticData: ({ id }, currentData) => {
          const data = currentData as TodaysPlanResponse | undefined;
          if (!data) return data;

          const wasCurrentFocus = data.currentFocus?.id === id;

          return {
            ...data,
            currentFocus: wasCurrentFocus ? null : data.currentFocus,
            scheduledItems: data.scheduledItems.filter((item) => item.id !== id),
          };
        },
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}

// ============================================
// Delete Focus Item
// ============================================

/**
 * Context for delete optimistic update rollback
 */
interface DeleteFocusItemContext {
  previousTodayPlan?: TodaysPlanResponse;
  previousBacklog?: BacklogResponse;
}

/**
 * Hook to delete a focus item
 *
 * @example
 * ```tsx
 * const { mutate: deleteItem } = useDeleteFocusItem();
 * deleteItem('focus-123');
 * ```
 */
export function useDeleteFocusItem() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<void, string, DeleteFocusItemContext>(
    (id) => focusService.delete(id),
    {
      successMessage: 'Focus item deleted',
      showSuccessToast: true,
      errorMessage: 'Failed to delete focus item',
      onMutate: async (id) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: focusKeys.all });

        // Snapshot previous values
        const previousTodayPlan = queryClient.getQueryData<TodaysPlanResponse>(
          focusKeys.todayPlan(todayDate)
        );
        const previousBacklog = queryClient.getQueryData<BacklogResponse>(
          focusKeys.backlog()
        );

        // Optimistically remove from today's plan
        if (previousTodayPlan) {
          queryClient.setQueryData<TodaysPlanResponse>(
            focusKeys.todayPlan(todayDate),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                currentFocus: old.currentFocus?.id === id ? null : old.currentFocus,
                scheduledItems: old.scheduledItems.filter((item) => item.id !== id),
              };
            }
          );
        }

        // Optimistically remove from backlog
        if (previousBacklog) {
          queryClient.setQueryData<BacklogResponse>(
            focusKeys.backlog(),
            (old) => {
              if (!old) return old;
              const removedItem = old.items.find((item) => item.id === id);
              const newCountByPriority = { ...old.countByPriority };
              if (removedItem && newCountByPriority[removedItem.priority]) {
                newCountByPriority[removedItem.priority]--;
              }
              return {
                ...old,
                items: old.items.filter((item) => item.id !== id),
                totalCount: old.totalCount - 1,
                countByPriority: newCountByPriority,
              };
            }
          );
        }

        return { previousTodayPlan, previousBacklog };
      },
      onError: (_error, _id, context) => {
        // Rollback on error
        if (context?.previousTodayPlan) {
          queryClient.setQueryData(focusKeys.todayPlan(todayDate), context.previousTodayPlan);
        }
        if (context?.previousBacklog) {
          queryClient.setQueryData(focusKeys.backlog(), context.previousBacklog);
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}

// ============================================
// Reorder Focus Items
// ============================================

/**
 * Hook to reorder focus items
 * Used for drag-and-drop reordering
 *
 * @example
 * ```tsx
 * const { mutate: reorder } = useReorderFocusItems();
 *
 * reorder({
 *   items: [
 *     { id: 'focus-1', sortOrder: 1 },
 *     { id: 'focus-2', sortOrder: 2 },
 *     { id: 'focus-3', sortOrder: 3 },
 *   ],
 * });
 * ```
 */
export function useReorderFocusItems() {
  const queryClient = useQueryClient();
  const todayDate = focusService.getTodayDateString();

  return useApiMutation<void, ReorderFocusItemsRequest>(
    (request) => focusService.reorder(request),
    {
      errorMessage: 'Failed to reorder items',
      optimisticUpdate: {
        queryKey: focusKeys.todayPlan(todayDate),
        getOptimisticData: (request, currentData) => {
          const data = currentData as TodaysPlanResponse | undefined;
          if (!data) return data;

          // Create a map of id -> sortOrder
          const sortOrderMap = new Map(
            request.items.map((item) => [item.id, item.sortOrder])
          );

          return {
            ...data,
            scheduledItems: [...data.scheduledItems]
              .map((item) => ({
                ...item,
                sortOrder: sortOrderMap.get(item.id) ?? item.sortOrder,
              }))
              .sort((a, b) => a.sortOrder - b.sortOrder),
          };
        },
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: focusKeys.all });
      },
    }
  );
}
