# Code Cleanup: Backward Compatibility Removal

**Date:** December 2024
**Branch:** `note-versioning`
**Purpose:** Remove all backward compatibility code, deprecated re-exports, and silent error fallbacks to expose issues in new code rather than hiding them with fallbacks.

---

## Executive Summary

This cleanup removed 33+ backward compatibility patterns across the frontend and backend, including:

- 7 deprecated store proxy files deleted
- 15+ import updates to use unified store directly
- Legacy migrations removed
- Silent try-catch blocks replaced with error propagation
- Deprecated types and re-exports cleaned up

### Key Decision: Error Handling Strategy

**Chosen approach:** Throw on ALL errors (maximum exposure)

Rationale: Since this is a ground-up application, we want to:

1. Find and fix root causes rather than relying on fallbacks
2. Expose issues in new code immediately
3. Prevent silent failures that mask bugs

---

## Items NOT Removed (By Design)

These were identified during analysis but determined to be **features, not backward compatibility**:

| Item | Reason to Keep |
|------|----------------|
| Dual content format (markdown + TipTap JSON) | Feature for rich editing |
| Auto-create versioning for notes without history | Graceful data handling |
| Soft delete query filters | Data integrity feature |
| Nullable DTOs for partial updates | API flexibility feature |
| Configuration hierarchy with defaults | Standard config pattern |
| ExternalId for import tracking | Import system feature |
| Import source mapping | Data provenance tracking |

---

## Phase 1: Deprecated Store Re-exports

### Files Deleted (7)

| File | Purpose | Lines |
|------|---------|-------|
| `frontend/src/store/theme-store.ts` | Proxy wrapper to `useBoundStore` | ~15 |
| `frontend/src/store/auth-store.ts` | Proxy wrapper to `useBoundStore` | ~20 |
| `frontend/src/store/settings-store.ts` | Proxy wrapper to `useBoundStore` | ~25 |
| `frontend/src/store/ollama-download-store.ts` | Proxy wrapper to `useBoundStore` | ~30 |
| `frontend/src/store/__tests__/auth-store.test.ts` | Tests for deleted proxy | ~50 |
| `frontend/src/store/__tests__/theme-store.test.ts` | Tests for deleted proxy | ~40 |
| `frontend/src/store/__tests__/settings-store.test.ts` | Tests for deleted proxy | ~60 |

### Import Updates (15 files)

All changed from deprecated proxies to direct `useBoundStore` imports:

```typescript
// Before
import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { useSettingsStore } from '../store/settings-store';

// After
import { useBoundStore } from '../store/bound-store';
```

**Updated files:**

- `frontend/src/hooks/use-unified-stream.ts`
- `frontend/src/services/agent.service.ts`
- `frontend/src/services/chat.service.ts`
- `frontend/src/services/ai.service.ts`
- `frontend/src/main.tsx`
- `frontend/src/features/chat/hooks/use-chat-settings.ts`
- `frontend/src/features/chat/hooks/use-chat-conversation-manager.ts`
- `frontend/src/features/chat/hooks/use-chat-provider-selection.ts`
- `frontend/src/features/ai/hooks/use-ai-health.ts`
- `frontend/src/pages/settings/components/NoteSummarySettings.tsx`
- `frontend/src/pages/settings/GeneralSettings.tsx`
- `frontend/src/utils/provider-logos.ts`
- `frontend/src/features/notes/components/__tests__/NoteCard.test.tsx`
- `frontend/src/hooks/__tests__/use-unified-stream.test.tsx`
- `frontend/src/components/__tests__/MarkdownMessage.test.tsx`

---

## Phase 2: Legacy Migrations Removed

### 2.1 Sidebar State Migration

**File:** `frontend/src/store/slices/ui-slice.ts`

**Removed:** Migration from old boolean key `second-brain-sidebar-collapsed` to new tri-state key.

```typescript
// REMOVED - Migration code
const legacyKey = 'second-brain-sidebar-collapsed';
const legacyValue = localStorage.getItem(legacyKey);
if (legacyValue !== null) {
  localStorage.removeItem(legacyKey);
  const newState: SidebarState = legacyValue === 'true' ? 'collapsed' : 'expanded';
  localStorage.setItem(SIDEBAR_STORAGE_KEY, newState);
  return newState;
}
```

### 2.2 Firestore→PostgreSQL Migration

**File:** `frontend/src/services/user-preferences.service.ts`

**Removed:** Firestore case in vector store provider validation.

```typescript
// Before - silently converted Firestore to PostgreSQL
validateVectorStoreProvider(provider: string): VectorStoreProvider {
  if (provider === 'PostgreSQL' || provider === 'Pinecone') {
    return provider;
  }
  if (provider === 'Firestore') {
    return 'PostgreSQL'; // Firestore no longer supported
  }
  return 'PostgreSQL';
}

// After - throws on invalid provider
validateVectorStoreProvider(provider: string): VectorStoreProvider {
  if (provider === 'PostgreSQL' || provider === 'Pinecone') {
    return provider;
  }
  throw new Error(`Invalid vector store provider: ${provider}. Must be 'PostgreSQL' or 'Pinecone'.`);
}
```

### 2.3 Legacy System Context Markers

**Files:**

- `backend/src/SecondBrain.Application/Services/Agents/Strategies/BaseAgentStreamingStrategy.cs`
- `backend/src/SecondBrain.Application/Services/Agents/Strategies/AnthropicStreamingStrategy.cs`

**Removed:** `StripLegacySystemContextMarkers` method and all calls to it.

```csharp
// REMOVED - entire method (~25 lines)
protected static string StripLegacySystemContextMarkers(string content)
{
    // Old marker format: [SYSTEM_CONTEXT_START]...[SYSTEM_CONTEXT_END]
    // These were used before we had proper system message injection
    ...
}
```

### 2.4 Legacy Embedding Model

**File:** `backend/src/SecondBrain.Application/Services/Embeddings/Providers/OpenAIEmbeddingProvider.cs`

**Removed:** `text-embedding-ada-002` from fallback models array.

```csharp
// Before - included legacy model
private static readonly EmbeddingModelInfo[] FallbackModels =
[
    new EmbeddingModelInfo { ModelId = "text-embedding-3-small", ... },
    new EmbeddingModelInfo { ModelId = "text-embedding-3-large", ... },
    new EmbeddingModelInfo { ModelId = "text-embedding-ada-002", Description = "Legacy model..." }
];

// After - only current models
private static readonly EmbeddingModelInfo[] FallbackModels =
[
    new EmbeddingModelInfo { ModelId = "text-embedding-3-small", ... },
    new EmbeddingModelInfo { ModelId = "text-embedding-3-large", ... }
];
```

---

## Phase 3: Deprecated Types and Re-exports

### 3.1 Deprecated Store Types

**File:** `frontend/src/store/types.ts`

**Removed:** `editingNote` deprecated field from `UISliceState` interface.

### 3.2 Deprecated Selectors

**File:** `frontend/src/store/selectors.ts`

**Removed:** `selectEditingNote` deprecated selector.

### 3.3 Deprecated Query Key Constants

**File:** `frontend/src/lib/constants.ts`

**Removed:** Deprecated `QUERY_KEYS` constant object (replaced by factory pattern in `lib/query-keys.ts`).

### 3.4 Legacy Component Comments

**File:** `frontend/src/features/chat/components/input/index.ts`

**Removed:** "Legacy standalone component exports" comment label.

---

## Phase 4: Silent Fallbacks → Explicit Errors

### 4.1 Frontend IndexedDB Storage

**File:** `frontend/src/hooks/use-indexed-db.ts`

**Removed:** localStorage fallback when IndexedDB is unavailable.

```typescript
// Before - silently fell back to localStorage
async save(draft: DraftEntry): Promise<void> {
  if (isIndexedDBAvailable()) {
    try {
      await saveDraftToIndexedDB(draft);
    } catch {
      saveDraftToLocalStorage(draft); // Silent fallback
    }
  } else {
    saveDraftToLocalStorage(draft);
  }
}

// After - throws on IndexedDB unavailable
async save(draft: DraftEntry): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available');
  }
  await saveDraftToIndexedDB(draft);
}
```

**Also removed:** All localStorage fallback functions (4 functions, ~50 lines):

- `saveDraftToLocalStorage()`
- `loadDraftFromLocalStorage()`
- `deleteDraftFromLocalStorage()`
- `getAllDraftsFromLocalStorage()`

### 4.2 Frontend Store Hydration

**File:** `frontend/src/store/bound-store.ts`

**Changed:** Type coercion fallbacks to validation errors.

```typescript
// Before - silently used defaults for invalid values
merge: (persistedState, currentState) => {
  const parsed = persistedState as Partial<BoundStore> | undefined;
  return {
    ...currentState,
    defaultNoteView: validNoteViews.includes(parsed?.defaultNoteView)
      ? parsed.defaultNoteView
      : currentState.defaultNoteView, // Silent fallback
    ...
  };
}

// After - throws on invalid persisted state
merge: (persistedState, currentState) => {
  const parsed = persistedState as Partial<BoundStore> | undefined;
  if (parsed === undefined) return currentState;

  // Validate NoteView - throw on invalid value
  const validNoteViews: NoteView[] = ['list', 'grid'];
  if (parsed.defaultNoteView !== undefined && !validNoteViews.includes(parsed.defaultNoteView)) {
    throw new Error(`Invalid persisted defaultNoteView: ${parsed.defaultNoteView}`);
  }

  // Similar validation for fontSize, vectorStoreProvider, theme, etc.
  ...
}
```

**Validation added for:**

- `defaultNoteView` (must be 'list' or 'grid')
- `fontSize` (must be 'small', 'medium', or 'large')
- `vectorStoreProvider` (must be 'PostgreSQL' or 'Pinecone')
- `theme` (must be 'light', 'dark', or 'blue')
- `itemsPerPage` (must be number)
- `autoSaveInterval` (must be number)
- Boolean fields (8 fields must be boolean type)

### 4.3 Backend JSON Parsing

**File:** `backend/src/SecondBrain.Application/Services/Notes/NoteVersionService.cs`

**Removed:** Try-catch in `JsonContentEquals` and `ParseContentJson`.

```csharp
// Before - returned false/null on parse errors
private static bool JsonContentEquals(string json1, string json2)
{
    try {
        using var doc1 = JsonDocument.Parse(json1);
        using var doc2 = JsonDocument.Parse(json2);
        return JsonElementEquals(doc1.RootElement, doc2.RootElement);
    } catch {
        return false; // Silent fallback
    }
}

// After - lets JSON errors propagate
private static bool JsonContentEquals(string json1, string json2)
{
    using var doc1 = JsonDocument.Parse(json1);
    using var doc2 = JsonDocument.Parse(json2);
    return JsonElementEquals(doc1.RootElement, doc2.RootElement);
}
```

### 4.4 Backend Version Creation

**File:** `backend/src/SecondBrain.Application/Services/Notes/NoteOperationService.cs`

**Removed:** Try-catch blocks around all version creation operations (4 locations):

- Note creation initial version (line ~128)
- Note update version (line ~298)
- Archive version (line ~411)
- Unarchive version (line ~598)

```csharp
// Before - silently logged and continued
try {
    var initialVersion = await _versionService.CreateInitialVersionAsync(...);
} catch (Exception ex) {
    _logger.LogWarning(ex, "Failed to create initial version");
    // Continued without version
}

// After - errors propagate
var initialVersion = await _versionService.CreateInitialVersionAsync(...);
```

---

## Test Results

### Frontend

| Category | Count | Status |
|----------|-------|--------|
| Total Tests | 943 | ✅ All Passing |
| Build | - | ✅ Successful |
| TypeScript Check | - | ✅ No Errors |

### Backend Unit Tests

| Category | Count | Status |
|----------|-------|--------|
| Total Tests | 1,670 | ✅ All Passing |

**Fixed test bugs during cleanup:**

1. `GrokImageProviderTests.GetSupportedSizes_ReturnsExpectedSizes` - Test expected 3 sizes but provider correctly only supports 1 (API limitation)
2. `NoteOperationServiceVersioningTests.UpdateAsync_WithAgentSource_CreatesVersionWithAgentSource` - Case-sensitive string comparison issue ("agent" vs "Agent")

### Backend Integration Tests

| Category | Count | Status |
|----------|-------|--------|
| Total Tests | 191 | ✅ All Passing |

**Issue Found & Fixed:** The 16 initial failures were caused by an **outdated stored procedure** in the test fixture. The cleanup exposed this issue by removing silent error handling.

**Root Cause:** `WebApplicationFactoryFixture.ApplyVersioningSchema()` created the `create_note_version` function with only 9 parameters, but the production schema (and `SqlNoteVersionRepository`) requires 12 parameters:

| Missing Parameters | Type | Purpose |
|-------------------|------|---------|
| `p_content_json` | JSONB | TipTap JSON content |
| `p_content_format` | INTEGER | Content format enum |
| `p_image_ids` | TEXT[] | Attached image IDs |

**Fix Applied:** Updated `WebApplicationFactoryFixture.cs` to:

1. Add `content_json`, `content_format`, and `image_ids` columns to `note_versions` table
2. Update `create_note_version` function signature to match production (12 parameters)
3. Use `ARRAY[]::TEXT[]` instead of `'{}'` to avoid SQL format string parsing issues

---

## Files Modified Summary

### Frontend (16 files)

| File | Changes |
|------|---------|
| `store/slices/ui-slice.ts` | Removed sidebar migration |
| `store/types.ts` | Removed deprecated `editingNote` field |
| `store/selectors.ts` | Removed deprecated `selectEditingNote` |
| `store/bound-store.ts` | Added strict validation, removed unused import |
| `services/user-preferences.service.ts` | Throw on invalid provider |
| `hooks/use-indexed-db.ts` | Removed localStorage fallback |
| `lib/constants.ts` | Removed deprecated `QUERY_KEYS` |
| `features/chat/components/input/index.ts` | Removed legacy comment |
| + 15 files | Import updates (deprecated stores → bound-store) |

### Backend (6 files)

| File | Changes |
|------|---------|
| `Services/Notes/NoteVersionService.cs` | Removed JSON parse try-catch |
| `Services/Notes/NoteOperationService.cs` | Removed 4 version creation try-catch blocks |
| `Services/Agents/Strategies/BaseAgentStreamingStrategy.cs` | Removed `StripLegacySystemContextMarkers` |
| `Services/Agents/Strategies/AnthropicStreamingStrategy.cs` | Removed calls to legacy marker stripping |
| `Services/Embeddings/Providers/OpenAIEmbeddingProvider.cs` | Removed legacy ada-002 model |
| `tests/.../BaseAgentStreamingStrategyTests.cs` | Removed tests for deleted method |

### Test Fixes (3 files)

| File | Changes |
|------|---------|
| `tests/.../Fixtures/WebApplicationFactoryFixture.cs` | Updated stored procedure to match production schema (12 params) |
| `tests/.../GrokImageProviderTests.cs` | Fixed expected size count (3 → 1) |
| `tests/.../NoteOperationServiceVersioningTests.cs` | Fixed case-sensitive string comparison |

---

## Migration Notes

### For Developers

1. **Store imports:** Use `useBoundStore` directly, not the deprecated proxy stores
2. **Vector store provider:** Only 'PostgreSQL' and 'Pinecone' are valid
3. **Draft storage:** IndexedDB is required, no localStorage fallback
4. **Version creation:** Errors propagate - ensure proper error handling in UI

### For Users

1. **Browser requirements:** IndexedDB must be available (no private browsing mode restrictions)
2. **Local storage:** Clear corrupted storage if hydration errors occur

---

## Future Considerations

1. **Integration test database:** Investigate version creation failures
2. **Error boundaries:** Ensure UI properly handles propagated errors
3. **Monitoring:** Add alerting for version creation failures in production
