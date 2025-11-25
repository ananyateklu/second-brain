namespace SecondBrain.Application.Utilities;

/// <summary>
/// Utility class for parsing enriched note content from vector store embeddings.
/// The enriched content format includes metadata like title, tags, and dates
/// along with the actual content.
/// </summary>
public static class NoteContentParser
{
    /// <summary>
    /// Parses enriched content string to extract structured note information.
    /// </summary>
    /// <param name="enrichedContent">The enriched content string from vector store</param>
    /// <returns>Parsed note content with extracted metadata</returns>
    public static ParsedNoteContent Parse(string? enrichedContent)
    {
        var parsed = new ParsedNoteContent();

        if (string.IsNullOrWhiteSpace(enrichedContent))
            return parsed;

        var lines = enrichedContent.Split('\n');
        var contentBuilder = new List<string>();
        var inContentSection = false;

        foreach (var line in lines)
        {
            if (line.StartsWith("Title: "))
            {
                parsed.Title = line.Substring("Title: ".Length).Trim();
            }
            else if (line.StartsWith("Tags: "))
            {
                var tagsString = line.Substring("Tags: ".Length).Trim();
                parsed.Tags = tagsString.Split(new[] { ", ", "," }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .ToList();
            }
            else if (line.StartsWith("Created: "))
            {
                var dateString = line.Substring("Created: ".Length).Trim();
                if (DateTime.TryParse(dateString, out var createdDate))
                {
                    parsed.CreatedDate = createdDate;
                }
            }
            else if (line.StartsWith("Last Updated: "))
            {
                var dateString = line.Substring("Last Updated: ".Length).Trim();
                if (DateTime.TryParse(dateString, out var updatedDate))
                {
                    parsed.UpdatedDate = updatedDate;
                }
            }
            else if (line.Trim() == "Content:")
            {
                inContentSection = true;
                continue;
            }
            else if (inContentSection && !string.IsNullOrWhiteSpace(line))
            {
                contentBuilder.Add(line);
            }
        }

        parsed.Content = string.Join("\n", contentBuilder).Trim();
        return parsed;
    }
}

/// <summary>
/// Represents parsed note content with extracted metadata.
/// </summary>
public class ParsedNoteContent
{
    public string? Title { get; set; }
    public List<string>? Tags { get; set; }
    public DateTime? CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string Content { get; set; } = string.Empty;
}

