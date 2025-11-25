# iOS Notes Import Guide

Import your iPhone or iPad notes directly into Second Brain using iOS Shortcuts. This guide walks you through setting up automatic or manual note syncing from the native Apple Notes app.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Generate Your API Key](#step-1-generate-your-api-key)
- [Step 2: Create the iOS Shortcut](#step-2-create-the-ios-shortcut)
  - [Option A: Import a Single Note](#option-a-import-a-single-note)
  - [Option B: Import All Notes from a Folder](#option-b-import-all-notes-from-a-folder)
- [Step 3: Using the Shortcut](#step-3-using-the-shortcut)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Advanced: Automation](#advanced-automation)

---

## Overview

Second Brain provides a dedicated import endpoint that accepts notes from external sources. The iOS Shortcuts app can interact with this endpoint to sync your Apple Notes seamlessly.

**Key Features:**
- Import single notes or batch import entire folders
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

> ⚠️ **Security Note:** Your API key grants full access to your notes. Keep it private and never share it publicly.

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

## Step 2: Create the iOS Shortcut

### Option A: Import a Single Note

This shortcut imports the currently selected note to Second Brain.

#### Step-by-Step Instructions

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Tap **"Add Action"**

#### Build the Shortcut

Add these actions in order:

**Action 1: Find Notes**
- Search for `Find Notes` action
- Configure:
  - Filter: `None` (or filter by folder if desired)
  - Sort by: `Modification Date`
  - Limit: `1`
  - ☑️ Check **"Choose from List"** (this lets you pick a note)

**Action 2: Get Details of Notes**
- Search for `Get Details of Notes`
- Get: `Name` of `Notes` (from previous action)
- Tap on it and add to a variable called `noteTitle`

**Action 3: Get Details of Notes (again)**
- Add another `Get Details of Notes`
- Get: `Body` of `Notes`
- Add to variable called `noteBody`

**Action 4: Get Details of Notes (again)**
- Get: `Folder` of `Notes`
- Add to variable called `noteFolder`

**Action 5: Get Details of Notes (again)**
- Get: `Creation Date` of `Notes`
- Format as **RFC 2822** (or leave as is)
- Add to variable called `noteCreated`

**Action 6: Get Details of Notes (again)**
- Get: `Modification Date` of `Notes`
- Add to variable called `noteModified`

**Action 7: Text (JSON Body)**
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

**Action 8: Get Contents of URL**
- Search for `Get Contents of URL`
- URL: `https://your-domain.com/api/import/notes`
- Method: `POST`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`
  - `Content-Type`: `application/json`
- Request Body: `File` → Select the `Text` from the previous action

**Action 9: Show Notification (Optional)**
- Add `Show Notification`
- Title: `Note Imported`
- Body: `{noteTitle} was imported successfully`

#### Save Your Shortcut
- Tap **"Done"**
- Name it: **"Import Note to Second Brain"**

---

### Option B: Import All Notes from a Folder

This shortcut imports all notes from a specific folder.

#### Build the Shortcut

**Action 1: Find Notes**
- Search for `Find Notes`
- Filter: `Folder` `is` `[Your Folder Name]`
- Sort by: `Modification Date`
- Limit: `Get All Notes`

**Action 2: Repeat with Each**
- Add `Repeat with Each`
- Repeat with each item in `Notes`

**Inside the Repeat Loop, add:**

**Action 3-7: Get Note Details** (Same as Option A)
- Get Name → `noteTitle`
- Get Body → `noteBody`
- Get Folder → `noteFolder`
- Get Identifier → `noteId` (for duplicate detection)
- Get Creation Date → `noteCreated`
- Get Modification Date → `noteModified`

**Action 8: Text (JSON)**
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

**Action 9: Add to Variable**
- Add the JSON text to a variable called `allNotes`

**End Repeat**

**Action 10: Combine Text**
- Combine `allNotes` with custom separator: `,`

**Action 11: Text (Wrap in Array)**
```json
{
  "notes": [{combinedNotes}]
}
```

**Action 12: Get Contents of URL**
- URL: `https://your-domain.com/api/import/notes`
- Method: `POST`
- Headers:
  - `Authorization`: `ApiKey YOUR_API_KEY_HERE`
  - `Content-Type`: `application/json`
- Request Body: The wrapped JSON

**Action 13: Show Result**
- Show the API response to see import statistics

---

## Step 3: Using the Shortcut

### Run Manually

1. Open the **Shortcuts** app
2. Find your import shortcut
3. Tap to run
4. Select the note(s) you want to import
5. Wait for the success notification

### Add to Share Sheet

1. Open your shortcut in edit mode
2. Tap the **ⓘ** info button at the top
3. Enable **"Show in Share Sheet"**
4. Set input types to **"Notes"**

Now you can share a note directly from the Notes app to Second Brain!

### Add to Home Screen

1. Open your shortcut in edit mode
2. Tap the **ⓘ** info button
3. Tap **"Add to Home Screen"**
4. Choose an icon and name
5. Tap **"Add"**

---

## API Reference

### Endpoint

```
POST /api/import/notes
```

### Authentication

Include one of these headers:

```
Authorization: ApiKey YOUR_API_KEY
```

or

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Request Body

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

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | ✅ Yes | string | Note title |
| `body` / `content` | No | string | Note content (supports both field names) |
| `folder` | No | string | Folder/category name |
| `id` / `external_id` | No | string/number | Unique identifier for duplicate detection |
| `createdOn` / `created_at` | No | string | Creation timestamp (defaults to now) |
| `modifiedOn` / `updated_at` | No | string | Modification timestamp (defaults to creation time) |
| `source` | No | string | Source identifier (defaults to "ios_notes") |
| `tags` | No | string/array | Comma-separated string or JSON array |

### Supported Date Formats

- **RFC 2822:** `Mon, 13 Jan 2025 18:28:35 -0600`
- **ISO 8601:** `2025-01-13T18:28:35-06:00`
- **Standard:** `2025-01-13 18:28:35`

### Response

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

### Status Values

| Status | Description |
|--------|-------------|
| `created` | New note was created |
| `updated` | Existing note was updated (matched by `external_id`) |
| `skipped` | Import failed (see message for details) |

---

## Troubleshooting

### Common Issues

#### "Not authenticated" Error

**Cause:** Invalid or missing API key

**Solution:**
1. Verify your API key is correct
2. Check the Authorization header format: `ApiKey YOUR_KEY` (note the space)
3. Generate a new API key if needed

#### "No notes provided" Error

**Cause:** Empty request body or invalid JSON

**Solution:**
1. Ensure the JSON is properly formatted
2. Verify the `title` field is included (it's required)
3. Check that variables are properly inserted in the JSON template

#### Notes Not Appearing

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

### Debug Tips

1. **Show API Response:** Add a `Show Result` action after the URL request to see the full response
2. **Quick Look Variables:** Use `Quick Look` actions to inspect variable values
3. **Test with cURL:** Test your API key and endpoint with cURL first:

```bash
curl -X POST https://your-domain.com/api/import/notes \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Note", "body": "This is a test"}'
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

5. Add action: **Run Shortcut** → Select your import shortcut
6. Turn off **"Ask Before Running"** for true automation

### Example: Daily Sync

Create an automation that:
- Triggers at 8:00 PM daily
- Runs your "Import All Notes" shortcut
- Sends a notification with results

### Sync Specific Folders Only

Modify your shortcut to sync only certain folders:

1. In `Find Notes`, set Filter: `Folder` `is` `Work Notes`
2. Create separate shortcuts for different folders
3. Run them all from a master shortcut using `Run Shortcut` actions

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

1. Check the [main README](./README.md) for general setup
2. Review the API logs for detailed error messages
3. Open an issue on GitHub with:
   - Your shortcut configuration (screenshot)
   - The API response you're receiving
   - iOS version and device

---
