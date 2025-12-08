# Note Summary Feature - Design Document

## Status

Proposed

## Problem Statement

The `/api/notes` endpoint currently returns full note content for all notes, causing:
- Large payload sizes as notes grow in content
- Slow response times for users with many notes
- Unnecessary bandwidth consumption on list views
- Frontend rendering overhead processing full markdown content

## Solution Overview

Add an AI-generated `summary` field to notes that:
1. Is automatically generated/updated when notes are created or modified
2. Considers title, tags, and content for full context
3. Is returned on list endpoints instead of full content
4. Enhances RAG retrieval quality with semantic summaries

---

## Schema Changes

### Database Migration

Add `summary` column to `notes` table:

```sql
-- database/13_note_summaries.sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary TEXT;
COMMENT ON COLUMN notes.summary IS 'AI-generated summary of note (title, tags, content)';
```

### Entity Update

```csharp
// Note.cs - add property
[Column("summary")]
[MaxLength(1000)]
public string? Summary { get; set; }
```

---

## API Changes

### New DTO: `NoteListResponse`

For list endpoints (lighter payload):

```csharp
public sealed class NoteListResponse
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string? Summary { get; set; }  // AI summary instead of content
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; }
    public bool IsArchived { get; set; }
    public string? Folder { get; set; }
}
```

### Existing `NoteResponse` (unchanged structure)

Used for get-by-id, includes full content:

```csharp
public sealed class NoteResponse
{
    // ... all existing fields including Content
    public string Content { get; set; }
    public string? Summary { get; set; }  // Also include summary
}
```

### Endpoint Changes

| Endpoint | Response | Change |
|----------|----------|--------|
| `GET /api/notes` | `NoteListResponse[]` | Returns summary, NOT content |
| `GET /api/notes/{id}` | `NoteResponse` | Returns both content AND summary |

---

## Summary Generation Service

### Interface

```csharp
public interface INoteSummaryService
{
    Task<string> GenerateSummaryAsync(
        string title,
        string content,
        List<string> tags,
        CancellationToken cancellationToken = default);
}
```

### Implementation Strategy

- Uses cost-effective AI model (gpt-4o-mini) for fast, cheap summaries
- Builds context from title, tags, and content
- Truncates content to fit context window
- Returns concise 1-2 sentence summaries

### Configuration

```json
{
  "NoteSummary": {
    "Enabled": true,
    "Provider": "OpenAI",
    "Model": "gpt-4o-mini",
    "MaxTokens": 150,
    "MaxContentLength": 4000,
    "GenerateOnCreate": true,
    "GenerateOnUpdate": true,
    "RegenerateThreshold": 0.3
  }
}
```

---

## Integration Points

### 1. CreateNoteCommandHandler

Generate summary during note creation.

### 2. UpdateNoteCommandHandler

Regenerate summary when content/title/tags change significantly.

### 3. Import Handler

Generate summaries for imported notes.

### 4. Backfill Existing Notes

Admin endpoint to generate summaries for notes without them.

---

## RAG Enhancement

Summaries improve RAG in two ways:

### 1. Better Context Assembly

Use summary in RAG context instead of truncated content for more semantic relevance.

### 2. Summary Embeddings (Optional)

Store summary embeddings alongside chunk embeddings for note-level retrieval.

---

## Frontend Changes

### Types Update

```typescript
export interface NoteListItem {
  id: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isArchived: boolean;
  folder?: string;
}

export interface Note extends NoteListItem {
  content: string;
}
```

### NoteCard Component

Update to prefer summary over content for display.

---

## Performance Considerations

### Summary Generation Timing

**Recommended: Background Job**
- Fire-and-forget after save
- Fast saves, summary may be briefly null
- Frontend shows content preview until summary ready

### Caching

- Summary is immutable until note changes
- Output cache on list endpoint
- Invalidate on note mutation

---

## Migration Strategy

### Phase 1: Schema & Backend
1. Add `summary` column to database
2. Add EF Core migration
3. Create `INoteSummaryService`
4. Integrate into create/update handlers
5. Create `NoteListResponse` DTO
6. Update `GetAllNotes` query to return list DTO

### Phase 2: Frontend
1. Update types
2. Update `NoteCard` to use summary
3. Test list view performance

### Phase 3: Backfill & RAG
1. Create backfill job for existing notes
2. Integrate summary into RAG context

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `database/13_note_summaries.sql` | Create |
| `Note.cs` | Add Summary property |
| `NoteListResponse.cs` | Create new DTO |
| `NoteResponse.cs` | Add Summary property |
| `INoteSummaryService.cs` | Create interface |
| `NoteSummaryService.cs` | Create implementation |
| `NoteSummarySettings.cs` | Create config class |
| `CreateNoteCommandHandler.cs` | Integrate summary generation |
| `UpdateNoteCommandHandler.cs` | Integrate summary regeneration |
| `GetAllNotesQueryHandler.cs` | Return NoteListResponse |
| `MappingExtensions.cs` | Add ToListResponse() |
| `ServiceCollectionExtensions.cs` | Register services |
| `frontend/src/types/notes.ts` | Update types |
| `frontend/src/features/notes/components/NoteCard.tsx` | Use summary |

## Related ADRs

- [ADR 011: Backend Performance Optimizations](adr/011-backend-performance-optimizations.md) - Performance patterns
- [ADR 004: AI Provider Factory Pattern](adr/004-ai-provider-factory-pattern.md) - AI service integration
