/**
 * Optimistic Update Hook
 * Provides reusable optimistic update patterns for React Query mutations
 */

import { useCallback } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

/**
 * List operation types for optimistic updates
 */
export type ListOperation = 'add' | 'update' | 'remove';

/**
 * Configuration for optimistic list update
 */
export interface OptimisticListConfig<TItem> {
  /**
   * Query key for the list
   */
  queryKey: QueryKey;
  
  /**
   * Get item ID for comparison
   */
  getId: (item: TItem) => string;
  
  /**
   * Position for new items ('start' or 'end')
   */
  addPosition?: 'start' | 'end';
}

/**
 * Result of optimistic update operation
 */
export interface OptimisticUpdateResult<TItem> {
  previousData: TItem[] | undefined;
  rollback: () => void;
}

/**
 * Hook for optimistic list updates
 */
export function useOptimisticListUpdate<TItem>(config: OptimisticListConfig<TItem>) {
  const queryClient = useQueryClient();
  const { queryKey, getId, addPosition = 'start' } = config;

  /**
   * Add item optimistically
   */
  const addItem = useCallback(
    async (newItem: TItem): Promise<OptimisticUpdateResult<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      queryClient.setQueryData<TItem[]>(queryKey, (old) => {
        if (!old) return [newItem];
        return addPosition === 'start' ? [newItem, ...old] : [...old, newItem];
      });
      
      return {
        previousData,
        rollback: () => {
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);
          }
        },
      };
    },
    [queryClient, queryKey, addPosition]
  );

  /**
   * Update item optimistically
   */
  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<TItem>
    ): Promise<OptimisticUpdateResult<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      queryClient.setQueryData<TItem[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((item) =>
          getId(item) === itemId ? { ...item, ...updates } : item
        );
      });
      
      return {
        previousData,
        rollback: () => {
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);
          }
        },
      };
    },
    [queryClient, queryKey, getId]
  );

  /**
   * Remove item optimistically
   */
  const removeItem = useCallback(
    async (itemId: string): Promise<OptimisticUpdateResult<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      queryClient.setQueryData<TItem[]>(queryKey, (old) => {
        if (!old) return old;
        return old.filter((item) => getId(item) !== itemId);
      });
      
      return {
        previousData,
        rollback: () => {
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);
          }
        },
      };
    },
    [queryClient, queryKey, getId]
  );

  /**
   * Replace entire list optimistically
   */
  const replaceList = useCallback(
    async (newList: TItem[]): Promise<OptimisticUpdateResult<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      queryClient.setQueryData<TItem[]>(queryKey, newList);
      
      return {
        previousData,
        rollback: () => {
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);
          }
        },
      };
    },
    [queryClient, queryKey]
  );

  /**
   * Invalidate list to refetch from server
   */
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    addItem,
    updateItem,
    removeItem,
    replaceList,
    invalidateList,
  };
}

/**
 * Configuration for optimistic single item update
 */
export interface OptimisticItemConfig {
  /**
   * Query key factory for item
   */
  getQueryKey: (id: string) => QueryKey;
}

/**
 * Hook for optimistic single item updates
 */
export function useOptimisticItemUpdate<TItem>(config: OptimisticItemConfig) {
  const queryClient = useQueryClient();
  const { getQueryKey } = config;

  /**
   * Update item optimistically
   */
  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<TItem>
    ): Promise<{ previousData: TItem | undefined; rollback: () => void }> => {
      const queryKey = getQueryKey(itemId);
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TItem>(queryKey);
      
      queryClient.setQueryData<TItem>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
      
      return {
        previousData,
        rollback: () => {
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);
          }
        },
      };
    },
    [queryClient, getQueryKey]
  );

  /**
   * Set item data
   */
  const setItem = useCallback(
    (itemId: string, data: TItem) => {
      const queryKey = getQueryKey(itemId);
      queryClient.setQueryData(queryKey, data);
    },
    [queryClient, getQueryKey]
  );

  /**
   * Remove item from cache
   */
  const removeItem = useCallback(
    (itemId: string) => {
      const queryKey = getQueryKey(itemId);
      queryClient.removeQueries({ queryKey });
    },
    [queryClient, getQueryKey]
  );

  /**
   * Invalidate item to refetch
   */
  const invalidateItem = useCallback(
    (itemId: string) => {
      const queryKey = getQueryKey(itemId);
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, getQueryKey]
  );

  return {
    updateItem,
    setItem,
    removeItem,
    invalidateItem,
  };
}

/**
 * Generic optimistic update helper
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  /**
   * Perform optimistic update with automatic rollback
   */
  const optimisticUpdate = useCallback(
    async <TData>(
      queryKey: QueryKey,
      updater: (currentData: TData | undefined) => TData
    ): Promise<{ previousData: TData | undefined; rollback: () => void }> => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TData>(queryKey);
      const newData = updater(previousData);
      
      queryClient.setQueryData<TData>(queryKey, newData);
      
      return {
        previousData,
        rollback: () => {
          queryClient.setQueryData(queryKey, previousData);
        },
      };
    },
    [queryClient]
  );

  return { optimisticUpdate };
}

