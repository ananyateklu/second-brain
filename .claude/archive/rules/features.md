# Feature Systems

## RAG Pipeline (5 Stages)

```text
Query → 1. Expansion (HyDE + Multi-Query)
      → 2. Hybrid Search (Vector + BM25 + RRF fusion)
      → 3. LLM Reranking (relevance 0-10)
      → 4. Context Assembly (Top-K)
      → 5. Analytics (feedback, timing, topic clustering)
```

### Configuration (`appsettings.json` → `RAG` section)

- Hybrid weights: vector 0.7, BM25 0.3
- TopK: 5, Threshold: 0.3
- HyDE, multi-query, reranking toggles
- InitialRetrievalCount: 20 (before reranking)

## Focus/Productivity Dashboard

AI-powered task management with priority scheduling and timer tracking.

### Backend (`Services/Focus/`, 2 files)

- `FocusAIService` - AI-generated task suggestions from notes
- Uses note embeddings for semantic suggestion matching

### Frontend (`features/focus/`, 20 files)

- `CurrentFocusCard` - Active task with timer
- `TodaysPlanList` - Scheduled tasks for today
- `BacklogSection` - Priority-filtered backlog (P1/P2/P3)
- `FocusSuggestionsPanel` - AI-generated suggestions
- `QuickCaptureModal` - Rapid task creation
- `FocusTimer` - Pomodoro-style time tracking
- `use-focus-mutations.ts` - Task CRUD operations

### Database Tables

- `focus_items` - priority (1-3), status, scheduled_date, is_current_focus, focus_started_at, accumulated_minutes
- `focus_suggestions` - AI suggestions with embeddings, confidence, source_note_id

## GitHub Integration

### Backend (`Services/Git/` + `Services/GitHub/`)

- `GitService` - Local repository operations (clone, fetch, branch, commit)
- `GitAuthorizationService` - SSH key management
- `GitHubService` - API client (PRs, issues, workflows)

### Frontend (`features/github/`, 31+ files)

- `GitHubRepoSelector` - Repository picker
- `GitHubBranchesList`, `GitHubCommitsList` - History views
- `GitHubPullRequestList`, `GitHubIssuesList` - PR/Issue management
- `GitHubActionsPanel` - Workflow runs
- Code Browser: `FileTreeView`, `CodeViewer`, `FileSearchInput`

## Insights Dashboard

Multi-tab analytics (`features/insights/`, 8 files):

- **Overview Tab** - Overall statistics
- **RAG Tab** - Query performance, topic clustering
- **Chat Tab** - Conversation analytics
- **Agent Tab** - Tool execution metrics

## Temporal Features (PostgreSQL 18)

### Note Version History

- `NoteVersionHistoryPanel.tsx` - Slide-out timeline
- `use-note-versions.ts` - Version hooks (history, diff, restore)
- Uses `WITHOUT OVERLAPS` constraint

### Chat Session Tracking

- `SessionStatsSection.tsx` - Dashboard analytics
- `use-chat-sessions.ts` - Session lifecycle hooks
- Auto-start/end, `navigator.sendBeacon` for cleanup

See `database/POSTGRESQL_18_FEATURES.md` for details.

## Desktop App (Tauri 2.0)

Native macOS app with embedded PostgreSQL (port 5433).

### Architecture

```text
Tauri Shell (Rust) → Frontend (WebView) → Backend (.NET sidecar) → PostgreSQL (embedded)
```

### Key Files

- `frontend/src-tauri/src/lib.rs` - Service lifecycle
- `frontend/src/lib/tauri-bridge.ts` - IPC commands
- `frontend/src/lib/native-notifications.ts` - Cross-platform notifications

### Commands

```bash
bun run tauri:dev                           # Development
bun run tauri:build:universal               # Universal binary
```

See `docs/adr/007-tauri-macos-desktop-app.md` for detailed rationale.
