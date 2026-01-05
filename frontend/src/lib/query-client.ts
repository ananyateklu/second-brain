import { QueryClient } from '@tanstack/react-query';
import { hashQueryKey } from './query-key-normalizer';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      queryKeyHashFn: hashQueryKey,
    },
    mutations: {
      retry: 0,
    },
  },
});
