# ADR 008: iOS Shortcuts Integration

## Status

Accepted

## Context

Second Brain needed a way for users to sync notes between their iPhone/iPad and the application. The requirements were:

1. **Bidirectional Sync**: Import notes from Apple Notes to Second Brain and export notes back to iOS
2. **No App Store Dependency**: Avoid the complexity and cost of maintaining a native iOS app
3. **User Control**: Allow users to decide when and what to sync
4. **Automation Support**: Enable scheduled or triggered sync operations
5. **Preserve Metadata**: Maintain creation dates, modification dates, folders, and tags

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Native iOS App** | Best UX, offline support, push notifications | App Store review process, ongoing maintenance, development cost |
| **Third-Party Sync (Zapier/IFTTT)** | No development needed | Requires paid subscription, limited customization, privacy concerns |
| **Direct API Calls (cURL)** | Simple implementation | Poor UX on mobile, no automation |
| **iOS Shortcuts + REST API** | Free, user-controlled, automatable, no app store | Initial setup complexity, requires user education |

## Decision

We will use **iOS Shortcuts** combined with dedicated REST API endpoints for note synchronization.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Device                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Shortcuts App                          │   │
│  │  - Import Single Note shortcut                           │   │
│  │  - Import Folder shortcut                                │   │
│  │  - Export Notes shortcut                                 │   │
│  │  - Browse & Select shortcut                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            │ HTTPS                               │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Second Brain API                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ImportController                            │   │
│  │  POST /api/import/notes                                  │   │
│  │  - Single note import                                    │   │
│  │  - Batch import                                          │   │
│  │  - Duplicate detection via external_id                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              NotesController                             │   │
│  │  GET /api/notes                                          │   │
│  │  GET /api/notes/{id}                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### API Design

**Import Endpoint** (`POST /api/import/notes`):

- Accepts flexible JSON schema (supports both `body`/`content`, `id`/`external_id` field names)
- Handles single notes or batch arrays
- Automatic duplicate detection using `external_id`
- Extracts hashtags from content as tags
- Preserves original timestamps

**Export Endpoints** (`GET /api/notes`, `GET /api/notes/{id}`):

- Standard REST endpoints with API key authentication
- Returns full note metadata for iOS Shortcuts to process

### Authentication

API key authentication via header:

```text
Authorization: ApiKey YOUR_API_KEY
```

This avoids storing user credentials in Shortcuts while providing secure, revocable access.

### Key Implementation Details

| Component | Location | Purpose |
|-----------|----------|---------|
| ImportController | `backend/src/SecondBrain.API/Controllers/ImportController.cs` | Handles import requests |
| IosNotesImportHelper | `backend/src/SecondBrain.API/Utilities/IosNotesImportHelper.cs` | Normalizes iOS Shortcuts JSON |
| NotesImportService | `backend/src/SecondBrain.Application/Services/NotesImportService.cs` | Business logic for imports |
| User Guide | `docs/ios-notes-sync-guide.md` | Step-by-step setup instructions |

## Consequences

### Positive

- **No App Store**: Avoids Apple's review process, fees, and ongoing compliance requirements
- **Zero Cost**: iOS Shortcuts is free and built into iOS
- **User Control**: Users decide exactly when sync happens and what gets synced
- **Automation**: Supports iOS Automations for scheduled or triggered sync
- **Privacy**: No third-party services involved; direct device-to-server communication
- **Flexibility**: Users can customize shortcuts for their specific workflows
- **Share Sheet Integration**: Import shortcuts can be triggered from the Notes app share menu

### Negative

- **Setup Complexity**: Users must manually create shortcuts (mitigated by detailed guide)
- **No Push Sync**: Changes don't automatically sync; user must trigger
- **iOS Only**: Doesn't help Android users (separate solution needed)
- **Shortcut Limitations**: iOS Shortcuts has constraints on complex logic and error handling
- **Maintenance**: Users must update shortcuts if API changes

### Neutral

- Requires users to generate and manage API keys
- Works best with notes in specific Apple Notes folders
- Date handling depends on iOS locale settings

## References

- [iOS Shortcuts User Guide](https://support.apple.com/guide/shortcuts/welcome/ios)
- [User Setup Guide](../ios-notes-sync-guide.md)
- [Apple Notes Shortcut Actions](https://support.apple.com/guide/shortcuts/notes-actions-apd43205c81d/ios)
