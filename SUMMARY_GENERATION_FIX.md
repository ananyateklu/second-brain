# Note Summary Generation - Component Reload Fix

## Problem

The Note Summary backfill components (`NoteSummaryBackfill` and `NoteSummarySettings`) were not automatically updating after the background summary generation job completed, failed, or was cancelled. Users had to manually refresh the page or navigate away and back to see the newly generated summaries.

## Root Cause

The issue had two main causes:

### 1. Query Key Mismatch

The `useNotes()` hook uses `noteKeys.all` (`['notes']`) as its query key, but the invalidation logic in several places was using `noteKeys.lists()` (`['notes', 'list']`). TanStack Query uses prefix matching, so invalidating `['notes', 'list']` would not invalidate queries registered with `['notes']`.

**Affected Files:**
- `frontend/src/components/ui/SummaryNotification.tsx` (line 129)
- `frontend/src/features/notes/hooks/use-summary-generation.ts` (lines 33, 80)

### 2. Missing Refetch Logic in Components

The backfill components (`NoteSummaryBackfill` and `NoteSummarySettings`) were not refetching the notes list when the job status changed from "running/pending" to "completed/failed/cancelled".

## Solution

### 1. Fixed Query Key Invalidations

Updated all invalidation calls to use `noteKeys.all` instead of `noteKeys.lists()`:

**`frontend/src/features/notes/hooks/use-summary-generation.ts`:**
- Added documentation explaining why we use `noteKeys.all`
- Changed `noteKeys.lists()` → `noteKeys.all` in `useStartSummaryGeneration` (line 33)
- Changed `noteKeys.lists()` → `noteKeys.all` in `useCancelSummaryJob` (line 80)

**`frontend/src/components/ui/SummaryNotification.tsx`:**
- Changed `noteKeys.lists()` → `noteKeys.all` (line 129)
- Added explicit `refetchQueries` call after invalidation to force immediate UI update
- Added documentation explaining the correct query key to use

### 2. Added Component-Level Refetch Logic

Enhanced both backfill components to automatically refetch notes when the job completes:

**`frontend/src/pages/settings/components/NoteSummaryBackfill.tsx`:**
- Added `useRef` to track previous job status
- Added `useEffect` that detects when job transitions from running/pending to completed/failed/cancelled
- Calls `refetchNotes()` when job finishes to immediately update the component

**`frontend/src/pages/settings/components/NoteSummarySettings.tsx`:**
- Applied the same refetch logic as NoteSummaryBackfill

## Changes Made

### Modified Files

1. **`frontend/src/features/notes/hooks/use-summary-generation.ts`**
   - Fixed query key mismatches (2 occurrences)
   - Added comprehensive documentation

2. **`frontend/src/components/ui/SummaryNotification.tsx`**
   - Fixed query key mismatch
   - Added explicit refetch call
   - Enhanced documentation

3. **`frontend/src/pages/settings/components/NoteSummaryBackfill.tsx`**
   - Added `useRef` import
   - Added previous job status tracking
   - Added automatic refetch on job completion

4. **`frontend/src/pages/settings/components/NoteSummarySettings.tsx`**
   - Added `useRef` import
   - Added previous job status tracking
   - Added automatic refetch on job completion

## How It Works

### Query Invalidation Flow

1. **Job Starts:**
   - `useStartSummaryGeneration` mutation succeeds
   - Invalidates `noteKeys.all` to mark notes cache as stale

2. **Job Polling:**
   - `useSummaryJobStatus` polls every 1 second while job is running/pending
   - Updates job status in store via `updateSummaryJobStatus`

3. **Job Completes:**
   - `SummaryNotification` component detects completion via `useEffect`
   - Invalidates `noteKeys.all` to mark cache as stale
   - Explicitly calls `refetchQueries` to force immediate refetch
   - Shows completion toast notification

4. **Component Updates:**
   - Components using `useNotes()` automatically refetch due to invalidation
   - Backfill components also detect status change via `useEffect`
   - Components call `refetchNotes()` to ensure data is fresh
   - UI updates with newly generated summaries

### Component-Level Refetch

```typescript
const previousJobStatusRef = useRef<string | undefined>(undefined);
const jobStatus = activeSummaryJob?.status?.status;

useEffect(() => {
    const previousStatus = previousJobStatusRef.current;
    const wasGenerating = previousStatus === 'running' || previousStatus === 'pending';
    const isNowComplete = jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'cancelled';

    if (wasGenerating && isNowComplete) {
        // Job just finished - refetch notes to show updated summaries
        void refetchNotes();
    }

    // Update ref for next comparison
    previousJobStatusRef.current = jobStatus;
}, [jobStatus, refetchNotes]);
```

This ensures the component reloads immediately when:
- Job completes successfully
- Job fails with an error
- Job is cancelled by the user

## Testing

To verify the fix works correctly:

1. Navigate to Settings → AI Settings → Note Summaries
2. Click "Generate All" or select specific notes and click "Generate Selected"
3. **Expected behavior:**
   - Progress notification appears in top-right corner
   - Progress bar updates in real-time
   - When job completes, the notes list automatically updates
   - Notes that now have summaries disappear from the "notes without summaries" list
   - No manual page refresh needed

## Benefits

- **Immediate feedback:** Users see results as soon as generation completes
- **Better UX:** No need to manually refresh or navigate away
- **Real-time updates:** Component stays synchronized with backend state
- **Error handling:** Works for all job completion states (success, failure, cancelled)

## Future Improvements

1. **Incremental Updates:** Consider invalidating/refetching after each individual note is processed (would show progress more granularly)
2. **Optimistic Updates:** Could show summaries in the UI before full refetch completes
3. **WebSocket Support:** Replace polling with WebSocket for more efficient real-time updates

## Related Files

- `frontend/src/lib/query-keys.ts` - Query key factory definitions
- `frontend/src/features/notes/hooks/use-notes-query.ts` - Notes query hooks
- `frontend/src/store/slices/summary-slice.ts` - Summary job state management
- `backend/src/SecondBrain.Application/Services/Notes/SummaryGenerationBackgroundService.cs` - Backend job processing
