# Second Brain - Frontend Performance & Modernization Guide

> **Comprehensive guide for optimizing and modernizing the React 19 frontend**

## Implementation Status Overview

> **Last Updated:** December 2024  
> **Overall Progress:** ~60% Complete

| Category | Status | Progress |
|----------|--------|----------|
| React 19 New Features | 🟡 Partial | 2/6 hooks adopted |
| Performance Optimizations | ✅ Mostly Done | 6/8 patterns implemented |
| Build & Bundle | ✅ Done | Chunking, lazy loading complete |
| State Management | ✅ Done | Zustand slices, TanStack Query |
| Testing & Quality | 🔴 Pending | Not yet started |
| Accessibility | 🔴 Pending | Not yet started |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [React 19 New Features](#react-19-new-features)
4. [Performance Optimizations](#performance-optimizations)
5. [State Management Improvements](#state-management-improvements)
6. [Build & Bundle Optimizations](#build--bundle-optimizations)
7. [Testing Strategy](#testing-strategy)
8. [Code Quality & Maintainability](#code-quality--maintainability)
9. [Accessibility Improvements](#accessibility-improvements)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The Second Brain frontend is already built on a modern stack (React 19.2.1, Vite 7, TanStack Query v5, Zustand 5). This guide identifies opportunities to leverage new React 19 features, optimize performance further, and improve maintainability.

### Key Recommendations Summary

| Priority | Area | Impact | Effort | Status |
|----------|------|--------|--------|--------|
| **High** | React Compiler adoption | 🟢 High | 🟡 Medium | 🔴 Pending |
| **High** | `use()` hook for data loading | 🟢 High | 🟡 Medium | 🔴 Pending |
| **High** | `useOptimistic` for mutations | 🟢 High | 🟢 Low | 🔴 Pending |
| **High** | `useTransition` for expensive updates | 🟢 High | 🟢 Low | ✅ **Done** |
| **Medium** | Form Actions & `useActionState` | 🟡 Medium | 🟡 Medium | 🔴 Pending |
| **Medium** | Enhanced Suspense boundaries | 🟡 Medium | 🟢 Low | ✅ **Done** |
| **Medium** | React Query prefetching | 🟡 Medium | 🟢 Low | ✅ **Done** |
| **Low** | Web Vitals monitoring | 🟢 High | 🟡 Medium | 🔴 Pending |
| **Low** | Progressive image loading | 🟡 Medium | 🟢 Low | 🔴 Pending |

---

## Current State Analysis

### Tech Stack ✅

```text
React 19.2.1          - Latest stable release
Vite 7.2.6            - Latest with HMR
TanStack Query 5.90   - Latest with devtools
Zustand 5.0.9         - Latest with TypeScript
TypeScript 5.9.3      - Latest features
Tailwind CSS 4.1.17   - New v4 architecture
```

### What's Already Done Well ✅

1. **Code Splitting** - Lazy loading pages via `router.tsx`
2. **Web Workers** - Markdown, search, token counting offloaded (`workers/`)
3. **Memoization** - `memo()` used on heavy components like `NoteCard`
4. **Optimistic Updates** - TanStack Query mutations with rollback
5. **Virtualization** - `@tanstack/react-virtual` for long lists (`VirtualizedNoteList`, `VirtualizedConversationList`)
6. **Standardized Hooks** - `useApiQuery`, `useApiMutation` abstractions
7. **Error Boundaries** - Multiple variants (full, inline, feature)
8. **Design System** - Token-based primitives
9. **Route Prefetching** - TanStack Query prefetching in route loaders (`router.tsx`)
10. **`useTransition`** - Used in `use-chat-stream.ts` for non-blocking streaming state
11. **`useDeferredValue`** - Used in `NotesPage.tsx` for search query deferral
12. **Granular Suspense** - Skeleton components for Chat sidebar, header, messages (`components/skeletons/`)
13. **Bundle Chunking** - Manual chunks in `vite.config.ts` for react, router, state, editor, markdown

### Opportunities for Improvement 🎯 (Remaining Items)

1. ~~React 19 new hooks not yet adopted~~ → `useTransition` and `useDeferredValue` adopted; `use()`, `useOptimistic`, `useActionState` still pending
2. React Compiler not enabled (waiting for stability)
3. ~~Missing `useTransition` for expensive state updates~~ → ✅ Done in `use-chat-stream.ts`
4. ~~Some components could benefit from better Suspense boundaries~~ → ✅ Done with skeleton components
5. ~~Bundle can be further optimized with tree-shaking~~ → ✅ Manual chunks implemented
6. Missing Web Vitals monitoring
7. Missing progressive image loading component

---

## React 19 New Features

> **Status:** 2/6 features adopted (`useTransition`, `useDeferredValue`)

### 1. The `use()` Hook 🔴 NOT IMPLEMENTED

React 19's `use()` hook enables reading resources (Promises, Context) directly in render, replacing many `useEffect` patterns.

#### Current Pattern (use-ai-health.ts)

```typescript
// Current: TanStack Query based
export function useAIHealth() {
  return useQuery({
    queryKey: ['ai', 'health'],
    queryFn: aiService.getHealth,
    staleTime: 30000,
  });
}
```

#### New Pattern with `use()` for Simple Cases

```typescript
// New: For one-off data that doesn't need caching
import { use, Suspense } from 'react';

// Wrap in Suspense at parent level
function AIHealthStatus() {
  const health = use(aiService.getHealth());
  return <StatusIndicator status={health} />;
}

// Usage
<Suspense fallback={<HealthSkeleton />}>
  <AIHealthStatus />
</Suspense>
```

#### When to Use `use()` vs TanStack Query

| Use Case | Recommendation |
|----------|---------------|
| Cached data with refetch | TanStack Query |
| One-time server data | `use()` with Suspense |
| Context consumption | `use(Context)` |
| Conditional context | `use()` (works in conditionals) |
| Mutations | TanStack Query |

#### Migration Example: Reading Context Conditionally

```typescript
// Before: Can't use context in conditionals
function ChatMessage({ message }) {
  const theme = useThemeStore((s) => s.theme); // Always called
  
  if (message.role === 'system') return null;
  // ...
}

// After: use() works in conditionals
import { use } from 'react';
import { ThemeContext } from './contexts';

function ChatMessage({ message }) {
  if (message.role === 'system') return null;
  
  const theme = use(ThemeContext); // Only when needed
  // ...
}
```

### 2. The `useOptimistic` Hook 🔴 NOT IMPLEMENTED

Perfect for instant UI feedback during mutations. Currently, we handle optimistic updates manually in TanStack Query.

#### Current Pattern (use-notes-query.ts)

```typescript
// Current: Manual optimistic update with context
export function useCreateNote() {
  return useApiMutation<Note, CreateNoteInput>(
    (note) => notesService.create(note),
    {
      optimisticUpdate: {
        queryKey: notesKeys.all,
        getOptimisticData: (newNote, currentData) => {
          const notes = (currentData as Note[] | undefined) ?? [];
          const optimisticNote: Note = {
            id: `temp-${Date.now()}`,
            ...newNote,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [optimisticNote, ...notes];
        },
      },
    }
  );
}
```

#### New Pattern with `useOptimistic`

```typescript
// New: React 19's useOptimistic for simpler optimistic UI
import { useOptimistic, useTransition } from 'react';

function NotesPage() {
  const { data: notes = [] } = useNotes();
  const createNote = useCreateNote();
  const [isPending, startTransition] = useTransition();
  
  const [optimisticNotes, addOptimisticNote] = useOptimistic(
    notes,
    (state, newNote: CreateNoteInput) => [
      {
        id: `temp-${Date.now()}`,
        ...newNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Note,
      ...state,
    ]
  );

  const handleCreateNote = (note: CreateNoteInput) => {
    startTransition(async () => {
      addOptimisticNote(note);
      await createNote.mutateAsync(note);
    });
  };

  return (
    <NoteList 
      notes={optimisticNotes} 
      isCreating={isPending}
      onCreateNote={handleCreateNote}
    />
  );
}
```

#### Benefits of `useOptimistic`

- Simpler API than manual cache manipulation
- Automatic rollback on failure
- Works with React Suspense
- Type-safe reducer pattern

### 3. The `useTransition` Hook ✅ IMPLEMENTED

> **Implementation:** `frontend/src/features/chat/hooks/use-chat-stream.ts`
>
> Used for non-blocking state updates during streaming, keeping the chat input responsive while processing AI responses.

Use for expensive state updates to keep UI responsive.

#### Current Pattern (ChatPage.tsx)

```typescript
// Current: Direct state updates can block UI
const handleSendMessage = async (content: string) => {
  setInputValue(''); // Immediate
  await handleSendMessage(content); // Can be slow
};
```

#### New Pattern with `useTransition`

```typescript
import { useTransition } from 'react';

function ChatPage() {
  const [isPending, startTransition] = useTransition();
  
  const handleSendMessage = (content: string) => {
    // High-priority update - clears input immediately
    setInputValue('');
    
    // Low-priority update - doesn't block typing
    startTransition(async () => {
      await sendMessage(content);
    });
  };

  return (
    <ChatInput 
      disabled={isPending} 
      isLoading={isPending}
    />
  );
}
```

#### Where to Apply `useTransition`

| Component | Expensive Operation | Benefit |
|-----------|-------------------|---------|
| `ChatPage` | Sending messages | Keep input responsive |
| `NotesPage` | Filtering/searching | Smooth typing |
| `DashboardPage` | Chart data updates | No janky charts |
| `RagAnalyticsPage` | Log filtering | Fast filter UI |

### 4. Form Actions with `useActionState` 🔴 NOT IMPLEMENTED

React 19 introduces form Actions for better form handling.

#### Current Pattern (LoginPage)

```typescript
// Current: Manual form handling with react-hook-form
function LoginPage() {
  const { register, handleSubmit, formState } = useForm<LoginInput>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login(data);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* inputs */}
    </form>
  );
}
```

#### New Pattern with `useActionState`

```typescript
import { useActionState } from 'react';

// Action function (can be server action in RSC apps)
async function loginAction(
  prevState: { error: string | null },
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  try {
    await authService.login({ email, password });
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    { error: null }
  );

  return (
    <form action={formAction}>
      <Input name="email" type="email" required />
      <Input name="password" type="password" required />
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

#### Benefits of Form Actions

- Progressive enhancement (works without JS)
- Built-in pending states
- Automatic form reset on success
- Works with `useFormStatus` for nested submit buttons

### 5. The `useFormStatus` Hook 🔴 NOT IMPLEMENTED

Access form state from nested components.

```typescript
// New: Nested submit button with loading state
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending, data, method, action } = useFormStatus();
  
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoadingSpinner /> : children}
    </Button>
  );
}

// Usage - no prop drilling needed
function LoginForm() {
  return (
    <form action={loginAction}>
      <Input name="email" />
      <Input name="password" />
      <SubmitButton>Sign In</SubmitButton>
    </form>
  );
}
```

### 6. The `useDeferredValue` Hook ✅ IMPLEMENTED

> **Implementation:** `frontend/src/pages/NotesPage.tsx`
>
> Used to defer search query updates to keep typing responsive while filtering notes.

Defer expensive re-renders for derived values.

#### Current Pattern (ChatMessageList)

```typescript
// Current: Messages filter runs on every render
function ChatMessageList({ messages, searchQuery }) {
  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return <VirtualList items={filteredMessages} />;
}
```

#### New Pattern with `useDeferredValue`

```typescript
import { useDeferredValue, useMemo } from 'react';

function ChatMessageList({ messages, searchQuery }) {
  // Defer the search query to keep input responsive
  const deferredQuery = useDeferredValue(searchQuery);
  
  const filteredMessages = useMemo(() => 
    messages.filter(m => 
      m.content.toLowerCase().includes(deferredQuery.toLowerCase())
    ),
    [messages, deferredQuery]
  );
  
  const isStale = searchQuery !== deferredQuery;
  
  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      <VirtualList items={filteredMessages} />
    </div>
  );
}
```

### 7. React Compiler (Experimental) 🔴 NOT IMPLEMENTED

> **Status:** Waiting for React Compiler to reach stable release before adoption.

The React Compiler automatically memoizes components and hooks, eliminating the need for manual `useMemo`, `useCallback`, and `memo()`.

#### Installation

```bash
pnpm add -D babel-plugin-react-compiler
```

#### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            // Compiler options
            target: '19',
          }],
        ],
      },
    }),
  ],
});
```

#### Before/After React Compiler

```typescript
// Before: Manual memoization everywhere
const MemoizedNoteCard = memo(function NoteCard({ note, onDelete }) {
  const handleDelete = useCallback(() => onDelete(note.id), [note.id, onDelete]);
  const formattedDate = useMemo(() => formatDate(note.createdAt), [note.createdAt]);
  
  return (
    <div>
      <h3>{note.title}</h3>
      <time>{formattedDate}</time>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
});

// After: React Compiler handles memoization automatically
function NoteCard({ note, onDelete }) {
  const handleDelete = () => onDelete(note.id);
  const formattedDate = formatDate(note.createdAt);
  
  return (
    <div>
      <h3>{note.title}</h3>
      <time>{formattedDate}</time>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

#### Compiler Compatibility Checklist

- ✅ No class components
- ✅ Pure render functions
- ✅ No direct DOM manipulation
- ⚠️ Review any `useRef` usage that mutates during render
- ⚠️ Remove manual `memo()` calls after enabling

---

## Performance Optimizations

> **Status:** 6/8 patterns implemented

### 1. Enhanced Suspense Boundaries ✅ IMPLEMENTED

> **Implementation:** `frontend/src/pages/ChatPage.tsx`, `frontend/src/components/skeletons/`
>
> Granular Suspense boundaries with skeleton components: `ChatSidebarSkeleton`, `ChatHeaderSkeleton`, `ChatMessagesSkeleton`, `NoteListSkeleton`

#### Current State

```typescript
// router.tsx - Single Suspense wrapper per page
<Suspense fallback={<PageLoader />}>
  <ChatPage />
</Suspense>
```

#### Improved Pattern - Granular Suspense

```typescript
// ChatPage with granular Suspense boundaries
function ChatPage() {
  return (
    <div className="flex">
      {/* Sidebar loads independently */}
      <Suspense fallback={<SidebarSkeleton />}>
        <ChatSidebar />
      </Suspense>
      
      <div className="flex-1 flex flex-col">
        {/* Header with provider status */}
        <Suspense fallback={<HeaderSkeleton />}>
          <ChatHeader />
        </Suspense>
        
        {/* Messages - critical path */}
        <Suspense fallback={<MessagesSkeleton />}>
          <ChatMessageList />
        </Suspense>
        
        {/* Input - always ready */}
        <ChatInputArea />
      </div>
    </div>
  );
}
```

#### Skeleton Components

```typescript
// components/skeletons/ChatSkeleton.tsx
export function SidebarSkeleton() {
  return (
    <div className="w-80 border-r animate-pulse">
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 ? 'justify-end' : ''}`}>
          <div className={`h-20 w-3/4 rounded-2xl bg-gray-200 dark:bg-gray-700`} />
        </div>
      ))}
    </div>
  );
}
```

### 2. TanStack Query Prefetching ✅ IMPLEMENTED

> **Implementation:** `frontend/src/lib/router.tsx`
>
> Route loaders prefetch data for Dashboard (stats + notes), Notes, and Chat pages.

#### Route-Level Prefetching

```typescript
// lib/router.tsx
import { queryClient } from './query-client';
import { notesKeys, conversationKeys } from './query-keys';

const routes = [
  {
    path: '/notes',
    loader: async () => {
      // Prefetch notes while route is loading
      await queryClient.prefetchQuery({
        queryKey: notesKeys.all,
        queryFn: notesService.getAll,
        staleTime: 60000,
      });
      return null;
    },
    element: <NotesPage />,
  },
  {
    path: '/chat',
    loader: async () => {
      // Prefetch conversations list
      await queryClient.prefetchQuery({
        queryKey: conversationKeys.all,
        queryFn: chatService.getConversations,
      });
      return null;
    },
    element: <ChatPage />,
  },
];
```

#### Hover Prefetching

```typescript
// components/Sidebar.tsx
function SidebarLink({ to, children }) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    // Prefetch on hover for instant navigation
    if (to === '/notes') {
      queryClient.prefetchQuery({
        queryKey: notesKeys.all,
        queryFn: notesService.getAll,
      });
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

### 3. Image Optimization 🔴 NOT IMPLEMENTED

> **Status:** Progressive image loading and lazy loading with Intersection Observer not yet implemented.

#### Progressive Image Loading

```typescript
// components/ui/ProgressiveImage.tsx
import { useState, useEffect } from 'react';

interface ProgressiveImageProps {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
}

export function ProgressiveImage({ 
  src, 
  placeholderSrc, 
  alt, 
  className 
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`
        ${className}
        transition-all duration-300
        ${isLoaded ? 'blur-0' : 'blur-sm'}
      `}
    />
  );
}
```

#### Lazy Image Loading with Intersection Observer

```typescript
// hooks/use-lazy-image.ts
import { useState, useEffect, useRef } from 'react';

export function useLazyImage(src: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return { ref: imgRef, isLoaded, shouldLoad: isInView };
}
```

### 4. Virtual Scrolling Improvements ✅ IMPLEMENTED

> **Implementation:** `frontend/src/features/notes/components/VirtualizedNoteList.tsx`, `frontend/src/features/chat/components/VirtualizedConversationList.tsx`
>
> Uses `@tanstack/react-virtual` for efficient rendering of long lists.

#### Current Implementation Review

The codebase uses `@tanstack/react-virtual`. Here's how to optimize it further:

```typescript
// features/notes/components/VirtualizedNoteList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';

export function VirtualizedNoteList({ notes }: { notes: Note[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Memoize estimate size function
  const estimateSize = useMemo(() => {
    // Return function that estimates row height based on content
    return (index: number) => {
      const note = notes[index];
      const hasLongContent = note.content.length > 500;
      return hasLongContent ? 200 : 150;
    };
  }, [notes]);

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5, // Render 5 extra items above/below viewport
    // Enable smooth scrolling for better UX
    scrollToFn: (offset, options, instance) => {
      const element = instance.scrollElement;
      element?.scrollTo({
        top: offset,
        behavior: options.behavior,
      });
    },
  });

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-auto"
      style={{ contain: 'strict' }} // CSS containment for performance
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <NoteCard note={notes[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Web Worker Enhancements ✅ IMPLEMENTED

> **Implementation:** `frontend/src/workers/`
>
> Three workers implemented:
> - `markdown.worker.ts` - Markdown parsing
> - `search.worker.ts` - Note search operations  
> - `token-counter.worker.ts` - Token counting
>
> Hooks: `use-markdown-worker.ts`, `use-search-worker.ts`, `use-token-counter.ts`

#### Current Workers

- `markdown.worker.ts` - Markdown parsing
- `search.worker.ts` - Note search
- `token-counter.worker.ts` - Token counting

#### New: Diff Worker for Version History

```typescript
// workers/diff.worker.ts
import { diffLines, diffWords } from 'diff';

export interface DiffWorkerMessage {
  type: 'diff';
  id: string;
  oldText: string;
  newText: string;
  mode: 'lines' | 'words';
}

export interface DiffWorkerResponse {
  type: 'result';
  id: string;
  diff: Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
  }>;
}

self.onmessage = (event: MessageEvent<DiffWorkerMessage>) => {
  const { type, id, oldText, newText, mode } = event.data;

  if (type === 'diff') {
    const diff = mode === 'lines' 
      ? diffLines(oldText, newText)
      : diffWords(oldText, newText);
    
    const response: DiffWorkerResponse = {
      type: 'result',
      id,
      diff,
    };
    self.postMessage(response);
  }
};
```

#### Worker Pool Pattern

```typescript
// workers/worker-pool.ts
export class WorkerPool<TInput, TOutput> {
  private workers: Worker[] = [];
  private queue: Array<{
    input: TInput;
    resolve: (value: TOutput) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeCount = 0;

  constructor(
    private createWorker: () => Worker,
    private poolSize = navigator.hardwareConcurrency || 4
  ) {
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = this.createWorker();
      this.workers.push(worker);
    }
  }

  async execute(input: TInput): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length === 0 || this.activeCount >= this.poolSize) {
      return;
    }

    const worker = this.workers[this.activeCount];
    const task = this.queue.shift()!;
    this.activeCount++;

    worker.onmessage = (e) => {
      task.resolve(e.data);
      this.activeCount--;
      this.processQueue();
    };

    worker.onerror = (e) => {
      task.reject(new Error(e.message));
      this.activeCount--;
      this.processQueue();
    };

    worker.postMessage(task.input);
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}
```

### 6. CSS Containment 🔴 NOT IMPLEMENTED

> **Status:** CSS containment rules not yet added to CSS files.

Add CSS containment for better rendering performance:

```css
/* styles/globals/base/containment.css or index.css */

/* Strict containment for virtualized lists */
.virtual-list-container {
  contain: strict;
}

/* Layout containment for cards */
.note-card,
.message-bubble {
  contain: layout style;
}

/* Content containment for modals */
.modal-content {
  contain: content;
}
```

---

## State Management Improvements

> **Status:** ✅ Core patterns implemented (Zustand slices, TanStack Query)

### 1. Zustand Slice Pattern Enhancement ✅ IMPLEMENTED

> **Implementation:** `frontend/src/store/slices/`, `frontend/src/store/bound-store.ts`

#### Current Pattern

The store uses slice pattern but could benefit from better TypeScript inference:

```typescript
// Current: store/slices/auth-slice.ts
export const createAuthSlice: SliceCreator<AuthSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (email, password) => { /* ... */ },
});
```

#### Enhanced Pattern with Immer

```typescript
// New: store/slices/auth-slice.ts with Immer
import { immer } from 'zustand/middleware/immer';

export const createAuthSlice: SliceCreator<AuthSlice> = immer((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: async (email, password) => {
    const { user, token } = await authService.login({ email, password });
    set((state) => {
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
    });
  },
  
  updateUserPreferences: (prefs: Partial<UserPreferences>) => {
    set((state) => {
      if (state.user) {
        Object.assign(state.user.preferences, prefs);
      }
    });
  },
}));
```

### 2. Computed Selectors with `useShallow`

```typescript
// store/selectors.ts
import { useShallow } from 'zustand/react/shallow';
import { useBoundStore } from './bound-store';

// Problem: This selector creates new object every render
export const useChatSettings = () => useBoundStore((s) => ({
  provider: s.chatProvider,
  model: s.chatModel,
  ragEnabled: s.ragEnabled,
}));

// Solution: Use useShallow for object selectors
export const useChatSettings = () => useBoundStore(
  useShallow((s) => ({
    provider: s.chatProvider,
    model: s.chatModel,
    ragEnabled: s.ragEnabled,
  }))
);

// Alternative: Multiple atomic selectors
export const useChatProvider = () => useBoundStore((s) => s.chatProvider);
export const useChatModel = () => useBoundStore((s) => s.chatModel);
```

### 3. Persist Migration Strategy

```typescript
// store/bound-store.ts - Add version migrations
import { persist, createJSONStorage } from 'zustand/middleware';

const _useBoundStore = create<BoundStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSettingsSlice(...args),
      ...createUISlice(...args),
      ...createThemeSlice(...args),
      ...createOllamaSlice(...args),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      version: 2, // Increment when changing shape
      storage: createJSONStorage(() => localStorage),
      
      // Migration function for breaking changes
      migrate: (persistedState, version) => {
        const state = persistedState as BoundStore;
        
        if (version === 0) {
          // v0 -> v1: Rename field
          return {
            ...state,
            chatProvider: state.aiProvider ?? 'OpenAI',
          };
        }
        
        if (version === 1) {
          // v1 -> v2: Add new required field
          return {
            ...state,
            autoSaveInterval: state.autoSaveInterval ?? 30000,
          };
        }
        
        return state;
      },
      
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        chatProvider: state.chatProvider,
        chatModel: state.chatModel,
        theme: state.theme,
        // Don't persist UI state
        // showSidebar: excluded
      }),
    }
  )
);
```

### 4. DevTools Integration

```typescript
// store/bound-store.ts
import { devtools, persist } from 'zustand/middleware';

const _useBoundStore = create<BoundStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createAuthSlice(...args),
        // ...
      }),
      { name: 'auth-storage' }
    ),
    {
      name: 'SecondBrain',
      enabled: import.meta.env.DEV,
      // Group actions by slice
      anonymousActionType: 'anonymous',
    }
  )
);
```

---

## Build & Bundle Optimizations

> **Status:** ✅ Core optimizations implemented

### 1. Enhanced Vite Configuration ✅ PARTIALLY IMPLEMENTED

> **Implementation:** `frontend/vite.config.ts`
>
> Manual chunks configured for: `vendor-react`, `vendor-router`, `vendor-state`, `vendor-editor`, `vendor-markdown`
>
> **Not yet implemented:** React Compiler babel plugin, bundle analyzer, console.log removal in production

```typescript
// vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [
          // React Compiler when stable
          // ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
    splitVendorChunkPlugin(),
    // Bundle analysis in build
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  build: {
    // Target modern browsers only
    target: 'esnext',
    
    // Enable minification optimizations
    minify: 'esbuild',
    
    rollupOptions: {
      output: {
        // Improved chunk splitting
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'scheduler'],
          
          // Routing
          'vendor-router': ['react-router-dom'],
          
          // State management
          'vendor-state': ['zustand', '@tanstack/react-query'],
          
          // Editor (heavy, lazy loaded)
          'vendor-editor': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            'prosemirror-state',
            'prosemirror-view',
          ],
          
          // Markdown rendering
          'vendor-markdown': [
            'react-markdown',
            'remark-gfm',
            'react-syntax-highlighter',
          ],
          
          // Charts
          'vendor-charts': ['recharts'],
          
          // Date utilities
          'vendor-date': ['date-fns'],
          
          // Tauri (desktop only)
          'vendor-tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-notification',
          ],
        },
        
        // Consistent chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Report compressed sizes
    reportCompressedSize: true,
    
    // Increase chunk warning limit for large chunks
    chunkSizeWarningLimit: 1000,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      '@tanstack/react-query',
    ],
    exclude: [
      // Exclude workers from optimization
      '@tauri-apps/api',
    ],
  },
  
  // Enable esbuild optimizations
  esbuild: {
    // Remove console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Legal comments to separate file
    legalComments: 'external',
  },
}));
```

### 2. Dynamic Imports for Heavy Components

```typescript
// lib/lazy-components.ts
import { lazy } from 'react';

// Heavy editor - only load when needed
export const RichTextEditor = lazy(() => 
  import('../components/editor/RichTextEditor')
    .then(m => ({ default: m.RichTextEditor }))
);

// Charts - only on dashboard/analytics
export const ChatUsageChart = lazy(() =>
  import('../features/dashboard/components/ChatUsageChart')
    .then(m => ({ default: m.ChatUsageChart }))
);

// Image generation panel - only when feature enabled
export const ImageGenerationPanel = lazy(() =>
  import('../features/chat/components/ImageGenerationPanel')
    .then(m => ({ default: m.ImageGenerationPanel }))
);

// Syntax highlighter - only for code blocks
export const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(m => ({
    default: m.PrismLight,
  }))
);
```

### 3. Import Cost Optimization

```typescript
// ❌ Bad: Imports entire library
import { format, formatDistance, formatRelative } from 'date-fns';

// ✅ Good: Tree-shakeable imports
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';

// ❌ Bad: Imports all icons
import * as Icons from '@heroicons/react/24/outline';

// ✅ Good: Named imports only
import { HomeIcon, ChatBubbleIcon } from '@heroicons/react/24/outline';
```

### 4. Preload Critical Assets

```html
<!-- index.html -->
<head>
  <!-- Preload critical fonts -->
  <link 
    rel="preload" 
    href="/fonts/inter-var.woff2" 
    as="font" 
    type="font/woff2" 
    crossorigin
  />
  
  <!-- Preload critical CSS -->
  <link rel="preload" href="/src/index.css" as="style" />
  
  <!-- DNS prefetch for API -->
  <link rel="dns-prefetch" href="//api.openai.com" />
  <link rel="dns-prefetch" href="//api.anthropic.com" />
</head>
```

---

## Testing Strategy

> **Status:** 🔴 NOT IMPLEMENTED - Testing infrastructure not yet set up

### 1. Component Testing with React Testing Library

```typescript
// features/notes/__tests__/NoteCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NoteCard } from '../components/NoteCard';
import { createTestQueryClient } from '../../../test/test-utils';

describe('NoteCard', () => {
  const mockNote = {
    id: '1',
    title: 'Test Note',
    content: '# Hello World',
    tags: ['test'],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders note title and content preview', () => {
    renderWithProviders(<NoteCard note={mockNote} />);
    
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.getByText(/Hello World/)).toBeInTheDocument();
  });

  it('opens edit modal on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteCard note={mockNote} />);
    
    await user.click(screen.getByText('Test Note'));
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles delete with confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteCard note={mockNote} showDeleteButton />);
    
    // Hover to show delete button
    await user.hover(screen.getByText('Test Note'));
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Hook Testing

```typescript
// hooks/__tests__/use-chat-stream.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStream } from '../use-chat-stream';
import { createWrapper } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useChatStream', () => {
  it('sends message and receives streaming response', async () => {
    // Mock SSE endpoint
    server.use(
      http.post('/api/chat/conversations/:id/messages/stream', () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"type":"start"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"data","content":"Hello"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"data","content":" World"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"end"}\n\n'));
            controller.close();
          },
        });
        
        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    const { result } = renderHook(() => useChatStream(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.sendStreamingMessage('conv-1', {
        content: 'Test message',
        provider: 'OpenAI',
        model: 'gpt-4o',
      });
    });

    await waitFor(() => {
      expect(result.current.streamingMessage).toBe('Hello World');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('handles stream cancellation', async () => {
    const { result } = renderHook(() => useChatStream(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.sendStreamingMessage('conv-1', {
        content: 'Test',
        provider: 'OpenAI',
        model: 'gpt-4o',
      });
    });

    act(() => {
      result.current.cancelStream();
    });

    expect(result.current.isStreaming).toBe(false);
  });
});
```

### 3. Integration Testing

```typescript
// __tests__/integration/chat-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { createWrapper } from '../../test/test-utils';

describe('Chat Flow Integration', () => {
  it('creates conversation and sends message', async () => {
    const user = userEvent.setup();
    
    render(<App />, { wrapper: createWrapper() });

    // Navigate to chat
    await user.click(screen.getByRole('link', { name: /chat/i }));

    // Wait for chat page to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    });

    // Type and send message
    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'Hello AI!');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/Hello AI!/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Assistant response should appear
    await waitFor(() => {
      expect(screen.getAllByTestId('message-bubble').length).toBeGreaterThan(1);
    });
  });
});
```

### 4. Visual Regression Testing

```typescript
// __tests__/visual/NoteCard.visual.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { NoteCard } from '../../features/notes/components/NoteCard';

test.describe('NoteCard Visual', () => {
  const mockNote = {
    id: '1',
    title: 'Visual Test Note',
    content: 'Lorem ipsum dolor sit amet',
    tags: ['visual', 'test'],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('default state', async ({ mount }) => {
    const component = await mount(<NoteCard note={mockNote} />);
    await expect(component).toHaveScreenshot('note-card-default.png');
  });

  test('hover state', async ({ mount }) => {
    const component = await mount(<NoteCard note={mockNote} />);
    await component.hover();
    await expect(component).toHaveScreenshot('note-card-hover.png');
  });

  test('archived state', async ({ mount }) => {
    const component = await mount(
      <NoteCard note={{ ...mockNote, isArchived: true }} />
    );
    await expect(component).toHaveScreenshot('note-card-archived.png');
  });

  test('dark mode', async ({ mount, page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const component = await mount(<NoteCard note={mockNote} />);
    await expect(component).toHaveScreenshot('note-card-dark.png');
  });
});
```

### 5. Performance Testing

```typescript
// __tests__/performance/list-render.perf.test.tsx
import { render } from '@testing-library/react';
import { VirtualizedNoteList } from '../../features/notes/components/VirtualizedNoteList';
import { createTestNotes } from '../../test/factories';

describe('List Rendering Performance', () => {
  it('renders 1000 notes in under 100ms', () => {
    const notes = createTestNotes(1000);
    
    const startTime = performance.now();
    render(<VirtualizedNoteList notes={notes} />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100);
  });

  it('initial render shows only visible items', () => {
    const notes = createTestNotes(1000);
    
    const { container } = render(<VirtualizedNoteList notes={notes} />);
    
    // Should only render ~10-15 visible items + overscan
    const renderedItems = container.querySelectorAll('[data-index]');
    expect(renderedItems.length).toBeLessThan(25);
  });
});
```

---

## Code Quality & Maintainability

### 1. TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 2. ESLint Rules for React 19

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    rules: {
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Refresh (HMR)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // React Compiler (when enabled)
      'react-compiler/react-compiler': 'error',
      
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  }
);
```

### 3. Custom Hooks Best Practices

```typescript
// hooks/README.md conventions

/**
 * Hook Naming Conventions:
 * - useXxx - Generic hooks
 * - useXxxQuery - Data fetching hooks
 * - useXxxMutation - Data mutation hooks
 * - useXxxStream - Streaming data hooks
 * 
 * Return Value Conventions:
 * - Object for multiple values: { data, isLoading, error }
 * - Tuple for action + state: [state, dispatch]
 * - Direct value for simple hooks: const theme = useTheme()
 */

// Example: Well-structured custom hook
export function useNoteEditor(noteId: string) {
  // 1. External hooks at the top
  const queryClient = useQueryClient();
  const { data: note, isLoading } = useNote(noteId);
  const updateNote = useUpdateNote();
  
  // 2. Local state
  const [isDirty, setIsDirty] = useState(false);
  const [localContent, setLocalContent] = useState('');
  
  // 3. Derived values
  const hasUnsavedChanges = isDirty && localContent !== note?.content;
  
  // 4. Effects (minimize these)
  useEffect(() => {
    if (note) {
      setLocalContent(note.content);
    }
  }, [note]);
  
  // 5. Callbacks
  const handleContentChange = useCallback((content: string) => {
    setLocalContent(content);
    setIsDirty(true);
  }, []);
  
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    await updateNote.mutateAsync({
      id: noteId,
      data: { content: localContent },
    });
    setIsDirty(false);
  }, [hasUnsavedChanges, noteId, localContent, updateNote]);
  
  // 6. Return object
  return {
    // Data
    note,
    localContent,
    
    // State
    isLoading,
    isDirty,
    hasUnsavedChanges,
    isSaving: updateNote.isPending,
    
    // Actions
    handleContentChange,
    handleSave,
  };
}
```

### 4. Component Organization

```typescript
// Component file structure convention

/**
 * File Structure:
 * 1. Imports (external, then internal, then relative)
 * 2. Types/Interfaces
 * 3. Constants
 * 4. Helper functions (pure)
 * 5. Sub-components (if small)
 * 6. Main component
 * 7. Exports
 */

// Example: Well-organized component file
// components/ui/Button.tsx

// 1. Imports
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// 2. Types
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// 3. Constants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// 4. Helper functions
const getLoadingIcon = (size: string | null | undefined) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return <LoadingSpinner className={sizeClass} />;
};

// 5. Sub-components
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// 6. Main component
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? getLoadingIcon(size) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// 7. Exports
export { buttonVariants };
```

---

## Accessibility Improvements

> **Status:** 🔴 NOT IMPLEMENTED - Accessibility enhancements not yet started

### 1. Focus Management

```typescript
// hooks/use-focus-trap.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store previous focus
    previousActiveElement.current = document.activeElement;

    // Focus first focusable element
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}
```

### 2. Accessible Modal Component

```typescript
// components/ui/AccessibleModal.tsx
import { useId } from 'react';
import { useFocusTrap } from '../../hooks/use-focus-trap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AccessibleModal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children 
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div
        ref={containerRef}
        className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <h2 id={titleId} className="text-xl font-semibold p-4 border-b">
          {title}
        </h2>
        
        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}
        
        <div className="p-4">
          {children}
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          aria-label="Close modal"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

### 3. Skip Links

```typescript
// components/layout/SkipLinks.tsx
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-brand-600 text-white rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="absolute top-4 left-48 z-50 px-4 py-2 bg-brand-600 text-white rounded-lg focus:outline-none"
      >
        Skip to navigation
      </a>
    </div>
  );
}
```

### 4. Announce for Screen Readers

```typescript
// hooks/use-announce.ts
import { useCallback } from 'react';

const LIVE_REGION_ID = 'live-announcements';

export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    let liveRegion = document.getElementById(LIVE_REGION_ID);
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = LIVE_REGION_ID;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    
    // Clear and set new message (forces re-announcement)
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, 100);
  }, []);

  return announce;
}

// Usage
function NoteCard({ note }) {
  const announce = useAnnounce();
  const deleteNote = useDeleteNote();

  const handleDelete = async () => {
    await deleteNote.mutateAsync(note.id);
    announce(`Note "${note.title}" deleted`);
  };
}
```

### 5. Keyboard Navigation

```typescript
// hooks/use-roving-focus.ts
import { useState, useCallback, KeyboardEvent } from 'react';

export function useRovingFocus<T>(items: T[]) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
      }
    },
    [items.length]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex,
      onKeyDown: handleKeyDown,
    }),
    [focusedIndex, handleKeyDown]
  );

  return { focusedIndex, setFocusedIndex, getItemProps };
}
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2) ✅ COMPLETE

| Task | Priority | Effort | Status | Files Modified |
|------|----------|--------|--------|----------------|
| Add `useTransition` to chat sending | High | Low | ✅ Done | `use-chat-stream.ts` |
| Add `useDeferredValue` to search | High | Low | ✅ Done | `NotesPage.tsx` |
| Implement granular Suspense | Medium | Low | ✅ Done | `ChatPage.tsx` |
| Add skeleton components | Medium | Low | ✅ Done | `components/skeletons/` |
| Enable TanStack Query prefetching | Medium | Low | ✅ Done | `router.tsx` |

### Phase 2: React 19 Features (Week 3-4) 🔴 PENDING

| Task | Priority | Effort | Status | Files to Modify |
|------|----------|--------|--------|-----------------|
| Migrate to `useOptimistic` | High | Medium | 🔴 Pending | `use-notes-query.ts`, `use-api-mutation.ts` |
| Implement `use()` for simple data | Medium | Medium | 🔴 Pending | Various hooks |
| Add `useActionState` to forms | Medium | Medium | 🔴 Pending | `LoginPage.tsx`, `CreateNoteModal.tsx` |
| Create `useFormStatus` submit buttons | Low | Low | 🔴 Pending | Create `SubmitButton.tsx` |

### Phase 3: Performance (Week 5-6) 🟡 PARTIAL

| Task | Priority | Effort | Status | Files Modified |
|------|----------|--------|--------|----------------|
| Enable React Compiler | High | Medium | 🔴 Pending | `vite.config.ts` |
| Add Web Vitals monitoring | Medium | Medium | 🔴 Pending | Create `lib/analytics.ts` |
| Optimize bundle chunks | Medium | Medium | ✅ Done | `vite.config.ts` |
| Add progressive image loading | Low | Low | 🔴 Pending | Create `ProgressiveImage.tsx` |
| Implement CSS containment | Low | Low | 🔴 Pending | `styles/globals/base/` |

### Phase 4: Quality & Testing (Week 7-8) 🔴 PENDING

| Task | Priority | Effort | Status | Files to Modify |
|------|----------|--------|--------|-----------------|
| Add visual regression tests | Medium | Medium | 🔴 Pending | Create `__tests__/visual/` |
| Add performance tests | Medium | Medium | 🔴 Pending | Create `__tests__/performance/` |
| Improve accessibility | Medium | Medium | 🔴 Pending | Various components |
| Enable strict TypeScript | Low | High | 🔴 Pending | `tsconfig.json`, fix errors |

---

## Metrics & Monitoring

> **Status:** 🔴 NOT IMPLEMENTED

### Web Vitals Integration 🔴 NOT IMPLEMENTED

```typescript
// lib/analytics.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function initWebVitals(onMetric: (metric: VitalsMetric) => void) {
  onCLS((metric) => onMetric({ name: 'CLS', value: metric.value, rating: metric.rating }));
  onFID((metric) => onMetric({ name: 'FID', value: metric.value, rating: metric.rating }));
  onFCP((metric) => onMetric({ name: 'FCP', value: metric.value, rating: metric.rating }));
  onLCP((metric) => onMetric({ name: 'LCP', value: metric.value, rating: metric.rating }));
  onTTFB((metric) => onMetric({ name: 'TTFB', value: metric.value, rating: metric.rating }));
}

// Usage in main.tsx
initWebVitals((metric) => {
  console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating);
  
  // Send to analytics
  if (import.meta.env.PROD) {
    // analytics.track('web_vital', metric);
  }
});
```

### Performance Budget

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

---

## Summary

This guide outlines a comprehensive modernization strategy for the Second Brain frontend:

### Implementation Status (December 2024)

| Category | Items | Status |
|----------|-------|--------|
| **React 19 Features** | `useTransition`, `useDeferredValue` | ✅ Done |
| **React 19 Features** | `use()`, `useOptimistic`, `useActionState`, React Compiler | 🔴 Pending |
| **Performance** | Suspense boundaries, skeletons, prefetching, virtualization, web workers | ✅ Done |
| **Performance** | Progressive images, CSS containment, Web Vitals | 🔴 Pending |
| **State Management** | Zustand slices, TanStack Query | ✅ Done |
| **Build** | Lazy loading, bundle chunking | ✅ Done |
| **Build** | React Compiler, bundle analyzer | 🔴 Pending |
| **Testing** | Component, integration, visual, performance tests | 🔴 Pending |
| **Accessibility** | Focus management, ARIA, keyboard navigation | 🔴 Pending |
| **Monitoring** | Web Vitals tracking, performance budgets | 🔴 Pending |

### What's Complete (~60%)

1. ✅ **React 19 Features**: `useTransition` (chat streaming), `useDeferredValue` (notes search)
2. ✅ **Performance**: Enhanced Suspense with skeletons, route prefetching, virtualization, web workers
3. ✅ **State Management**: Zustand slice pattern, TanStack Query with optimistic updates
4. ✅ **Build**: Lazy loading pages, manual chunk splitting

### Remaining Tasks

1. 🔴 **React 19 Features**: Adopt `use()`, `useOptimistic`, `useActionState`, enable React Compiler
2. 🔴 **Performance**: Add progressive image loading, CSS containment
3. 🔴 **Monitoring**: Implement Web Vitals tracking
4. 🔴 **Testing**: Set up component, integration, and visual regression tests
5. 🔴 **Accessibility**: Implement focus management, skip links, ARIA improvements

The implementation should continue in phases, with React 19 feature adoption being the next priority as those hooks stabilize.
