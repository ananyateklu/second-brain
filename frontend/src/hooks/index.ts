/**
 * Hooks Index
 * Re-exports all custom hooks
 */

// Toast hook
export { toast, useToast } from './use-toast';

// API hooks
export { useApiQuery, createQueryHook, useConditionalQuery, usePollingQuery } from './use-api-query';
export type { UseApiQueryOptions, UseApiQueryResult } from './use-api-query';

export { useApiMutation, createMutationHook, useMutationWithInvalidation } from './use-api-mutation';
export type { UseApiMutationOptions, UseApiMutationResult, OptimisticUpdateConfig } from './use-api-mutation';

export { useOptimisticListUpdate, useOptimisticItemUpdate, useOptimisticUpdate } from './use-optimistic-update';
export type { OptimisticListConfig, OptimisticItemConfig, OptimisticUpdateResult } from './use-optimistic-update';

