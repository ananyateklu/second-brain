# Frontend Architecture

## Directory Structure

```text
frontend/src/
├── features/                  # 16 domain modules
│   ├── chat/                  # 48 files - Chat UI, SSE streaming, image gen
│   ├── notes/                 # 27 files - CRUD, version history, folders
│   ├── voice/                 # 18 files - Voice agent, audio I/O
│   ├── github/                # 31 files - PRs, issues, code browser
│   ├── focus/                 # 20 files - Productivity dashboard
│   ├── agents/                # 12 files - Tool execution, thinking steps
│   ├── rag/                   # 22 files - Analytics, indexing
│   ├── dashboard/             # 12 files - Stats, charts
│   ├── git/                   # 14 files - Local repository ops
│   ├── insights/              # 8 files - Multi-tab analytics
│   ├── assistant-hub/         # AI assistant library
│   ├── claude-code/           # Claude Code integration
│   ├── ai/                    # AI provider hooks
│   └── stats/                 # Usage statistics
├── store/                     # Zustand - 13 slices, bound store
├── services/                  # 13 API service files
├── lib/                       # api-client, router, query-keys, tauri-bridge
├── types/                     # 13 TypeScript definition files
├── hooks/                     # 50+ shared React hooks
├── workers/                   # 2 Web Workers (audio processing)
└── components/                # 200+ UI components
```

## Slice-based Zustand Store

13 modular slices combined into `bound-store.ts`:

```typescript
// store/types.ts
export type BoundStore = AuthSlice & SettingsSlice & UISlice & ThemeSlice
  & NotesSlice & DraftSlice & VoiceSlice & FocusSlice & OllamaSlice
  & IndexingSlice & SummarySlice & RagAnalyticsSlice & InsightsSlice;
```

**Slices**: auth, settings (40+ prefs), ui, theme, notes, draft, voice, focus, ollama, indexing, summary, rag-analytics, insights

## TanStack Query

Type-safe query keys in `lib/query-keys.ts`:

```typescript
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: NoteFilters) => [...noteKeys.lists(), filters] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};
```

## SSE Streaming

Server-Sent Events for chat/agent responses:

- `start` - Stream initialization
- `message` - Content chunk
- `rag` - RAG context retrieved
- `tool` - Tool execution
- `thinking` - Reasoning step
- `end` - Stream complete
- `error` - Error occurred

## Composite Hooks Pattern

Complex pages use composite hooks to consolidate 5-6 child hooks:

```typescript
// Example: use-chat-page-state.tsx
export function useChatPageState() {
  const conversations = useConversations();
  const messages = useMessages();
  const streaming = useStreaming();
  const input = useInput();
  // ... combines into single state object
}
```

## Context Pattern

Limited React Context usage for shared page state:

- `ChatPageContext` - Input system state
- `DirectoryPageContext` - Notes directory state

## Critical Files

| File | Purpose |
|------|---------|
| `main.tsx` | React bootstrap, providers |
| `lib/router.tsx` | 200+ routes, lazy loading |
| `lib/api-client.ts` | HTTP client with interceptors |
| `store/bound-store.ts` | Unified Zustand store |
| `lib/query-keys.ts` | Type-safe query key factories |
| `features/chat/hooks/use-chat-page-state.tsx` | Composite chat hook |
| `features/voice/hooks/use-voice-session.ts` | Voice WebSocket hook |
| `features/focus/hooks/use-focus-mutations.ts` | Focus CRUD hook |
| `services/chat.service.ts` | SSE streaming + image gen |
