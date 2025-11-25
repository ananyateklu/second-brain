using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using SecondBrain.Application.DTOs.Requests;

namespace SecondBrain.API.Utilities;

public static class IosNotesImportHelper
{
    public static string? ExtractApiKeyFromHeader(HttpRequest request)
    {
        if (!request.Headers.TryGetValue("Authorization", out var values))
            return null;

        var header = values.ToString();
        const string prefix = "Bearer ";

        if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return null;

        return header.Substring(prefix.Length).Trim();
    }

    public static List<ImportNoteRequest> NormalizeRequestToNoteList(JsonElement root)
    {
        var result = new List<ImportNoteRequest>();

        // Case 1: Batch format: { "notes": [ ... ] }
        if (root.TryGetProperty("notes", out var notesElement) &&
            notesElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in notesElement.EnumerateArray())
            {
                if (TryParseNote(item, out var note))
                {
                    result.Add(note);
                }
            }
            return result;
        }

        // Case 2: Single-note format: body is a note object
        if (TryParseNote(root, out var singleNote))
        {
            result.Add(singleNote);
        }

        return result;
    }

    private static bool TryParseNote(JsonElement element, out ImportNoteRequest note)
    {
        note = new ImportNoteRequest();

        // Title is required
        if (!element.TryGetProperty("title", out var titleProp) ||
            titleProp.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        note.Title = titleProp.GetString() ?? string.Empty;

        // Content - support both "body" (new format) and "content" (old format)
        if (element.TryGetProperty("body", out var bodyProp) &&
            bodyProp.ValueKind == JsonValueKind.String)
        {
            note.Content = bodyProp.GetString() ?? string.Empty;
        }
        else if (element.TryGetProperty("content", out var contentProp) &&
                 contentProp.ValueKind == JsonValueKind.String)
        {
            note.Content = contentProp.GetString() ?? string.Empty;
        }

        // Folder
        if (element.TryGetProperty("folder", out var folderProp) &&
            folderProp.ValueKind == JsonValueKind.String)
        {
            note.Folder = folderProp.GetString();
        }

        // Source
        if (element.TryGetProperty("source", out var sourceProp) &&
            sourceProp.ValueKind == JsonValueKind.String)
        {
            note.Source = sourceProp.GetString() ?? "ios_notes";
        }
        else
        {
            note.Source = "ios_notes";
        }

        // External ID - support both "id" (new format) and "external_id" (old format)
        if (element.TryGetProperty("id", out var idProp))
        {
            // Handle both string and number IDs
            if (idProp.ValueKind == JsonValueKind.String)
            {
                note.ExternalId = idProp.GetString();
            }
            else if (idProp.ValueKind == JsonValueKind.Number)
            {
                note.ExternalId = idProp.GetInt32().ToString();
            }
        }
        else if (element.TryGetProperty("external_id", out var externalIdProp) &&
                 externalIdProp.ValueKind == JsonValueKind.String)
        {
            note.ExternalId = externalIdProp.GetString();
        }

        // Parse CreatedAt - support both "createdOn" (new format) and "created_at" (old format)
        DateTimeOffset createdAt = DateTimeOffset.UtcNow;
        bool hasCreatedAt = false;

        if (element.TryGetProperty("createdOn", out var createdOnProp) &&
            createdOnProp.ValueKind == JsonValueKind.String)
        {
            var dateString = createdOnProp.GetString();
            if (TryParseDate(dateString, out var createdOn))
            {
                createdAt = createdOn;
                hasCreatedAt = true;
            }
        }
        else if (element.TryGetProperty("created_at", out var createdProp) &&
                 createdProp.ValueKind == JsonValueKind.String)
        {
            var dateString = createdProp.GetString();
            if (TryParseDate(dateString, out var created))
            {
                createdAt = created;
                hasCreatedAt = true;
            }
        }

        note.CreatedAt = hasCreatedAt ? createdAt : DateTimeOffset.UtcNow;

        // Parse UpdatedAt - support both "modifiedOn" (new format) and "updated_at" (old format)
        DateTimeOffset updatedAt = note.CreatedAt;
        bool hasUpdatedAt = false;

        if (element.TryGetProperty("modifiedOn", out var modifiedOnProp) &&
            modifiedOnProp.ValueKind == JsonValueKind.String)
        {
            var dateString = modifiedOnProp.GetString();
            if (TryParseDate(dateString, out var modifiedOn))
            {
                updatedAt = modifiedOn;
                hasUpdatedAt = true;
            }
        }
        else if (element.TryGetProperty("updated_at", out var updatedProp) &&
                 updatedProp.ValueKind == JsonValueKind.String)
        {
            var dateString = updatedProp.GetString();
            if (TryParseDate(dateString, out var updated))
            {
                updatedAt = updated;
                hasUpdatedAt = true;
            }
        }

        note.UpdatedAt = hasUpdatedAt ? updatedAt : note.CreatedAt;

        // Parse Tags - support comma-separated string or array
        var tagsFromJson = new List<string>();
        if (element.TryGetProperty("tags", out var tagsProp))
        {
            if (tagsProp.ValueKind == JsonValueKind.String)
            {
                var tagsString = tagsProp.GetString() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(tagsString))
                {
                    tagsFromJson = tagsString.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(t => t.Trim())
                        .Where(t => !string.IsNullOrWhiteSpace(t))
                        .ToList();
                }
            }
            else if (tagsProp.ValueKind == JsonValueKind.Array)
            {
                tagsFromJson = tagsProp.EnumerateArray()
                    .Where(t => t.ValueKind == JsonValueKind.String)
                    .Select(t => t.GetString() ?? string.Empty)
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToList();
            }
        }

        // Extract tags from content (words starting with #)
        var tagsFromContent = ExtractTagsFromContent(note.Content);

        // Merge tags from JSON and content, normalize (remove # prefix), and deduplicate
        var allTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add tags from JSON (normalize by removing # prefix if present)
        foreach (var tag in tagsFromJson)
        {
            var normalizedTag = NormalizeTag(tag);
            if (!string.IsNullOrWhiteSpace(normalizedTag))
            {
                allTags.Add(normalizedTag);
            }
        }

        // Add tags extracted from content
        foreach (var tag in tagsFromContent)
        {
            var normalizedTag = NormalizeTag(tag);
            if (!string.IsNullOrWhiteSpace(normalizedTag))
            {
                allTags.Add(normalizedTag);
            }
        }

        note.Tags = allTags.ToList();

        return true;
    }

    /// <summary>
    /// Extracts tags from content by finding words that start with #
    /// Tags are identified as # followed by alphanumeric characters, hyphens, or underscores
    /// </summary>
    private static List<string> ExtractTagsFromContent(string? content)
    {
        var tags = new List<string>();

        if (string.IsNullOrWhiteSpace(content))
        {
            return tags;
        }

        // Regex pattern to match #tag format
        // Matches # followed by word characters (letters, digits, underscore) or hyphens
        // Excludes # at the end of line or followed by whitespace only
        var pattern = @"#([a-zA-Z0-9_-]+)";
        var matches = Regex.Matches(content, pattern);

        foreach (Match match in matches)
        {
            if (match.Success && match.Groups.Count > 1)
            {
                var tag = match.Groups[1].Value;
                if (!string.IsNullOrWhiteSpace(tag))
                {
                    tags.Add(tag);
                }
            }
        }

        return tags;
    }

    /// <summary>
    /// Normalizes a tag by removing # prefix if present and trimming whitespace
    /// </summary>
    private static string NormalizeTag(string tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
        {
            return string.Empty;
        }

        var normalized = tag.Trim();

        // Remove # prefix if present
        if (normalized.StartsWith("#", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1).Trim();
        }

        return normalized;
    }

    /// <summary>
    /// Tries to parse a date string in various formats including RFC 2822
    /// </summary>
    private static bool TryParseDate(string? dateString, out DateTimeOffset result)
    {
        result = DateTimeOffset.UtcNow;

        if (string.IsNullOrWhiteSpace(dateString))
            return false;

        // Try RFC 2822 format first (e.g., "Mon, 13 Jan 2025 18:28:35 -0600")
        // This format is commonly used by iOS Notes and email systems
        if (DateTimeOffset.TryParseExact(
            dateString,
            "ddd, dd MMM yyyy HH:mm:ss zzz",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out result))
        {
            return true;
        }

        // Try standard ISO 8601 format (e.g., "2025-01-13T18:28:35-06:00")
        if (DateTimeOffset.TryParse(dateString, CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
        {
            return true;
        }

        // Last resort: try with any culture
        if (DateTimeOffset.TryParse(dateString, out result))
        {
            return true;
        }

        return false;
    }
}
