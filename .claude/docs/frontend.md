# Frontend Patterns

## Directory Structure

```
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
// store/types.ts
export type BoundStore = AuthSlice & SettingsSlice & UISlice & ThemeSlice
  & NotesSlice & DraftSlice & VoiceSlice & FocusSlice & OllamaSlice
  & IndexingSlice & SummarySlice & RagAnalyticsSlice & InsightsSlice;

// Usage
const { user, isAuthenticated } = useBoundStore(state => state.auth);
```

## TanStack Query Keys

```typescript
// lib/query-keys.ts
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: NoteFilters) => [...noteKeys.lists(), filters] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};
```

## SSE Streaming Events

`start`, `message`, `rag`, `tool`, `thinking`, `end`, `error`

## Composite Hooks Pattern

```typescript
// Complex pages consolidate multiple hooks
export function useChatPageState() {
  const conversations = useConversations();
  const messages = useMessages();
  const streaming = useStreaming();
  return { conversations, messages, streaming };
}
```

## Key Components by Feature

**Agent Streaming**: `ThinkingStepCard`, `ToolExecutionCard`, `RetrievedContextCard`, `CodeExecutionCard`

**Chat Input** (14 components): `ChatInput` → `ChatInputRoot` → `ChatInputContainer` → `ChatInputTextArea`, `ChatFormattingToolbar`, `ChatInputActions`

**Focus Dashboard**: `CurrentFocusCard`, `TodaysPlanList`, `BacklogSection`, `FocusSuggestionsPanel`, `FocusTimer`

**GitHub**: `GitHubRepoSelector`, `GitHubBranchesList`, `GitHubPullRequestList`, `FileTreeView`, `CodeViewer`

**Voice**: `VoiceOrb`, `VoiceControls`, `VoiceTranscript`, `VoiceAgentActivityPanel`

**Notes**: `NoteVersionHistoryPanel` (version timeline), `use-note-versions.ts` (history, diff, restore)

## Critical Files

| File | Purpose |
|------|---------|
| `main.tsx` | React bootstrap, providers |
| `lib/router.tsx` | 200+ routes, lazy loading |
| `lib/api-client.ts` | HTTP client with interceptors |
| `store/bound-store.ts` | Unified Zustand store |
| `lib/query-keys.ts` | Type-safe query key factories |
| `features/chat/hooks/use-chat-page-state.tsx` | Composite chat hook |
| `services/chat.service.ts` | SSE streaming + image gen |

## Context Usage

Limited React Context for shared page state:
- `ChatPageContext` - Input system state
- `DirectoryPageContext` - Notes directory state
