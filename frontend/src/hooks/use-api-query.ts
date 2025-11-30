/**
 * Standardized API Query Hook
 * Provides consistent query patterns with built-in error handling and loading states
 */

import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from '@tanstack/react-query';
import { ApiError, isApiError } from '../types/api';
import { CACHE } from '../lib/constants';

/**
 * Extended query options with additional configuration
 */
export interface UseApiQueryOptions<TData, TError = ApiError>
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  /**
   * Custom error handler
   */
  onError?: (error: TError) => void;
  
  /**
   * Whether to show toast on error
   */
  showErrorToast?: boolean;
  
  /**
   * Custom error message for toast
   */
  errorMessage?: string;
}

/**
 * Extended query result with additional helpers
 */
export type UseApiQueryResult<TData, TError = ApiError> = 
  UseQueryResult<TData, TError> & {
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
   * Check if error is a not found error
   */
  isNotFoundError: boolean;
};

/**
 * Standardized API query hook with error handling
 */
export function useApiQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseApiQueryOptions<TData, TError>
): UseApiQueryResult<TData, TError> {
  const {
    onError: _onError,
    showErrorToast: _showErrorToast = false,
    errorMessage: _errorMessage,
    ...queryOptions
  } = options || {};

  const result = useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    staleTime: CACHE.STALE_TIME,
    gcTime: CACHE.GC_TIME,
    retry: (failureCount, error) => {
      // Don't retry on auth errors or not found
      if (isApiError(error)) {
        if (error.isAuthError() || error.code === 'NOT_FOUND') {
          return false;
        }
      }
      return failureCount < 2;
    },
    ...queryOptions,
  });

  // Determine error type
  const isApiErrorType = result.error ? isApiError(result.error) : false;
  const apiError = isApiErrorType ? (result.error as unknown as ApiError) : null;
  const isAuthError = apiError?.isAuthError() || false;
  const isNotFoundError = apiError?.code === 'NOT_FOUND';

  return {
    ...result,
    isApiError: isApiErrorType,
    apiError,
    isAuthError,
    isNotFoundError,
  };
}

/**
 * Create a typed query hook factory
 */
export function createQueryHook<TData, TParams = void>(
  getQueryKey: (params: TParams) => QueryKey,
  queryFn: (params: TParams) => Promise<TData>,
  defaultOptions?: UseApiQueryOptions<TData>
) {
  return function useGeneratedQuery(
    params: TParams,
    options?: UseApiQueryOptions<TData>
  ): UseApiQueryResult<TData> {
    const queryKey = getQueryKey(params);
    
    return useApiQuery<TData>(
      queryKey,
      () => queryFn(params),
      {
        ...defaultOptions,
        ...options,
      }
    );
  };
}

/**
 * Conditional query hook - only runs when condition is true
 */
export function useConditionalQuery<TData, TError = ApiError>(
  condition: boolean,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseApiQueryOptions<TData, TError>
): UseApiQueryResult<TData, TError> {
  return useApiQuery<TData, TError>(queryKey, queryFn, {
    ...options,
    enabled: condition && (options?.enabled !== false),
  });
}

/**
 * Polling query hook - refetches at interval
 */
export function usePollingQuery<TData, TError = ApiError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  intervalMs: number,
  options?: UseApiQueryOptions<TData, TError>
): UseApiQueryResult<TData, TError> {
  return useApiQuery<TData, TError>(queryKey, queryFn, {
    ...options,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  });
}

