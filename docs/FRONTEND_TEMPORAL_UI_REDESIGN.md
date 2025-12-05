# Frontend Temporal Features UI Redesign

This document provides implementation-ready specifications for integrating PostgreSQL 18 temporal features (note version history and chat session tracking) into the Second Brain frontend.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Note Version History UI](#2-note-version-history-ui)
3. [Chat Session Tracking UI](#3-chat-session-tracking-ui)
4. [Dashboard Integration](#4-dashboard-integration)
5. [New Components Specification](#5-new-components-specification)
6. [File Modifications Summary](#6-file-modifications-summary)
7. [Implementation Tasks](#7-implementation-tasks)

---

## 1. Overview

### Available Hooks (Already Implemented)

```typescript
// Note Version History
import {
  useNoteVersionHistory,
  useNoteVersionAtTime,
  useNoteVersionDiff,
  useRestoreNoteVersion,
} from '@/features/notes/hooks/use-note-versions';

// Chat Session Tracking
import {
  useSessionStats,
  useActiveSessions,
  useSessionHistory,
  useConversationSessions,
  useStartSession,
  useEndSession,
  collectDeviceInfo,
} from '@/features/chat/hooks/use-chat-sessions';
```

### Data Types Available

```typescript
// Note Versions
interface NoteVersion {
  noteId: string;
  versionNumber: number;
  isCurrent: boolean;
  validFrom: string;
  validTo: string | null;
  title: string;
  content: string;
  tags: string[];
  isArchived: boolean;
  folder: string | null;
  modifiedBy: string;
  changeSummary: string | null;
  createdAt: string;
}

// Session Stats
interface SessionStats {
  totalSessions: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalTokensUsed: number;
  avgSessionDurationMinutes: number;
  uniqueConversations: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  activeSessions: number;
}
```

---

## 2. Note Version History UI

### 2.1 Integration Point: EditNoteModal

**File:** `frontend/src/features/notes/components/EditNoteModal.tsx`

Add a "History" button to the modal header actions, positioned before the Archive button.

#### UI Mockup Description

```text
┌─────────────────────────────────────────────────────────────────┐
│  Edit Note                              [History] [Archive] [Save] │
│  Last updated: 2 hours ago                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Title Input]                                                    │
│                                                                   │
│  [Content Editor]                                                 │
│                                                                   │
│  [Tags Input]                                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

When "History" is clicked, a slide-out panel appears:

```text
┌─────────────────────────────────────────┬───────────────────────┐
│  Edit Note                              │  Version History      │
│                                         │                       │
│  [Note Form Content]                    │  ● v5 (Current)       │
│                                         │    Dec 5, 2025 10:30  │
│                                         │    "Updated content"  │
│                                         │                       │
│                                         │  ○ v4                 │
│                                         │    Dec 4, 2025 15:20  │
│                                         │    "Added tags"       │
│                                         │    [Compare] [Restore]│
│                                         │                       │
│                                         │  ○ v3                 │
│                                         │    Dec 3, 2025 09:15  │
│                                         │    [Compare] [Restore]│
│                                         │                       │
└─────────────────────────────────────────┴───────────────────────┘
```

#### Code Changes for EditNoteModal.tsx

```typescript
// Add imports
import { useState } from 'react';
import { NoteVersionHistoryPanel } from './NoteVersionHistoryPanel';

// Add state inside component
const [isHistoryOpen, setIsHistoryOpen] = useState(false);

// Add History button in headerAction (before Archive button)
<Button
  type="button"
  variant="secondary"
  onClick={() => setIsHistoryOpen(true)}
  title="View version history"
>
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  History
</Button>

// Add panel at end of Modal (before closing </Modal>)
{isHistoryOpen && editingNote && (
  <NoteVersionHistoryPanel
    noteId={editingNote.id}
    isOpen={isHistoryOpen}
    onClose={() => setIsHistoryOpen(false)}
    onRestore={() => {
      // Refresh the note data after restore
      closeModal();
    }}
  />
)}
```

### 2.2 Version Diff Viewer

When comparing versions, show a side-by-side or unified diff:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Compare Versions: v3 → v4                              [Close] │
├────────────────────────────────┬────────────────────────────────┤
│  Version 3 (Dec 3, 2025)       │  Version 4 (Dec 4, 2025)       │
├────────────────────────────────┼────────────────────────────────┤
│  Title: My Note                │  Title: My Note                │
├────────────────────────────────┼────────────────────────────────┤
│  - This is the old content     │  + This is the new content     │
│  - that was here before        │  + with updated information    │
│                                │  + and additional details      │
├────────────────────────────────┼────────────────────────────────┤
│  Tags: [tag1] [tag2]           │  Tags: [tag1] [tag2] [+tag3]   │
└────────────────────────────────┴────────────────────────────────┘
```

---

## 3. Chat Session Tracking UI

### 3.1 Auto Session Tracking

**File:** `frontend/src/pages/ChatPage.tsx`

Automatically start a session when the chat page mounts and end it when unmounting.

```typescript
import { useEffect, useRef } from 'react';
import { useStartSession, useEndSession, collectDeviceInfo } from '@/features/chat/hooks/use-chat-sessions';

function ChatPage() {
  const { mutate: startSession } = useStartSession();
  const { mutate: endSession } = useEndSession();
  const sessionIdRef = useRef<string | null>(null);
  const messageCountRef = useRef({ sent: 0, received: 0 });

  // Start session when conversation is selected
  useEffect(() => {
    if (conversationId && !sessionIdRef.current) {
      startSession(
        {
          conversationId,
          deviceInfo: collectDeviceInfo(),
          userAgent: navigator.userAgent,
        },
        {
          onSuccess: (session) => {
            sessionIdRef.current = session.id;
          },
        }
      );
    }

    // Cleanup on unmount or conversation change
    return () => {
      if (sessionIdRef.current) {
        endSession({
          sessionId: sessionIdRef.current,
          data: {
            messagesSent: messageCountRef.current.sent,
            messagesReceived: messageCountRef.current.received,
          },
        });
        sessionIdRef.current = null;
      }
    };
  }, [conversationId]);

  // Track message counts
  const handleMessageSent = () => {
    messageCountRef.current.sent++;
  };

  const handleMessageReceived = () => {
    messageCountRef.current.received++;
  };

  // Also handle beforeunload for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable cleanup
        navigator.sendBeacon(
          `/api/chat/sessions/${sessionIdRef.current}/end`,
          JSON.stringify({
            messagesSent: messageCountRef.current.sent,
            messagesReceived: messageCountRef.current.received,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ... rest of component
}
```

### 3.2 Session History in Conversation Details (Optional)

Add a "Sessions" tab or section in conversation details to show session history:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Conversation: Project Planning                                  │
│  [Messages] [Sessions]                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Session History                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Dec 5, 2025 10:30 - 11:15 (45 min)                         ││
│  │ Messages: 12 sent, 12 received | Tokens: 4,523             ││
│  │ Device: Chrome on macOS (Desktop)                          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Dec 4, 2025 14:00 - 14:30 (30 min)                         ││
│  │ Messages: 8 sent, 8 received | Tokens: 2,341               ││
│  │ Device: Safari on macOS (Desktop)                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Dashboard Integration

### 4.1 Session Stats Cards

**File:** `frontend/src/features/dashboard/components/StatCardsGrid.tsx`

Add session analytics cards to the existing stats grid.

#### New Stats to Display

| Stat | Value Source | Icon |
|------|--------------|------|
| Total Sessions | `sessionStats.totalSessions` | Clock/Session icon |
| Avg Session Duration | `sessionStats.avgSessionDurationMinutes` | Timer icon |
| Active Sessions | `sessionStats.activeSessions` | Activity/Live icon |
| Session Tokens Used | `sessionStats.totalTokensUsed` | Token icon |

#### Code Changes for StatCardsGrid.tsx

```typescript
// Update props interface
interface StatCardsGridProps {
  stats: NotesStats | null;
  aiStats: AIUsageStats | undefined;
  totalTokens: number;
  sessionStats?: SessionStats;  // Add this
}

// Add new icons
const SessionIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// Add session stats to statsConfig array
{
  title: 'Total Sessions',
  value: sessionStats?.totalSessions || 0,
  icon: <SessionIcon />,
  show: !!sessionStats,
},
{
  title: 'Avg Session Duration',
  value: sessionStats ? `${sessionStats.avgSessionDurationMinutes.toFixed(1)} min` : '0 min',
  icon: <TimerIcon />,
  show: !!sessionStats,
},
{
  title: 'Active Sessions',
  value: sessionStats?.activeSessions || 0,
  icon: <ActivityIcon />,
  subtitle: sessionStats?.activeSessions ? (
    <span className="text-green-500 animate-pulse">● Live</span>
  ) : undefined,
  show: !!sessionStats,
},
```

### 4.2 Dashboard Page Updates

**File:** `frontend/src/pages/DashboardPage.tsx`

```typescript
import { useSessionStats } from '@/features/chat/hooks/use-chat-sessions';

export function DashboardPage() {
  // Add session stats query
  const { data: sessionStats, isLoading: sessionLoading } = useSessionStats();

  // ... existing code ...

  return (
    <div className="space-y-6">
      <StatCardsGrid
        stats={stats}
        aiStats={aiStats}
        totalTokens={totalTokens}
        sessionStats={sessionStats}  // Pass session stats
      />
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

### 4.3 Dashboard Data Hook Updates

**File:** `frontend/src/features/dashboard/hooks/use-dashboard-data.ts`

```typescript
import { useSessionStats } from '@/features/chat/hooks/use-chat-sessions';

export function useDashboardData() {
  // ... existing queries ...

  // Add session stats
  const { data: sessionStats, isLoading: sessionStatsLoading } = useSessionStats();

  const isLoading = /* existing */ || sessionStatsLoading;

  return {
    // ... existing returns ...
    sessionStats,
  };
}
```

---

## 5. New Components Specification

### 5.1 NoteVersionHistoryPanel

**File:** `frontend/src/features/notes/components/NoteVersionHistoryPanel.tsx`

```typescript
import { useState } from 'react';
import { useNoteVersionHistory, useRestoreNoteVersion } from '../hooks/use-note-versions';
import { NoteVersionTimeline } from './NoteVersionTimeline';
import { NoteVersionDiffViewer } from './NoteVersionDiffViewer';
import type { NoteVersion } from '@/types/notes';

interface NoteVersionHistoryPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function NoteVersionHistoryPanel({
  noteId,
  isOpen,
  onClose,
  onRestore,
}: NoteVersionHistoryPanelProps) {
  const { data: history, isLoading } = useNoteVersionHistory(noteId);
  const { mutate: restoreVersion, isPending: isRestoring } = useRestoreNoteVersion();
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleRestore = (targetVersion: number) => {
    if (confirm(`Restore note to version ${targetVersion}? This will create a new version.`)) {
      restoreVersion(
        { noteId, targetVersion },
        {
          onSuccess: () => {
            onRestore();
            onClose();
          },
        }
      );
    }
  };

  const handleCompare = (fromVersion: number, toVersion: number) => {
    setSelectedVersions([fromVersion, toVersion]);
    setShowDiff(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 w-96 bg-surface-card shadow-2xl border-l z-50 flex flex-col"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Version History
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : history?.versions.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <p>No version history available.</p>
            <p className="text-sm mt-2">Versions are created when you save changes.</p>
          </div>
        ) : (
          <NoteVersionTimeline
            versions={history?.versions || []}
            currentVersion={history?.currentVersion || 1}
            onCompare={handleCompare}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
        )}
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && selectedVersions && (
        <NoteVersionDiffViewer
          noteId={noteId}
          fromVersion={selectedVersions[0]}
          toVersion={selectedVersions[1]}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}
```

### 5.2 NoteVersionTimeline

**File:** `frontend/src/features/notes/components/NoteVersionTimeline.tsx`

```typescript
import { formatDistanceToNow } from 'date-fns';
import type { NoteVersion } from '@/types/notes';

interface NoteVersionTimelineProps {
  versions: NoteVersion[];
  currentVersion: number;
  onCompare: (fromVersion: number, toVersion: number) => void;
  onRestore: (targetVersion: number) => void;
  isRestoring: boolean;
}

export function NoteVersionTimeline({
  versions,
  currentVersion,
  onCompare,
  onRestore,
  isRestoring,
}: NoteVersionTimelineProps) {
  return (
    <div className="space-y-4">
      {versions.map((version, index) => {
        const isCurrent = version.versionNumber === currentVersion;
        const previousVersion = versions[index + 1];

        return (
          <div
            key={version.versionNumber}
            className="relative pl-6 pb-4"
          >
            {/* Timeline line */}
            {index < versions.length - 1 && (
              <div
                className="absolute left-2 top-6 w-0.5 h-full"
                style={{ backgroundColor: 'var(--border)' }}
              />
            )}

            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${
                isCurrent
                  ? 'bg-brand-600 border-brand-600'
                  : 'bg-surface-card border-gray-400'
              }`}
            />

            {/* Version card */}
            <div
              className="rounded-lg border p-3 transition-all hover:shadow-md"
              style={{
                backgroundColor: isCurrent ? 'var(--color-brand-50)' : 'var(--surface-card)',
                borderColor: isCurrent ? 'var(--color-brand-200)' : 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Version {version.versionNumber}
                  {isCurrent && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-600 text-white">
                      Current
                    </span>
                  )}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDistanceToNow(new Date(version.validFrom), { addSuffix: true })}
                </span>
              </div>

              {version.changeSummary && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {version.changeSummary}
                </p>
              )}

              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                by {version.modifiedBy}
              </p>

              {/* Actions */}
              {!isCurrent && (
                <div className="flex gap-2">
                  {previousVersion && (
                    <button
                      onClick={() => onCompare(version.versionNumber, currentVersion)}
                      className="text-xs px-2 py-1 rounded border transition-colors hover:bg-surface-hover"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Compare
                    </button>
                  )}
                  <button
                    onClick={() => onRestore(version.versionNumber)}
                    disabled={isRestoring}
                    className="text-xs px-2 py-1 rounded bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### 5.3 NoteVersionDiffViewer

**File:** `frontend/src/features/notes/components/NoteVersionDiffViewer.tsx`

```typescript
import { useNoteVersionDiff } from '../hooks/use-note-versions';
import { Modal } from '@/components/ui/Modal';

interface NoteVersionDiffViewerProps {
  noteId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

export function NoteVersionDiffViewer({
  noteId,
  fromVersion,
  toVersion,
  onClose,
}: NoteVersionDiffViewerProps) {
  const { data: diff, isLoading } = useNoteVersionDiff(noteId, fromVersion, toVersion);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Compare v${fromVersion} → v${toVersion}`}
      maxWidth="max-w-4xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : diff ? (
        <div className="space-y-4">
          {/* Change summary */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            {diff.titleChanged && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Title changed</span>
            )}
            {diff.contentChanged && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Content changed</span>
            )}
            {diff.tagsChanged && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">Tags changed</span>
            )}
            {diff.folderChanged && (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Folder changed</span>
            )}
            {diff.archivedChanged && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Archive status changed</span>
            )}
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* From version */}
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Version {fromVersion}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Title</label>
                  <p className={diff.titleChanged ? 'line-through text-red-500' : ''}>
                    {diff.fromVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div 
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.fromVersion.content}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.fromVersion.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded ${
                          diff.tagsRemoved.includes(tag) ? 'bg-red-100 text-red-800 line-through' : 'bg-gray-100'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* To version */}
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-brand-200)' }}>
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Version {toVersion}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Title</label>
                  <p className={diff.titleChanged ? 'text-green-600 font-medium' : ''}>
                    {diff.toVersion.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <div 
                    className="text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {diff.toVersion.content}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.toVersion.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded ${
                          diff.tagsAdded.includes(tag) ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                        }`}
                      >
                        {diff.tagsAdded.includes(tag) && '+ '}
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Failed to load version diff.
        </p>
      )}
    </Modal>
  );
}
```

### 5.4 SessionStatsSection (Optional Dashboard Section)

**File:** `frontend/src/features/dashboard/components/SessionStatsSection.tsx`

```typescript
import { useSessionStats, useActiveSessions } from '@/features/chat/hooks/use-chat-sessions';
import { StatCard } from './StatCard';
import { formatDistanceToNow } from 'date-fns';

export function SessionStatsSection() {
  const { data: stats, isLoading: statsLoading } = useSessionStats();
  const { data: activeSessions, isLoading: activeLoading } = useActiveSessions();

  if (statsLoading || activeLoading) {
    return (
      <div className="animate-pulse rounded-lg p-6" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="h-6 w-48 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Session Analytics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          show={true}
        />

        <StatCard
          title="Avg Duration"
          value={`${stats.avgSessionDurationMinutes.toFixed(1)} min`}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          show={true}
        />

        <StatCard
          title="Active Now"
          value={stats.activeSessions}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          subtitle={
            stats.activeSessions > 0 ? (
              <span className="text-green-500 text-xs animate-pulse">● Live</span>
            ) : undefined
          }
          show={true}
        />

        <StatCard
          title="Messages Total"
          value={stats.totalMessagesSent + stats.totalMessagesReceived}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          subtitle={
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stats.totalMessagesSent} sent / {stats.totalMessagesReceived} received
            </span>
          }
          show={true}
        />
      </div>

      {/* Active Sessions List */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Active Sessions
          </h4>
          <div className="space-y-2">
            {activeSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {session.deviceInfo?.browser || 'Unknown device'}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Session Info */}
      {stats.lastSessionAt && (
        <p className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Last session: {formatDistanceToNow(new Date(stats.lastSessionAt), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
```

---

## 6. File Modifications Summary

| File | Changes Required |
|------|-----------------|
| `frontend/src/features/notes/components/EditNoteModal.tsx` | Add History button, import and render NoteVersionHistoryPanel |
| `frontend/src/features/dashboard/components/StatCardsGrid.tsx` | Add `sessionStats` prop, add session stat cards |
| `frontend/src/pages/DashboardPage.tsx` | Import useSessionStats, pass to StatCardsGrid |
| `frontend/src/features/dashboard/hooks/use-dashboard-data.ts` | Add useSessionStats integration |
| `frontend/src/pages/ChatPage.tsx` | Add session tracking lifecycle hooks |

---

## 7. Implementation Tasks

### Phase 1: Note Version History (Priority: High)

- [ ] Create `NoteVersionHistoryPanel.tsx`
- [ ] Create `NoteVersionTimeline.tsx`
- [ ] Create `NoteVersionDiffViewer.tsx`
- [ ] Update `EditNoteModal.tsx` with History button and panel integration

### Phase 2: Dashboard Session Stats (Priority: High)

- [ ] Update `StatCardsGrid.tsx` props and add session stat cards
- [ ] Update `use-dashboard-data.ts` to include session stats
- [ ] Update `DashboardPage.tsx` to fetch and pass session stats

### Phase 3: Chat Session Tracking (Priority: Medium)

- [ ] Add session lifecycle tracking to `ChatPage.tsx`
- [ ] Handle tab close with `beforeunload` event
- [ ] Track message counts during session

### Phase 4: Optional Enhancements (Priority: Low)

- [ ] Create `SessionStatsSection.tsx` for expanded dashboard view
- [ ] Add session history tab to conversation details
- [ ] Add visual indicators for active sessions in chat sidebar

---

## Appendix: Design Tokens Reference

Use these CSS variables for consistent styling:

```css
--text-primary: Primary text color
--text-secondary: Secondary text color
--text-tertiary: Tertiary/muted text color
--surface-card: Card background
--surface-elevated: Elevated surface background
--surface-hover: Hover state background
--border: Border color
--color-brand-600: Primary brand color
--color-brand-50: Light brand tint
--color-brand-200: Medium brand tint
```
