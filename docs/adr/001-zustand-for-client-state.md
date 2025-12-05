# ADR 001: Zustand for Client State Management

## Status

Accepted

## Context

Second Brain is a complex application with multiple features (notes, chat, AI agents, RAG) that require client-side state management. We needed a solution that:

1. Is lightweight and performant
2. Works well with React 18+ concurrent features
3. Has excellent TypeScript support
4. Is easy to test
5. Supports persistence (for auth tokens, user preferences)
6. Has minimal boilerplate compared to Redux

We evaluated several options:

- **Redux Toolkit** - Industry standard, but verbose even with RTK
- **Zustand** - Minimal API, great TypeScript support, tiny bundle
- **Jotai** - Atomic state, good for fine-grained reactivity
- **Recoil** - Facebook's solution, but still experimental
- **MobX** - Observable-based, steep learning curve

## Decision

We will use **Zustand** for client-side state management.

Zustand is used for:

- Authentication state (user, token, auth status)
- User preferences/settings (theme, view preferences)
- UI state (modal visibility, sidebar state, search state)
- Theme management (light/dark/blue modes)

Server state (notes, conversations, AI health) is managed separately by TanStack Query (see ADR-002).

### Implementation Pattern

```typescript
// Store with typed state and actions
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => { /* ... */ },
      signOut: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);

// Selectors for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
```

## Consequences

### Positive

- **Minimal bundle size** - ~1KB gzipped vs ~10KB+ for Redux
- **Simple API** - No actions, reducers, or dispatch; just functions
- **TypeScript-first** - Excellent type inference out of the box
- **Works outside React** - Can access store in service layers
- **Built-in middleware** - Persist, devtools, immer available
- **No context provider needed** - Simpler component tree
- **Selective subscriptions** - Fine-grained reactivity with selectors

### Negative

- **Less tooling** - Redux DevTools integration requires extra setup
- **Less ecosystem** - Fewer middleware and extensions than Redux
- **Manual optimization** - Need to write selectors for optimal performance
- **Less familiarity** - Some developers may be more familiar with Redux

### Neutral

- Requires discipline to separate client state (Zustand) from server state (TanStack Query)
- Store structure is flexible, requiring team conventions for consistency
