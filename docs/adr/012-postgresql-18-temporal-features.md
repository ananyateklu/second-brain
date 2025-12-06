# ADR 012: PostgreSQL 18 Temporal Features

## Status

Accepted

## Context

Second Brain needed to provide version history for notes and session tracking for chat conversations. Users should be able to:

1. **Notes**: View edit history, compare versions, and restore to previous versions
2. **Chat**: Track session activity, including when sessions start/end, devices used, and message counts

Traditional approaches would require:

- Custom audit tables and triggers for version tracking
- Complex application logic to maintain history
- Additional storage management for historical data

PostgreSQL 18 introduces temporal tables (SQL:2011 compliant) that handle this automatically at the database level.

## Decision

We adopted PostgreSQL 18 temporal tables for:

1. **Note Version History**: Using system-time versioning on the `notes` table
   - Automatic tracking of all changes with `valid_from` and `valid_to` timestamps
   - Query historical states at any point in time using `FOR SYSTEM_TIME AS OF`
   - Compare versions to see what changed between edits

2. **Chat Session Tracking**: Using a dedicated `chat_sessions` table with temporal semantics
   - Track session start/end times, device info, and message counts
   - Aggregate statistics per user and per conversation
   - Support for active session detection

### Frontend Implementation

The frontend provides full UI support for these temporal features:

**Note Version History UI:**

- History button in EditNoteModal opens slide-out panel
- Visual timeline showing all versions with timestamps
- Side-by-side diff viewer for comparing versions
- One-click restore to any previous version

**Session Tracking:**

- Automatic session start when selecting a conversation
- Session cleanup on conversation switch or page leave
- `navigator.sendBeacon` for reliable cleanup on tab close
- Dashboard displays session statistics and active sessions

### Key Components

```text
frontend/src/features/notes/
├── components/
│   ├── NoteVersionHistoryPanel.tsx  # Slide-out history panel
│   ├── NoteVersionTimeline.tsx      # Version timeline visualization
│   └── NoteVersionDiffViewer.tsx    # Side-by-side comparison
└── hooks/
    └── use-note-versions.ts         # React Query hooks for versions

frontend/src/features/chat/
└── hooks/
    └── use-chat-sessions.ts         # Session tracking hooks

frontend/src/features/dashboard/
└── components/
    └── SessionStatsSection.tsx      # Session analytics display
```

### API Endpoints

**Note Versions:**

- `GET /api/notes/{id}/versions` - Get version history
- `GET /api/notes/{id}/versions/at?timestamp=` - Get state at time
- `GET /api/notes/{id}/versions/diff?from=&to=` - Compare versions
- `POST /api/notes/{id}/versions/restore` - Restore to version

**Chat Sessions:**

- `GET /api/chat/sessions/stats` - User session statistics
- `GET /api/chat/sessions/active` - Currently active sessions
- `GET /api/chat/sessions/history` - Session history
- `POST /api/chat/sessions/start` - Start new session
- `POST /api/chat/sessions/{id}/end` - End session

## Consequences

### Positive

- **Automatic versioning**: No custom triggers or audit tables needed
- **Point-in-time queries**: Query any historical state with standard SQL
- **Data integrity**: Database-level guarantees for version consistency
- **Performance**: Optimized temporal indexes for historical queries
- **Rich UI**: Users can explore and restore note history visually
- **Session insights**: Users see engagement metrics and active sessions

### Negative

- **PostgreSQL 18 requirement**: Not compatible with older PostgreSQL versions
- **Storage overhead**: Historical data accumulates over time
- **Migration complexity**: Requires careful handling of existing data

### Neutral

- **Learning curve**: Team needs to understand temporal SQL syntax
- **Retention policy**: Will need periodic cleanup of very old versions
