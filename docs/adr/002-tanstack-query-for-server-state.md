# ADR 002: TanStack Query for Server State

## Status

Accepted

## Context

Second Brain needs to fetch, cache, and synchronize data from the backend API, including:

- Notes (CRUD operations with optimistic updates)
- Chat conversations and messages
- AI provider health status
- RAG analytics and indexing status
- User preferences

We needed a solution that handles:

1. Caching and cache invalidation
2. Background refetching
3. Optimistic updates with rollback
4. Loading and error states
5. Pagination and infinite scrolling
6. Request deduplication

We evaluated:

- **TanStack Query (React Query)** - Purpose-built for server state
- **SWR** - Vercel's solution, simpler but less features
- **RTK Query** - Part of Redux Toolkit
- **Apollo Client** - GraphQL-focused, overkill for REST
- **Custom hooks with useState** - Too much boilerplate

## Decision

We will use **TanStack Query v5** for all server state management.

### Clear Separation of Concerns

| State Type | Solution | Examples |
|------------|----------|----------|
| Server State | TanStack Query | Notes, conversations, AI health |
| Client State | Zustand | Auth, UI state, preferences |

### Implementation Patterns

**Query Keys Factory:**

```typescript
// lib/query-keys.ts
export const queryKeys = {
  notes: {
    all: ['notes'] as const,
    lists: () => [...queryKeys.notes.all, 'list'] as const,
    list: (filters: NoteFilters) => [...queryKeys.notes.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.notes.all, 'detail', id] as const,
  },
} as const;
```

**Query Hook:**

```typescript
export function useNotes(filters?: NoteFilters) {
  return useQuery({
    queryKey: queryKeys.notes.list(filters ?? {}),
    queryFn: () => notesService.getAll(filters),
    staleTime: 30_000, // 30 seconds
  });
}
```

**Mutation with Optimistic Update:**

```typescript
export function useCreateNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notesService.create,
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notes.all });
      const previous = queryClient.getQueryData(queryKeys.notes.lists());
      queryClient.setQueryData(queryKeys.notes.lists(), (old) => [...old, newNote]);
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKeys.notes.lists(), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}
```

## Consequences

### Positive

- **Automatic caching** - Reduces redundant API calls
- **Background refetching** - Data stays fresh automatically
- **Optimistic updates** - Instant UI feedback with automatic rollback
- **DevTools** - Excellent debugging with React Query DevTools
- **Request deduplication** - Multiple components can share the same query
- **Built-in loading/error states** - Reduces boilerplate
- **Infinite queries** - Built-in pagination support
- **Prefetching** - Can preload data for anticipated navigation

### Negative

- **Learning curve** - Concepts like stale time, cache time require understanding
- **Query key management** - Need discipline to structure keys consistently
- **Overhead for simple cases** - May be overkill for single-use fetches

### Neutral

- Requires TypeScript discipline to type query functions and returns
- Cache invalidation strategy needs to be thought through per-feature
