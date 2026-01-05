# Current Session Context

> **Last Updated**: 2026-01-04
> **Focus**: SSE Streaming Refinements & Stop Button

---

## Current Work: Real-Time Stats Persistence

### Status: FIXED

After indexing completes, the final stats from SSE now persist correctly in the UI.

### Issues Found & Fixed

1. **Immediate invalidation overwrote cache**: We were calling `invalidateQueries` right after `setQueryData`, which triggered a refetch that overwrote the cache with stale data.
   - **Fix**: Only invalidate when we DON'T have finalStats (error/cancel cases)

2. **Hardcoded userId**: Was using `'default-user'` instead of actual userId from Zustand store.
   - **Fix**: Get userId from `useBoundStore.getState().user?.userId`

---

## Completed Today: SSE Streaming Refinements

### 1. Navigation Persistence Fix

**Problem**: UI broke when navigating away from Settings page during indexing - SSE stream stopped.

**Solution**: Refactored `useIndexingStream` hook to use `useSyncExternalStore` for proper React synchronization with the global `IndexingStreamManager`.

**Files Changed**:
- `use-indexing.ts` - Added snapshot caching, stable getSnapshot functions per vector store
- Uses `useSyncExternalStore(subscribeToManager, getSnapshot, getSnapshot)` pattern

### 2. Removed 404 Polling Errors

**Problem**: Failed requests to `/api/indexing/status/{jobId}` showing 404 errors.

**Solution**: Removed redundant `useIndexingStatus` polling from `JobCard.tsx` since SSE streaming updates the Zustand store directly.

### 3. Fixed Excessive Stats Polling

**Problem**: `/api/indexing/stats` endpoint was being polled every 2 seconds during indexing, taking 1.8-6 seconds to respond.

**Solution**: Changed polling logic to NEVER poll during SSE streaming:
```typescript
const shouldPollStats = !isStreaming && (finalizingPostgres || finalizingPinecone);
```

### 4. Stop Button Implementation

**Problem**: No way to stop indexing once started.

**Solution**: Added stop button to `IndexHealthCard` with full backend cancellation support.

**Frontend Changes**:
| File | Change |
|------|--------|
| `IndexHealthCard.tsx` | Added `onStopIndexing`, `isStoppingIndexing` props, red Stop button UI |
| `IndexHealthDashboard.tsx` | Added `handleStopIndexing` callback, stopping state per vector store |
| `indexing-stream-manager.ts` | Made `stopStream` async, calls backend cancel API |

**Backend Changes**:
| File | Change |
|------|--------|
| `IndexingService.cs` | Added `_streamingJobCancellations` static dictionary to track streaming jobs |
| `IndexingService.cs` | `StreamIndexingAsync` registers linked CTS, cleans up in finally block |
| `IndexingService.cs` | `CancelIndexingAsync` checks streaming registry first, then database |

**Flow**:
1. User clicks Stop → Frontend calls `cancelIndexing(vectorStore)`
2. Frontend calls `POST /api/indexing/cancel/{jobId}`
3. Backend finds streaming job's CTS in registry
4. Backend calls `CancelAsync()` on the CTS
5. Linked token triggers `IsCancellationRequested` in streaming loop
6. Streaming stops at next note boundary

### 5. Final Stats Cache Update (Partial)

**Problem**: After indexing completes, UI waits for slow `/api/indexing/stats` endpoint instead of using `finalStats` from SSE `complete` event.

**Solution Implemented**:
- Updated `StreamListener` type to include optional `finalStats` parameter
- On `complete` event, passes `completeData.finalStats` to listeners
- Hook uses `queryClient.setQueryData()` to update cache immediately

**Status**: Implemented but not working as expected - stats not persisting.

---

## Architecture: Global SSE Manager

The `IndexingStreamManager` class manages SSE connections outside React component lifecycle:

```typescript
class IndexingStreamManager {
  private activeStreams: Map<VectorStoreProvider, ActiveStream>;
  private listeners: Set<StreamListener>;

  async startStream(params): Promise<void>;      // Start SSE for a vector store
  async stopStream(vectorStore, cancelBackendJob): Promise<void>;  // Cancel SSE stream + backend job
  isStreaming(vectorStore): boolean;              // Check if streaming
  getProgress(vectorStore): Progress | null;      // Get current progress
  getStats(vectorStore): Stats | null;            // Get current stats
  subscribe(listener): () => void;                // Subscribe to updates (includes finalStats)
}

export const indexingStreamManager = new IndexingStreamManager();
```

The React hook `useIndexingStream()` uses `useSyncExternalStore` to subscribe to this manager with proper React synchronization.

---

## Previous: Index Health Dashboard Redesign

### Status: COMPLETE

Redesigned the Index Health section in Settings > Indexing with a modern, polished UI featuring ring progress visualization, side-by-side vector store cards, and enhanced metrics.

### New Components Created

**Location**: `frontend/src/components/data-display/index-health/`

| Component | Purpose |
|-----------|---------|
| `RingProgress.tsx` | SVG circular progress showing indexed coverage (0-100%) |
| `MetricsRow.tsx` | 4-column grid: Not Indexed, Stale, Embeddings, Dimensions |
| `StorageEstimate.tsx` | Calculates & displays storage size (embeddings × dims × 4 bytes) |
| `ActivitySparkline.tsx` | Mini line chart showing 7-day activity trend |
| `StatusFooter.tsx` | Health status with icon + text + last indexed + provider |
| `IndexHealthCard.tsx` | Main card combining all above components |
| `IndexHealthCardSkeleton.tsx` | Loading skeleton matching card structure |
| `PineconeSetupCard.tsx` | Setup prompt for Tauri/desktop mode |
| `IndexHealthDashboard.tsx` | Container rendering side-by-side cards |
| `index.ts` | Barrel export |

---

## Completed: Subtle Frosted Glass UI (FINALIZED)

All pages have been updated with subtle frosted glass styling. See patterns below for reference.

### Standard Color-Mix Values

```css
/* Card/Container Backgrounds */
background-color: color-mix(in srgb, var(--text-primary) 2%, transparent);

/* Button & Input Backgrounds */
background-color: color-mix(in srgb, var(--text-primary) 4%, transparent);

/* Borders & Dividers */
border-color: color-mix(in srgb, var(--text-primary) 6%, transparent);

/* Floating Containers (dropdowns, modals) */
background-color: color-mix(in srgb, var(--background) 90%, transparent);
backdrop-filter: blur(20px) saturate(180%);

/* Selected/Active States */
background-color: var(--color-brand-600);
color: #ffffff;
```

---

**Remember**: This file is for current session work. Long-term learnings are in `.claude/memory.md`.
