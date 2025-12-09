# iOS Notes Sync Guide

Sync notes between your iPhone/iPad and Second Brain using iOS Shortcuts. This guide walks you through setting up automatic or manual note syncing—both importing from Apple Notes to Second Brain and exporting from Second Brain to your iPhone.

> **Architecture Decision**: See [ADR 008](adr/008-ios-shortcuts-integration.md) for the rationale behind using iOS Shortcuts for mobile sync.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Generate Your API Key](#step-1-generate-your-api-key)
- [Importing Notes (iPhone → Second Brain)](#importing-notes-iphone--second-brain)
  - [Option A: Import a Single Note](#option-a-import-a-single-note)
  - [Option B: Import All Notes from a Folder](#option-b-import-all-notes-from-a-folder)
- [Exporting Notes (Second Brain → iPhone)](#exporting-notes-second-brain--iphone)
  - [Option A: Export All Notes](#option-a-export-all-notes)
  - [Option B: Export a Single Note by ID](#option-b-export-a-single-note-by-id)
  - [Option C: Browse and Select Notes](#option-c-browse-and-select-notes)
- [Using the Shortcuts](#using-the-shortcuts)
- [API Reference](#api-reference)
  - [Import Endpoint](#import-endpoint)
  - [Export Endpoints](#export-endpoints)
- [Troubleshooting](#troubleshooting)
- [Advanced: Automation](#advanced-automation)

---

## Overview

Second Brain provides API endpoints for both importing and exporting notes. The iOS Shortcuts app can interact with these endpoints to sync your notes seamlessly.

**Key Features:**

- Import single notes or batch import entire folders from Apple Notes
- Export all notes or specific notes from Second Brain to your iPhone
- Automatic duplicate detection using external IDs
- Preserves original creation and modification dates
- Automatic tag extraction from `#hashtags` in content
- Folder organization support

---

## Prerequisites

Before you begin, ensure you have:

- [ ] A Second Brain account (register at your instance URL)
- [ ] Access to your Second Brain web interface
- [ ] iOS 15+ on your iPhone or iPad
- [ ] The **Shortcuts** app installed (comes pre-installed on iOS)

---

## Step 1: Generate Your API Key

The API key allows the iOS Shortcut to authenticate with Second Brain without storing your password.

### Via Web Interface

1. **Log in** to Second Brain at `https://your-domain.com` or `http://localhost:3000`
2. Click your **profile picture** in the top-right corner
3. Select **"Generate API Key"** or navigate to Settings
4. Click **"Generate New API Key"**
5. **Copy and save** your API key securely

> **Security Note:** Your API key grants full access to your notes. Keep it private and never share it publicly.

### Via API (Alternative)

If you prefer using the API directly:

```bash
# First, get your JWT token by logging in
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Then generate an API key (use the token from the response above)
curl -X POST https://your-domain.com/api/auth/generate-api-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "apiKey": "abc123def456...",
  "generatedAt": "2025-01-15T10:30:00Z"
}
```

---

## Importing Notes (iPhone → Second Brain)

Use these shortcuts to import notes from Apple Notes into Second Brain.

### Option A: Import a Single Note

This shortcut imports the currently selected note to Second Brain.

#### Step-by-Step Instructions

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Tap **"Add Action"**

#### Build the Shortcut

Add these actions in order:

##### Action 1: Find Notes

- Search for `Find Notes` action
- Configure:
  - Filter: `None` (or filter by folder if desired)
  - Sort by: `Modification Date`
  - Limit: `1`
  - Check **"Choose from List"** (this lets you pick a note)

##### Action 2: Get Details of Notes

- Search for `Get Details of Notes`
- Get: `Name` of `Notes` (from previous action)
- Tap on it and add to a variable called `noteTitle`

##### Action 3: Get Details of Notes (again)

- Add another `Get Details of Notes`
- Get: `Body` of `Notes`
- Add to variable called `noteBody`

##### Action 4: Get Details of Notes (again)

- Get: `Folder` of `Notes`
- Add to variable called `noteFolder`

##### Action 5: Get Details of Notes (again)

- Get: `Creation Date` of `Notes`
- Format as **RFC 2822** (or leave as is)
- Add to variable called `noteCreated`

##### Action 6: Get Details of Notes (again)

- Get: `Modification Date` of `Notes`
- Add to variable called `noteModified`

##### Action 7: Text (JSON Body)

- Add a `Text` action
- Enter this JSON template:

```json
{
  "title": "{noteTitle}",
  "body": "{noteBody}",
  "folder": "{noteFolder}",
  "createdOn": "{noteCreated}",
  "modifiedOn": "{noteModified}",
  "source": "ios_notes"
}
```

Replace the `{variables}` with actual Shortcut variables by tapping and selecting them.

##### Action 8: Get Contents of URL

- Search for `Get Contents of URL`
- URL: `https://your-domain.com/api/import/notes`
- Method: `POST`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`
  - `Content-Type`: `application/json`
- Request Body: `File` → Select the `Text` from the previous action

##### Action 9: Show Notification (Optional)

- Add `Show Notification`
- Title: `Note Imported`
- Body: `{noteTitle} was imported successfully`

#### Save Your Shortcut

- Tap **"Done"**
- Name it: **"Import Note to Second Brain"**

---

### Option B: Import All Notes from a Folder

This shortcut imports all notes from a specific folder.

#### Build the Shortcut (Option B)

##### Action 1: Find Notes (Folder Import)

- Search for `Find Notes`
- Filter: `Folder` `is` `[Your Folder Name]`
- Sort by: `Modification Date`
- Limit: `Get All Notes`

##### Action 2: Repeat with Each

- Add `Repeat with Each`
- Repeat with each item in `Notes`

**Inside the Repeat Loop, add:**

##### Action 3-7: Get Note Details (Same as Option A)

- Get Name → `noteTitle`
- Get Body → `noteBody`
- Get Folder → `noteFolder`
- Get Identifier → `noteId` (for duplicate detection)
- Get Creation Date → `noteCreated`
- Get Modification Date → `noteModified`

##### Action 8: Text (JSON)

```json
{
  "title": "{noteTitle}",
  "body": "{noteBody}",
  "folder": "{noteFolder}",
  "id": "{noteId}",
  "createdOn": "{noteCreated}",
  "modifiedOn": "{noteModified}",
  "source": "ios_notes"
}
```

##### Action 9: Add to Variable

- Add the JSON text to a variable called `allNotes`

##### End Repeat

##### Action 10: Combine Text

- Combine `allNotes` with custom separator: `,`

##### Action 11: Text (Wrap in Array)

```json
{
  "notes": [{combinedNotes}]
}
```

##### Action 12: Get Contents of URL

- URL: `https://your-domain.com/api/import/notes`
- Method: `POST`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`
  - `Content-Type`: `application/json`
- Request Body: The wrapped JSON

##### Action 13: Show Result

- Show the API response to see import statistics

---

## Exporting Notes (Second Brain → iPhone)

Use these shortcuts to fetch notes from Second Brain and save them to your iPhone (Apple Notes, Files, or other apps).

### Option A: Export All Notes

This shortcut fetches all your notes from Second Brain and displays them in a list.

#### Build the Shortcut (Export All)

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Tap **"Add Action"**

Add these actions in order:

##### Action 1: Get Contents of URL

- Search for `Get Contents of URL`
- URL: `https://your-domain.com/api/notes/for-export`
- Method: `GET`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`

**Note:** This endpoint returns notes with full content. Use `/api/notes` if you only need summaries (for list views).

##### Action 2: Get Dictionary from Input

- Search for `Get Dictionary from Input`
- Input: `Contents of URL` (from previous action)

##### Action 3: Choose from List

- Search for `Choose from List`
- Input: `Dictionary` (the array of notes)
- Prompt: `Select a note`

##### Action 4: Get Dictionary Value

- Search for `Get Dictionary Value`
- Get: `Value` for `title` in `Chosen Item`
- Save to variable: `noteTitle`

##### Action 5: Get Dictionary Value (again)

- Get: `Value` for `content` in `Chosen Item`
- Save to variable: `noteContent`

##### Action 6: Get Dictionary Value (again)

- Get: `Value` for `folder` in `Chosen Item`
- Save to variable: `noteFolder`

##### Action 7: Get Dictionary Value (again)

- Get: `Value` for `tags` in `Chosen Item`
- Save to variable: `noteTags`

##### Action 8: Create Note (Apple Notes)

- Search for `Create Note`
- Body: `{noteContent}`
- Folder: `{noteFolder}` (or choose a specific folder)

##### Action 9: Show Notification

- Title: `Note Exported`
- Body: `{noteTitle} saved to Apple Notes`

#### Save Your Shortcut (Export)

- Tap **"Done"**
- Name it: **"Export Notes from Second Brain"**

---

### Option B: Export a Single Note by ID

If you know the specific note ID, you can fetch it directly.

#### Build the Shortcut (Export by ID)

##### Action 1: Ask for Input

- Search for `Ask for Input`
- Prompt: `Enter Note ID`
- Input Type: `Text`
- Save to variable: `noteId`

##### Action 2: Text

- Add a `Text` action
- Enter: `https://your-domain.com/api/notes/{noteId}`
- Replace `{noteId}` with the variable from Action 1

##### Action 3: Get Contents of URL

- URL: `Text` (from previous action)
- Method: `GET`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`

##### Action 4: Get Dictionary from Input

- Input: `Contents of URL`

##### Action 5: Get Dictionary Value

- Get: `Value` for `title` in `Dictionary`
- Save to variable: `noteTitle`

##### Action 6: Get Dictionary Value

- Get: `Value` for `content` in `Dictionary`
- Save to variable: `noteContent`

##### Action 7: Quick Look or Create Note

- Option A: Use `Quick Look` to preview the note
- Option B: Use `Create Note` to save to Apple Notes

---

### Option C: Browse and Select Notes

This shortcut displays a formatted list of notes with titles and folders for easy browsing.

#### Build the Shortcut (Browse and Select)

##### Action 1: Get Contents of URL (Browse)

- URL: `https://your-domain.com/api/notes`
- Method: `GET`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`

##### Action 2: Repeat with Each (Browse)

- Repeat with each item in `Contents of URL`

**Inside the Repeat Loop:**

##### Action 3: Get Dictionary Value (Title)

- Get: `Value` for `title` in `Repeat Item`
- Save to variable: `title`

##### Action 4: Get Dictionary Value (Folder)

- Get: `Value` for `folder` in `Repeat Item`
- Save to variable: `folder`

##### Action 5: Text (Format)

- Enter: `{title} ({folder})`

##### Action 6: Add to Variable (Browse)

- Add `Text` to variable: `noteList`

##### End Repeat (Browse)

##### Action 7: Choose from List

- Choose from: `noteList`
- Prompt: `Select a note to export`

##### Action 8: Get Item from List

- Get: `Item at Index` matching the chosen index from `Contents of URL`

##### Action 9: Get Dictionary Values and Create Note

- Extract `title`, `content`, `folder`, `tags` from the selected item
- Use `Create Note` to save to Apple Notes

---

### Alternative: Save to Files App

Instead of saving to Apple Notes, you can save notes as text or markdown files:

**Replace the "Create Note" action with:**

#### Action: Save File

- Search for `Save File`
- Input: `{noteContent}`
- Destination: `iCloud Drive` or `On My iPhone`
- Subpath: `Second Brain/{noteTitle}.md`
- Ask Where to Save: Enable for manual selection

---

## Using the Shortcuts

### Run Manually

1. Open the **Shortcuts** app
2. Find your import or export shortcut
3. Tap to run
4. For imports: Select the note(s) from Apple Notes
5. For exports: Browse and select notes from Second Brain
6. Wait for the success notification

### Add to Share Sheet (Import Only)

1. Open your import shortcut in edit mode
2. Tap the **info** button at the top
3. Enable **"Show in Share Sheet"**
4. Set input types to **"Notes"**

Now you can share a note directly from the Notes app to Second Brain!

### Add to Home Screen

1. Open your shortcut in edit mode
2. Tap the **info** button
3. Tap **"Add to Home Screen"**
4. Choose an icon and name
5. Tap **"Add"**

This works great for quick access to both import and export shortcuts!

---

## API Reference

### Authentication

All endpoints require authentication. Include one of these headers:

```text
Authorization: ApiKey YOUR_API_KEY
```

or

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### Import Endpoint

```text
POST /api/import/notes
```

#### Request Body

**Single Note:**

```json
{
  "title": "My Note Title",
  "body": "The content of my note with #tags inline",
  "folder": "Personal",
  "id": "unique-note-identifier",
  "createdOn": "Mon, 13 Jan 2025 18:28:35 -0600",
  "modifiedOn": "Tue, 14 Jan 2025 10:15:00 -0600",
  "source": "ios_notes",
  "tags": "tag1, tag2, tag3"
}
```

**Batch Import:**

```json
{
  "notes": [
    {
      "title": "Note 1",
      "body": "Content 1",
      "folder": "Work"
    },
    {
      "title": "Note 2",
      "body": "Content 2",
      "folder": "Personal"
    }
  ]
}
```

#### Import Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | Yes | string | Note title |
| `body` / `content` | No | string | Note content (supports both field names) |
| `folder` | No | string | Folder/category name |
| `id` / `external_id` | No | string/number | Unique identifier for duplicate detection |
| `createdOn` / `created_at` | No | string | Creation timestamp (defaults to now) |
| `modifiedOn` / `updated_at` | No | string | Modification timestamp (defaults to creation time) |
| `source` | No | string | Source identifier (defaults to "ios_notes") |
| `tags` | No | string/array | Comma-separated string or JSON array |

#### Supported Date Formats

- **RFC 2822:** `Mon, 13 Jan 2025 18:28:35 -0600`
- **ISO 8601:** `2025-01-13T18:28:35-06:00`
- **Standard:** `2025-01-13 18:28:35`

#### Import Response

```json
{
  "importedCount": 5,
  "updatedCount": 2,
  "skippedCount": 0,
  "notes": [
    {
      "id": "uuid-of-created-note",
      "title": "Note Title",
      "status": "created",
      "message": "Note successfully imported"
    },
    {
      "id": "uuid-of-updated-note",
      "title": "Existing Note",
      "status": "updated",
      "message": "Note successfully updated"
    }
  ]
}
```

#### Import Status Values

| Status | Description |
|--------|-------------|
| `created` | New note was created |
| `updated` | Existing note was updated (matched by `external_id`) |
| `skipped` | Import failed (see message for details) |

---

### Export Endpoints

#### Get All Notes (Lightweight - Summary Only)

```text
GET /api/notes
```

Returns all notes for the authenticated user with summaries (no full content) for better performance.

**Example Request (cURL):**

```bash
curl -X GET https://your-domain.com/api/notes \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My First Note",
    "summary": "AI-generated summary of the note...",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T14:45:00Z",
    "tags": ["tags", "example"],
    "isArchived": false,
    "source": "web",
    "folder": "Personal"
  }
]
```

**Note:** This endpoint does not include the `content` field. Use `/api/notes/for-export` if you need full content.

#### Get All Notes for Export (Full Content)

```text
GET /api/notes/for-export
```

Returns all notes for the authenticated user with **full content** included. Use this endpoint for iOS Shortcuts and other integrations that need complete note data.

**Example Request (cURL):**

```bash
curl -X GET https://your-domain.com/api/notes/for-export \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My First Note",
    "content": "This is the content of my note with #tags inline",
    "summary": "AI-generated summary of the note...",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T14:45:00Z",
    "tags": ["tags", "example"],
    "isArchived": false,
    "userId": "user-uuid",
    "source": "web",
    "externalId": null,
    "folder": "Personal"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Work Meeting Notes",
    "content": "Meeting agenda and action items...",
    "summary": "AI-generated summary...",
    "createdAt": "2025-01-14T09:00:00Z",
    "updatedAt": "2025-01-14T11:30:00Z",
    "tags": ["work", "meetings"],
    "isArchived": false,
    "userId": "user-uuid",
    "source": "ios_notes",
    "externalId": "ios-note-12345",
    "folder": "Work"
  }
]
```

#### Get Single Note by ID

```text
GET /api/notes/{id}
```

Returns a specific note by its ID.

**Example Request (cURL):**

```bash
curl -X GET https://your-domain.com/api/notes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My First Note",
  "content": "This is the content of my note with #tags inline",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T14:45:00Z",
  "tags": ["tags", "example"],
  "isArchived": false,
  "userId": "user-uuid",
  "source": "web",
  "externalId": null,
  "folder": "Personal"
}
```

#### Export Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique note identifier (UUID) |
| `title` | string | Note title |
| `content` | string | Note content/body |
| `createdAt` | string | ISO 8601 creation timestamp |
| `updatedAt` | string | ISO 8601 last modification timestamp |
| `tags` | array | Array of tag strings |
| `isArchived` | boolean | Whether the note is archived |
| `userId` | string | Owner's user ID |
| `source` | string | Origin of the note ("web", "ios_notes", etc.) |
| `externalId` | string/null | External identifier for synced notes |
| `folder` | string/null | Folder/category name |

---

## Troubleshooting

### Common Issues

#### "Not authenticated" Error

**Cause:** Invalid or missing API key

**Solution:**

1. Verify your API key is correct
2. Check the Authorization header format: `ApiKey YOUR_KEY` (note the space)
3. Generate a new API key if needed

#### "No notes provided" Error (Import)

**Cause:** Empty request body or invalid JSON

**Solution:**

1. Ensure the JSON is properly formatted
2. Verify the `title` field is included (it's required)
3. Check that variables are properly inserted in the JSON template

#### Notes Not Appearing After Import

**Cause:** Import succeeded but notes aren't visible

**Solution:**

1. Check the API response for the actual status
2. Refresh the notes page in Second Brain
3. Check if notes were imported to a specific folder

#### Duplicate Notes Being Created

**Cause:** Missing `id` field for duplicate detection

**Solution:**

1. Include the note's unique identifier in the `id` field
2. Use `Get Details of Notes` → `Identifier` in your shortcut

#### Date/Time Issues

**Cause:** Unsupported date format

**Solution:**

1. Use RFC 2822 format: `Mon, 13 Jan 2025 18:28:35 -0600`
2. Or ISO 8601: `2025-01-13T18:28:35-06:00`
3. Format dates using Shortcuts' date formatting options

#### Empty Response from Export (No Notes)

**Cause:** No notes exist or API key belongs to different user

**Solution:**

1. Verify you have notes in your Second Brain account
2. Check that you're using the correct API key
3. Try logging into the web interface to confirm notes exist

#### "Choose from List" Shows Raw JSON

**Cause:** Missing "Get Dictionary from Input" action

**Solution:**

1. Add `Get Dictionary from Input` after `Get Contents of URL`
2. This converts the JSON response into a list Shortcuts can display

#### Can't Access Note Fields in Export

**Cause:** Incorrect dictionary key names

**Solution:**

1. Use exact field names: `title`, `content`, `folder`, `tags`, `id`
2. Note: The export uses `content`, not `body`
3. Tags are returned as an array, not a comma-separated string

### Debug Tips

1. **Show API Response:** Add a `Show Result` action after the URL request to see the full response
2. **Quick Look Variables:** Use `Quick Look` actions to inspect variable values
3. **Test Import with cURL:**

```bash
curl -X POST https://your-domain.com/api/import/notes \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Note", "body": "This is a test"}'
```

1. **Test Export with cURL:**

```bash
# Get all notes
curl -X GET https://your-domain.com/api/notes \
  -H "Authorization: ApiKey YOUR_API_KEY"

# Get a specific note by ID
curl -X GET https://your-domain.com/api/notes/YOUR_NOTE_ID \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

---

## Advanced: Automation

### Automatic Sync with Automations

You can set up automatic syncing using iOS Automations:

1. Open **Shortcuts** app
2. Go to **Automation** tab
3. Tap **+** → **Create Personal Automation**
4. Choose a trigger:
   - **Time of Day** - Sync notes every morning
   - **When I leave/arrive** - Sync when leaving work
   - **When App is Closed** - Sync after closing Notes app

5. Add action: **Run Shortcut** → Select your import or export shortcut
6. Turn off **"Ask Before Running"** for true automation

### Example: Daily Import Sync

Create an automation that:

- Triggers at 8:00 PM daily
- Runs your "Import All Notes" shortcut
- Sends a notification with results

### Example: Daily Export Backup

Create an automation that:

- Triggers at 9:00 PM daily
- Runs a modified export shortcut that saves all notes to Files app
- Creates a backup of your Second Brain notes on your device

### Sync Specific Folders Only (Import)

Modify your import shortcut to sync only certain folders:

1. In `Find Notes`, set Filter: `Folder` `is` `Work Notes`
2. Create separate shortcuts for different folders
3. Run them all from a master shortcut using `Run Shortcut` actions

### Filter Notes by Folder (Export)

You can filter exported notes in your shortcut:

1. After `Get Contents of URL`, add `Repeat with Each`
2. Inside the loop, use `If` to check if `folder` equals your desired folder
3. Only process notes that match your criteria

---

## Security Best Practices

1. **Never share your API key** - Treat it like a password
2. **Regenerate periodically** - Generate a new key every few months
3. **Use HTTPS** - Always use `https://` for your Second Brain URL
4. **Limit folder access** - Only sync folders you need
5. **Review automations** - Periodically check your automated shortcuts

---

## Need Help?

If you encounter issues not covered here:

1. Check the [main README](../README.md) for general setup
2. Review the API logs for detailed error messages
3. Open an issue on GitHub with:
   - Your shortcut configuration (screenshot)
   - The API response you're receiving
   - iOS version and device
