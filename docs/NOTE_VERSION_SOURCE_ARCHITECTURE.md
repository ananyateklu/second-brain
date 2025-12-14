# Note Version Source Tracking - Architectural Design Guide

## Problem Statement

Currently, notes can be created/modified through multiple entry points:

1. **Web API** → CQRS Commands → Repository (has version tracking)
2. **Agent Plugins** → Direct Repository (bypasses version tracking)
3. **Import Service** → Direct Repository (bypasses version tracking)

This creates inconsistent behavior where:

- Version history is only created for web operations
- Source tracking is fragmented
- Business logic (validation, versioning, indexing) is duplicated or missing

## Current Architecture Issues

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           CURRENT (PROBLEMATIC)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Web API                    Agent Plugins           Import Service     │
│      │                            │                       │             │
│      ▼                            │                       │             │
│  ┌───────────────┐               │                       │             │
│  │ CQRS Handlers │               │                       │             │
│  │ (versioning)  │               │                       │             │
│  └───────┬───────┘               │                       │             │
│          │                       │                       │             │
│          ▼                       ▼                       ▼             │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    INoteRepository                          │       │
│  │         (no business logic, just data access)               │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Problems:                                                              │
│  ❌ Agent plugins bypass versioning                                     │
│  ❌ Import service bypasses versioning                                  │
│  ❌ Business logic duplicated in command handlers                       │
│  ❌ No single source of truth for note operations                       │
│  ❌ Source tracking requires changes in multiple places                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Proposed Architecture

### Option A: Domain Service Pattern (Recommended)

Introduce a `INoteOperationService` that encapsulates ALL note business logic. All entry points use this service.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROPOSED ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Web API              Agent Plugins           Import Service           │
│      │                      │                       │                   │
│      ▼                      │                       │                   │
│  ┌───────────────┐         │                       │                   │
│  │ CQRS Handlers │         │                       │                   │
│  │ (thin layer)  │         │                       │                   │
│  └───────┬───────┘         │                       │                   │
│          │                  │                       │                   │
│          ▼                  ▼                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │               INoteOperationService                          │       │
│  │  ┌─────────────────────────────────────────────────────┐    │       │
│  │  │ • Validates input                                    │    │       │
│  │  │ • Creates/updates notes via repository               │    │       │
│  │  │ • Creates version history (with source tracking)     │    │       │
│  │  │ • Triggers embedding/indexing                        │    │       │
│  │  │ • Publishes domain events                            │    │       │
│  │  │ • Enforces business rules                            │    │       │
│  │  └─────────────────────────────────────────────────────┘    │       │
│  └───────────────────────────┬─────────────────────────────────┘       │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                     │
│          ▼                   ▼                   ▼                     │
│  ┌──────────────┐   ┌──────────────────┐  ┌────────────────┐          │
│  │INoteRepository│   │INoteVersionRepo  │  │IEmbeddingService│          │
│  └──────────────┘   └──────────────────┘  └────────────────┘          │
│                                                                         │
│  Benefits:                                                              │
│  ✅ Single source of truth for note operations                          │
│  ✅ Consistent versioning across all entry points                       │
│  ✅ Source tracking handled in one place                                │
│  ✅ Business logic not duplicated                                       │
│  ✅ Easy to add cross-cutting concerns (audit, events)                  │
│  ✅ Testable - mock the service, not multiple components                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Option B: MediatR-First Pattern (Alternative)

Have agent plugins dispatch commands through MediatR instead of using repositories directly.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      ALTERNATIVE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Web API              Agent Plugins           Import Service           │
│      │                      │                       │                   │
│      │                      │                       │                   │
│      ▼                      ▼                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                      IMediator                               │       │
│  │              (dispatch commands/queries)                     │       │
│  └───────────────────────────┬─────────────────────────────────┘       │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    CQRS Handlers                             │       │
│  │  CreateNoteCommandHandler, UpdateNoteCommandHandler, etc.    │       │
│  │  (all business logic: validation, versioning, indexing)      │       │
│  └───────────────────────────┬─────────────────────────────────┘       │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    Repositories                              │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Benefits:                                                              │
│  ✅ Follows existing CQRS pattern                                       │
│  ✅ Minimal new abstractions                                            │
│  ✅ Pipeline behaviors apply to all operations                          │
│                                                                         │
│  Drawbacks:                                                             │
│  ⚠️ Commands need source parameter added                                │
│  ⚠️ Agent plugins become thinner but need IMediator                     │
│  ⚠️ Less flexible for complex orchestration                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Recommended Approach: Option A (Domain Service)

### Why Domain Service over MediatR-First?

1. **Single Responsibility**: The service owns note operations, handlers own request/response mapping
2. **Testability**: One service to mock vs. multiple handlers
3. **Flexibility**: Can add complex orchestration without bloating handlers
4. **Explicit Sources**: Source is a required parameter, not optional
5. **Domain Events**: Easy place to publish events for side effects
6. **Future-proof**: Adding new operations doesn't require new commands

---

## Implementation Guide

### Phase 1: Define the Domain Model

#### 1.1 Create NoteSource Enum

```csharp
// File: SecondBrain.Core/Enums/NoteSource.cs

namespace SecondBrain.Core.Enums;

/// <summary>
/// Defines the source/origin of a note operation.
/// Used for version history tracking and analytics.
/// </summary>
public enum NoteSource
{
    /// <summary>
    /// Created/modified via web UI
    /// </summary>
    Web,

    /// <summary>
    /// Created/modified by AI agent
    /// </summary>
    Agent,

    /// <summary>
    /// Imported from iOS Notes app
    /// </summary>
    IosNotes,

    /// <summary>
    /// Generic import from external source
    /// </summary>
    Import,

    /// <summary>
    /// System-generated (migrations, maintenance)
    /// </summary>
    System,

    /// <summary>
    /// Restored from version history
    /// </summary>
    Restored
}
```

#### 1.2 Create Operation Request DTOs

```csharp
// File: SecondBrain.Application/Services/Notes/Models/NoteOperationRequests.cs

namespace SecondBrain.Application.Services.Notes.Models;

/// <summary>
/// Request to create a new note.
/// </summary>
public record CreateNoteOperationRequest
{
    public required string UserId { get; init; }
    public required string Title { get; init; }
    public required string Content { get; init; }
    public List<string> Tags { get; init; } = new();
    public string? Folder { get; init; }
    public bool IsArchived { get; init; }
    public required NoteSource Source { get; init; }

    /// <summary>
    /// Optional external ID for imports (iOS Notes, etc.)
    /// </summary>
    public string? ExternalId { get; init; }

    /// <summary>
    /// Optional images to attach
    /// </summary>
    public List<NoteImageDto>? Images { get; init; }

    /// <summary>
    /// Optional custom creation timestamp (for imports)
    /// </summary>
    public DateTime? CreatedAt { get; init; }
}

/// <summary>
/// Request to update an existing note.
/// </summary>
public record UpdateNoteOperationRequest
{
    public required string NoteId { get; init; }
    public required string UserId { get; init; }
    public required NoteSource Source { get; init; }

    // All fields optional - only provided fields are updated
    public string? Title { get; init; }
    public string? Content { get; init; }
    public List<string>? Tags { get; init; }
    public string? Folder { get; init; }
    public bool? IsArchived { get; init; }

    /// <summary>
    /// If true, explicitly update folder (allows setting to null)
    /// </summary>
    public bool UpdateFolder { get; init; }
}

/// <summary>
/// Request to append content to a note.
/// </summary>
public record AppendToNoteOperationRequest
{
    public required string NoteId { get; init; }
    public required string UserId { get; init; }
    public required string ContentToAppend { get; init; }
    public required NoteSource Source { get; init; }
    public bool AddNewline { get; init; } = true;
}

/// <summary>
/// Request to delete a note.
/// </summary>
public record DeleteNoteOperationRequest
{
    public required string NoteId { get; init; }
    public required string UserId { get; init; }
    public required NoteSource Source { get; init; }
    public bool SoftDelete { get; init; } = true;
}

/// <summary>
/// Request to restore a note version.
/// </summary>
public record RestoreVersionOperationRequest
{
    public required string NoteId { get; init; }
    public required string UserId { get; init; }
    public required int TargetVersionNumber { get; init; }
}
```

#### 1.3 Create Operation Result Type

```csharp
// File: SecondBrain.Application/Services/Notes/Models/NoteOperationResult.cs

namespace SecondBrain.Application.Services.Notes.Models;

/// <summary>
/// Result of a note operation with change tracking.
/// </summary>
public record NoteOperationResult
{
    public required Note Note { get; init; }
    public required int VersionNumber { get; init; }
    public required NoteSource Source { get; init; }
    public required List<string> Changes { get; init; }
    public string? ChangeSummary { get; init; }
    public bool IsNewNote { get; init; }
}
```

### Phase 2: Define the Service Interface

```csharp
// File: SecondBrain.Application/Services/Notes/INoteOperationService.cs

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Domain service for all note operations.
/// Centralizes business logic including versioning, validation, and indexing.
///
/// All entry points (CQRS handlers, agent plugins, import service)
/// MUST use this service for note mutations.
/// </summary>
public interface INoteOperationService
{
    #region Create Operations

    /// <summary>
    /// Creates a new note with version history.
    /// </summary>
    Task<Result<NoteOperationResult>> CreateAsync(
        CreateNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Duplicates an existing note.
    /// </summary>
    Task<Result<NoteOperationResult>> DuplicateAsync(
        string sourceNoteId,
        string userId,
        string? newTitle,
        NoteSource source,
        CancellationToken cancellationToken = default);

    #endregion

    #region Update Operations

    /// <summary>
    /// Updates an existing note.
    /// Only provided fields are updated.
    /// </summary>
    Task<Result<NoteOperationResult>> UpdateAsync(
        UpdateNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Appends content to the end of a note.
    /// </summary>
    Task<Result<NoteOperationResult>> AppendAsync(
        AppendToNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Archives or unarchives a note.
    /// </summary>
    Task<Result<NoteOperationResult>> SetArchivedAsync(
        string noteId,
        string userId,
        bool isArchived,
        NoteSource source,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves a note to a folder.
    /// </summary>
    Task<Result<NoteOperationResult>> MoveToFolderAsync(
        string noteId,
        string userId,
        string? folder,
        NoteSource source,
        CancellationToken cancellationToken = default);

    #endregion

    #region Delete Operations

    /// <summary>
    /// Deletes a note (soft or hard delete).
    /// </summary>
    Task<Result<bool>> DeleteAsync(
        DeleteNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes a soft-deleted note.
    /// </summary>
    Task<Result<bool>> PermanentDeleteAsync(
        string noteId,
        string userId,
        CancellationToken cancellationToken = default);

    #endregion

    #region Version Operations

    /// <summary>
    /// Restores a note to a previous version.
    /// Creates a new version with the restored content.
    /// </summary>
    Task<Result<NoteOperationResult>> RestoreVersionAsync(
        RestoreVersionOperationRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region Bulk Operations

    /// <summary>
    /// Imports multiple notes in a batch.
    /// </summary>
    Task<Result<ImportNotesResponse>> ImportBatchAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk deletes multiple notes.
    /// </summary>
    Task<Result<int>> BulkDeleteAsync(
        IReadOnlyCollection<string> noteIds,
        string userId,
        NoteSource source,
        CancellationToken cancellationToken = default);

    #endregion
}
```

### Phase 3: Implement the Service

```csharp
// File: SecondBrain.Application/Services/Notes/NoteOperationService.cs

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Domain service implementation for note operations.
/// </summary>
public class NoteOperationService : INoteOperationService
{
    private readonly INoteRepository _noteRepository;
    private readonly INoteVersionRepository _versionRepository;
    private readonly INoteImageRepository _imageRepository;
    private readonly INoteSummaryService _summaryService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<NoteOperationService> _logger;

    public NoteOperationService(
        INoteRepository noteRepository,
        INoteVersionRepository versionRepository,
        INoteImageRepository imageRepository,
        INoteSummaryService summaryService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<NoteOperationService> logger)
    {
        _noteRepository = noteRepository;
        _versionRepository = versionRepository;
        _imageRepository = imageRepository;
        _summaryService = summaryService;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task<Result<NoteOperationResult>> CreateAsync(
        CreateNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Creating note for user {UserId} from source {Source}",
            request.UserId, request.Source);

        // 1. Validate
        if (string.IsNullOrWhiteSpace(request.Title))
            return Result<NoteOperationResult>.Failure(Error.Validation("Title is required"));

        // 2. Generate AI summary (if enabled)
        string? summary = null;
        if (_summaryService.IsEnabled)
        {
            summary = await _summaryService.GenerateSummaryAsync(
                request.Title,
                request.Content,
                request.Tags,
                cancellationToken);
        }

        // 3. Create the note entity
        var note = new Note
        {
            Id = UuidV7.NewId(),
            Title = request.Title,
            Content = request.Content,
            Summary = summary,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UserId = request.UserId,
            ExternalId = request.ExternalId,
            Source = request.Source.ToDbValue(),
            CreatedAt = request.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 4. Persist the note
        var createdNote = await _noteRepository.CreateAsync(note);

        // 5. Create initial version
        var version = await _versionRepository.CreateInitialVersionAsync(
            createdNote,
            request.UserId,
            cancellationToken);

        // 6. Handle images (async, fire-and-forget)
        if (request.Images?.Count > 0)
        {
            await ProcessImagesAsync(createdNote, request.Images, request.UserId, cancellationToken);
        }

        // 7. Trigger embedding/indexing (async, fire-and-forget)
        _ = TriggerIndexingAsync(createdNote.Id);

        _logger.LogInformation(
            "Created note {NoteId} version {Version} from {Source}",
            createdNote.Id, version.VersionNumber, request.Source);

        return Result<NoteOperationResult>.Success(new NoteOperationResult
        {
            Note = createdNote,
            VersionNumber = version.VersionNumber,
            Source = request.Source,
            Changes = new List<string> { "created" },
            ChangeSummary = "Initial version",
            IsNewNote = true
        });
    }

    public async Task<Result<NoteOperationResult>> UpdateAsync(
        UpdateNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Updating note {NoteId} from source {Source}",
            request.NoteId, request.Source);

        // 1. Fetch existing note
        var note = await _noteRepository.GetByIdAsync(request.NoteId);
        if (note == null)
            return Result<NoteOperationResult>.Failure(Error.NotFound("Note not found"));

        // 2. Verify ownership
        if (note.UserId != request.UserId)
            return Result<NoteOperationResult>.Failure(Error.Forbidden("Not authorized"));

        // 3. Track changes
        var changes = new List<string>();

        if (request.Title != null && request.Title != note.Title)
        {
            note.Title = request.Title;
            changes.Add("title");
        }

        if (request.Content != null && request.Content != note.Content)
        {
            note.Content = request.Content;
            changes.Add("content");
        }

        if (request.Tags != null && !request.Tags.SequenceEqual(note.Tags))
        {
            note.Tags = request.Tags;
            changes.Add("tags");
        }

        if (request.IsArchived.HasValue && request.IsArchived != note.IsArchived)
        {
            note.IsArchived = request.IsArchived.Value;
            changes.Add("archived");
        }

        if (request.UpdateFolder && request.Folder != note.Folder)
        {
            note.Folder = request.Folder;
            changes.Add("folder");
        }

        // 4. No changes? Return early
        if (changes.Count == 0)
        {
            return Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = note,
                VersionNumber = 0, // No new version
                Source = request.Source,
                Changes = changes,
                ChangeSummary = null,
                IsNewNote = false
            });
        }

        // 5. Update metadata
        note.Source = request.Source.ToDbValue();
        note.UpdatedAt = DateTime.UtcNow;

        // 6. Persist changes
        await _noteRepository.UpdateAsync(note.Id, note);

        // 7. Create version
        var changeSummary = BuildChangeSummary(changes, request.Source);
        var versionNumber = await _versionRepository.CreateVersionAsync(
            note,
            request.UserId,
            changeSummary,
            cancellationToken);

        // 8. Trigger re-indexing if content changed
        if (changes.Contains("content") || changes.Contains("title"))
        {
            _ = TriggerIndexingAsync(note.Id);
        }

        _logger.LogInformation(
            "Updated note {NoteId} version {Version}: {Changes}",
            note.Id, versionNumber, string.Join(", ", changes));

        return Result<NoteOperationResult>.Success(new NoteOperationResult
        {
            Note = note,
            VersionNumber = versionNumber,
            Source = request.Source,
            Changes = changes,
            ChangeSummary = changeSummary,
            IsNewNote = false
        });
    }

    // ... implement other methods similarly

    #region Private Helpers

    private string BuildChangeSummary(List<string> changes, NoteSource source)
    {
        var sourceLabel = source switch
        {
            NoteSource.Agent => " (by AI agent)",
            NoteSource.IosNotes => " (from iOS)",
            NoteSource.Import => " (from import)",
            _ => ""
        };

        return $"Updated: {string.Join(", ", changes)}{sourceLabel}";
    }

    private async Task ProcessImagesAsync(
        Note note,
        List<NoteImageDto> images,
        string userId,
        CancellationToken cancellationToken)
    {
        // Image processing logic...
    }

    private async Task TriggerIndexingAsync(string noteId)
    {
        // Fire-and-forget embedding generation...
    }

    #endregion
}
```

### Phase 4: Update Consumers

#### 4.1 Update CQRS Handlers (thin layer)

```csharp
// File: SecondBrain.Application/Commands/Notes/CreateNote/CreateNoteCommandHandler.cs

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteOperationService _noteOperationService;

    public CreateNoteCommandHandler(INoteOperationService noteOperationService)
    {
        _noteOperationService = noteOperationService;
    }

    public async Task<Result<NoteResponse>> Handle(
        CreateNoteCommand request,
        CancellationToken cancellationToken)
    {
        var operationRequest = new CreateNoteOperationRequest
        {
            UserId = request.UserId,
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            Folder = request.Folder,
            IsArchived = request.IsArchived,
            Images = request.Images,
            Source = NoteSource.Web  // Web API always uses Web source
        };

        var result = await _noteOperationService.CreateAsync(operationRequest, cancellationToken);

        return result.Match(
            onSuccess: op => Result<NoteResponse>.Success(op.Note.ToResponse()),
            onFailure: error => Result<NoteResponse>.Failure(error)
        );
    }
}
```

#### 4.2 Update Agent Plugins

```csharp
// File: SecondBrain.Application/Services/Agents/Plugins/NoteCrudPlugin.cs

public class NoteCrudPlugin : NotePluginBase
{
    private readonly INoteOperationService _noteOperationService;

    public NoteCrudPlugin(INoteOperationService noteOperationService, /* other deps */)
    {
        _noteOperationService = noteOperationService;
    }

    [KernelFunction("CreateNote")]
    public async Task<string> CreateNoteAsync(string title, string content, string? tags = null)
    {
        var request = new CreateNoteOperationRequest
        {
            UserId = CurrentUserId,
            Title = title.Trim(),
            Content = content.Trim(),
            Tags = ParseTags(tags),
            Source = NoteSource.Agent  // Agent operations always use Agent source
        };

        var result = await _noteOperationService.CreateAsync(request);

        return result.Match(
            onSuccess: op => $"Successfully created note \"{op.Note.Title}\" (ID: {op.Note.Id})",
            onFailure: error => $"Error: {error.Message}"
        );
    }

    [KernelFunction("UpdateNote")]
    public async Task<string> UpdateNoteAsync(string noteId, string? title, string? content, string? tags)
    {
        var request = new UpdateNoteOperationRequest
        {
            NoteId = noteId,
            UserId = CurrentUserId,
            Title = title,
            Content = content,
            Tags = tags != null ? ParseTags(tags) : null,
            Source = NoteSource.Agent
        };

        var result = await _noteOperationService.UpdateAsync(request);

        return result.Match(
            onSuccess: op => op.Changes.Count > 0
                ? $"Updated note: {string.Join(", ", op.Changes)}"
                : "No changes made",
            onFailure: error => $"Error: {error.Message}"
        );
    }
}
```

#### 4.3 Update Import Service

```csharp
// File: SecondBrain.Application/Services/NotesImportService.cs

public class NotesImportService : INotesImportService
{
    private readonly INoteOperationService _noteOperationService;

    public NotesImportService(INoteOperationService noteOperationService)
    {
        _noteOperationService = noteOperationService;
    }

    public async Task<ImportNotesResponse> ImportAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken)
    {
        // Delegate to the operation service's batch import
        var result = await _noteOperationService.ImportBatchAsync(
            userId, notes, cancellationToken);

        return result.Match(
            onSuccess: response => response,
            onFailure: error => new ImportNotesResponse { /* error handling */ }
        );
    }
}
```

### Phase 5: Database Schema

```sql
-- File: database/38_note_version_source.sql

-- Add source column with enum-like constraint
ALTER TABLE note_versions
ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'web'
CONSTRAINT chk_note_version_source CHECK (
    source IN ('web', 'agent', 'ios_notes', 'import', 'system', 'restored')
);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS ix_note_versions_source
ON note_versions(source);

-- Add composite index for filtering versions by note and source
CREATE INDEX IF NOT EXISTS ix_note_versions_note_source
ON note_versions(note_id, source);

-- Comment for documentation
COMMENT ON COLUMN note_versions.source IS
    'Origin of this version: web, agent, ios_notes, import, system, restored';
```

### Phase 6: Frontend Integration

#### 6.1 Update Types

```typescript
// File: frontend/src/types/notes.ts

export type NoteSource = 'web' | 'agent' | 'ios_notes' | 'import' | 'system' | 'restored';

export interface NoteVersion {
  // ... existing fields
  source: NoteSource;
}

// Helper for display
export const NOTE_SOURCE_DISPLAY: Record<NoteSource, { label: string; icon: string; color: string }> = {
  web: { label: 'Web UI', icon: 'globe', color: 'brand' },
  agent: { label: 'AI Agent', icon: 'cpu', color: 'purple' },
  ios_notes: { label: 'iOS Import', icon: 'smartphone', color: 'blue' },
  import: { label: 'Imported', icon: 'download', color: 'green' },
  system: { label: 'System', icon: 'settings', color: 'gray' },
  restored: { label: 'Restored', icon: 'history', color: 'orange' },
};
```

#### 6.2 Update Components

The timeline and diff viewer components use the `NOTE_SOURCE_DISPLAY` mapping for consistent styling.

---

## Migration Strategy

### Step 1: Create the Service (No breaking changes)

1. Create `NoteOperationService` with full implementation
2. Register in DI container
3. Add unit tests

### Step 2: Migrate Consumers Gradually

1. Update `CreateNoteCommandHandler` to use service
2. Update `UpdateNoteCommandHandler` to use service
3. Update `NoteCrudPlugin` to use service
4. Update `NotesImportService` to use service
5. Run integration tests after each migration

### Step 3: Database Migration

1. Create migration script `38_note_version_source.sql`
2. Apply to Docker database
3. Apply to Desktop (Tauri) database via EF migration

### Step 4: Frontend Updates

1. Update types
2. Update components
3. Test all flows

### Step 5: Cleanup

1. Remove direct repository usage from plugins
2. Remove version tracking from individual handlers
3. Update documentation

---

## Testing Strategy

### Unit Tests

```csharp
[Fact]
public async Task CreateAsync_WithAgentSource_CreatesVersionWithAgentSource()
{
    // Arrange
    var request = new CreateNoteOperationRequest
    {
        UserId = "user-1",
        Title = "Test Note",
        Content = "Content",
        Source = NoteSource.Agent
    };

    // Act
    var result = await _service.CreateAsync(request);

    // Assert
    result.IsSuccess.Should().BeTrue();
    result.Value.Source.Should().Be(NoteSource.Agent);

    _versionRepository.Verify(r => r.CreateInitialVersionAsync(
        It.Is<Note>(n => n.Source == "agent"),
        It.IsAny<string>(),
        It.IsAny<CancellationToken>()
    ), Times.Once);
}
```

### Integration Tests

```csharp
[Fact]
public async Task AgentCreatesNote_VersionShowsAgentSource()
{
    // 1. Create note via agent plugin
    var result = await _agentPlugin.CreateNoteAsync("Test", "Content");

    // 2. Fetch version history
    var history = await _versionService.GetVersionHistoryAsync(noteId);

    // 3. Verify source
    history.Versions.First().Source.Should().Be("agent");
}
```

---

## Summary

This architecture provides:

1. **Single Source of Truth**: All note operations go through `INoteOperationService`
2. **Explicit Source Tracking**: Source is a required parameter, not optional
3. **Consistent Versioning**: Every mutation creates a version, regardless of entry point
4. **Clean Separation**: CQRS handlers do request mapping, service does business logic
5. **Testability**: Mock one service instead of multiple components
6. **Extensibility**: Easy to add audit logging, events, notifications

The migration can be done gradually without breaking existing functionality.
