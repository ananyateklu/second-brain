/**
 * Standardized API Mutation Hook
 * Provides consistent mutation patterns with built-in error handling and optimistic updates
 */

import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQueryClient,
  QueryKey,
} from '@tanstack/react-query';
import { ApiError, isApiError } from '../types/api';
import { toast } from './use-toast';

/**
 * Optimistic update configuration
 */
export interface OptimisticUpdateConfig<TData, TVariables, TContext> {
  /**
   * Query key to update optimistically
   */
  queryKey: QueryKey;
  
  /**
   * Function to compute optimistic data
   */
  getOptimisticData: (variables: TVariables, currentData: TData | undefined) => TData;
  
  /**
   * Function to rollback on error
   */
  rollback?: (context: TContext | undefined) => void;
}

/**
 * Extended mutation options with additional configuration
 */
export interface UseApiMutationOptions<TData, TVariables, TContext = unknown>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables, TContext>, 'mutationFn'> {
  /**
   * Success message for toast
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  
  /**
   * Error message for toast
   */
  errorMessage?: string | ((error: ApiError) => string);
  
  /**
   * Whether to show success toast
   */
  showSuccessToast?: boolean;
  
  /**
   * Whether to show error toast
   */
  showErrorToast?: boolean;
  
  /**
   * Query keys to invalidate on success
   */
  invalidateQueries?: QueryKey[];
  
  /**
   * Optimistic update configuration
   */
  optimisticUpdate?: OptimisticUpdateConfig<unknown, TVariables, TContext>;
}

/**
 * Extended mutation result with additional helpers
 */
export type UseApiMutationResult<TData, TVariables, TContext = unknown> = 
  UseMutationResult<TData, ApiError, TVariables, TContext> & {
  /**
   * Check if the error is an API error
   */
  isApiError: boolean;
  
  /**
   * Get typed API error
   */
  apiError: ApiError | null;
  
  /**
   * Check if error is an auth error
   */
  isAuthError: boolean;
  
  /**
   * Check if error is a validation error
   */
  isValidationError: boolean;
};

/**
 * Standardized API mutation hook with error handling and toast notifications
 */
export function useApiMutation<TData, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TVariables, TContext>
): UseApiMutationResult<TData, TVariables, TContext> {
  const queryClient = useQueryClient();
  
  const {
    successMessage,
    errorMessage,
    showSuccessToast = false,
    showErrorToast = true,
    invalidateQueries,
    optimisticUpdate,
    onSuccess,
    onError,
    onMutate,
    onSettled,
    ...mutationOptions
  } = options || {};

  const result = useMutation<TData, ApiError, TVariables, TContext>({
    mutationFn,
    
    onMutate: async (variables) => {
      let context: TContext | undefined;
      
      // Handle optimistic updates
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });
        
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        const optimisticData = optimisticUpdate.getOptimisticData(variables, previousData);
        
        queryClient.setQueryData(optimisticUpdate.queryKey, optimisticData);
        
        context = { previousData } as TContext;
      }
      
      // Call original onMutate if provided (use simpler signature)
      if (onMutate) {
        const userContext = await (onMutate as (variables: TVariables) => Promise<TContext | void>)(variables);
        if (userContext !== undefined) {
          context = { ...context, ...userContext } as TContext;
        }
      }
      
      return context as TContext;
    },
    
    onSuccess: (data, variables, context) => {
      // Show success toast
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function'
          ? successMessage(data, variables)
          : successMessage;
        toast.success(message);
      }
      
      // Invalidate queries
      if (invalidateQueries) {
        for (const queryKey of invalidateQueries) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
      
      // Call original onSuccess (use simpler 3-arg signature)
      if (onSuccess) {
        (onSuccess as (data: TData, variables: TVariables, context: TContext | undefined) => void)(data, variables, context);
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (optimisticUpdate?.rollback) {
        optimisticUpdate.rollback(context);
      } else if (optimisticUpdate && context) {
        const ctx = context as { previousData?: unknown };
        if (ctx.previousData !== undefined) {
          queryClient.setQueryData(optimisticUpdate.queryKey, ctx.previousData);
        }
      }
      
      // Show error toast
      if (showErrorToast) {
        const message = errorMessage
          ? typeof errorMessage === 'function'
            ? errorMessage(error)
            : errorMessage
          : error.message;
        toast.error('Error', message);
      }
      
      // Call original onError (use simpler 3-arg signature)
      if (onError) {
        (onError as (error: ApiError, variables: TVariables, context: TContext | undefined) => void)(error, variables, context);
      }
    },
    
    onSettled: (data, error, variables, context) => {
      // Refetch to ensure consistency after optimistic updates
      if (optimisticUpdate) {
        queryClient.invalidateQueries({ queryKey: optimisticUpdate.queryKey });
      }
      
      // Call original onSettled (use simpler 4-arg signature)
      if (onSettled) {
        (onSettled as (data: TData | undefined, error: ApiError | null, variables: TVariables, context: TContext | undefined) => void)(data, error, variables, context);
      }
    },
    
    ...mutationOptions,
  });

  // Determine error type
  const isApiErrorType = result.error ? isApiError(result.error) : false;
  const apiError = isApiErrorType ? result.error : null;
  const isAuthError = apiError?.isAuthError() || false;
  const isValidationError = apiError?.isValidationError() || false;

  return {
    ...result,
    isApiError: isApiErrorType,
    apiError,
    isAuthError,
    isValidationError,
  };
}

/**
 * Create a typed mutation hook factory
 */
export function createMutationHook<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  defaultOptions?: UseApiMutationOptions<TData, TVariables>
) {
  return function useGeneratedMutation(
    options?: UseApiMutationOptions<TData, TVariables>
  ): UseApiMutationResult<TData, TVariables> {
    return useApiMutation<TData, TVariables>(mutationFn, {
      ...defaultOptions,
      ...options,
    });
  };
}

/**
 * Create mutation with automatic query invalidation
 */
export function useMutationWithInvalidation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKeys: QueryKey[],
  options?: Omit<UseApiMutationOptions<TData, TVariables>, 'invalidateQueries'>
): UseApiMutationResult<TData, TVariables> {
  return useApiMutation<TData, TVariables>(mutationFn, {
    ...options,
    invalidateQueries: queryKeys,
  });
}

