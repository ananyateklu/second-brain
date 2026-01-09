---
name: frontend-react
description: React 19 frontend development with TypeScript, Zustand, TanStack Query, and Tailwind CSS v4. Use when user asks to build UI components, create hooks, implement services, or manage application state. Triggers on React/TypeScript code in frontend/src/, component patterns, or state management questions.
---

# Frontend React Development

## Directory Structure

```text
frontend/src/
├── features/    # 16 domain modules (chat, notes, voice, github, focus, agents, rag...)
├── store/       # Zustand - 13 slices, bound store
├── services/    # 13 API service files
├── lib/         # api-client, router, query-keys, tauri-bridge
├── types/       # 13 TypeScript definition files
├── hooks/       # 50+ shared React hooks
└── components/  # 200+ UI components
```

## Zustand Store (13 Slices)

```typescript
// Type definition
export type BoundStore = AuthSlice & SettingsSlice & UISlice & ThemeSlice
  & NotesSlice & DraftSlice & VoiceSlice & FocusSlice & OllamaSlice
  & IndexingSlice & SummarySlice & RagAnalyticsSlice & InsightsSlice;

// Usage - always use selectors for performance
const { user, isAuthenticated } = useBoundStore(state => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated
}));

// Don't do this (re-renders on any state change)
const store = useBoundStore();
```

## TanStack Query Patterns

### Query Key Factories

```typescript
// lib/query-keys.ts - always use these for cache consistency
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: NoteFilters) => [...noteKeys.lists(), filters] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};

export const chatKeys = {
  all: ['conversations'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
  messages: (conversationId: string) => [...chatKeys.detail(conversationId), 'messages'] as const,
};
```

### Query Hook Pattern

```typescript
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => noteService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Mutation Pattern

```typescript
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
```

## SSE Streaming

Events: `start`, `message`, `rag`, `tool`, `thinking`, `end`, `error`

```typescript
// services/chat.service.ts pattern
export async function* streamChat(request: ChatRequest): AsyncGenerator<StreamEvent> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = parseSSE(chunk);
    for (const event of events) {
      yield event;
    }
  }
}
```

## Composite Hooks Pattern

For complex pages, consolidate multiple hooks:

```typescript
export function useChatPageState() {
  const conversations = useConversations();
  const messages = useMessages();
  const streaming = useStreaming();
  const { sendMessage, isLoading } = useSendMessage();

  return {
    conversations,
    messages,
    streaming,
    sendMessage,
    isLoading,
  };
}
```

## Component Patterns

### Feature Component Structure

```text
features/notes/
├── components/
│   ├── NoteCard.tsx
│   ├── NoteEditor.tsx
│   └── NoteList.tsx
├── hooks/
│   ├── use-notes.ts
│   └── use-note-mutations.ts
├── types.ts
└── index.ts  # Re-exports
```

### Component Template

```typescript
interface NoteCardProps {
  note: Note;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const { mutate: deleteNote } = useDeleteNote();

  const handleDelete = () => {
    deleteNote(note.id);
    onDelete?.(note.id);
  };

  return (
    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold">{note.title}</h3>
      <p className="text-muted-foreground line-clamp-2">{note.content}</p>
      {/* ... */}
    </div>
  );
}
```

## Key Components by Feature

| Feature | Components |
|---------|------------|
| Agent Streaming | `ThinkingStepCard`, `ToolExecutionCard`, `RetrievedContextCard`, `CodeExecutionCard` |
| Chat Input | `ChatInput` → `ChatInputRoot` → `ChatInputContainer` → `ChatInputTextArea`, `ChatFormattingToolbar` |
| Focus Dashboard | `CurrentFocusCard`, `TodaysPlanList`, `BacklogSection`, `FocusSuggestionsPanel`, `FocusTimer` |
| GitHub | `GitHubRepoSelector`, `GitHubBranchesList`, `GitHubPullRequestList`, `FileTreeView` |
| Voice | `VoiceOrb`, `VoiceControls`, `VoiceTranscript`, `VoiceAgentActivityPanel` |
| Notes | `NoteVersionHistoryPanel`, `NoteEditor`, `NoteCard` |

## Context Usage (Limited)

```typescript
// Only use React Context for page-level shared state
const ChatPageContext = createContext<ChatPageState | null>(null);

export function ChatPageProvider({ children }: { children: React.ReactNode }) {
  const state = useChatPageState();
  return (
    <ChatPageContext.Provider value={state}>
      {children}
    </ChatPageContext.Provider>
  );
}
```

## Critical Files

| File | Purpose |
|------|---------|
| `main.tsx` | React bootstrap, providers |
| `lib/router.tsx` | 200+ routes, lazy loading |
| `lib/api-client.ts` | HTTP client with interceptors |
| `store/bound-store.ts` | Unified Zustand store |
| `lib/query-keys.ts` | Type-safe query key factories |

## Common Commands

```bash
cd frontend && bun dev            # Dev server (port 3000)
cd frontend && bun run build      # Production build
cd frontend && bun test           # Run tests
cd frontend && bun run lint       # ESLint
```
