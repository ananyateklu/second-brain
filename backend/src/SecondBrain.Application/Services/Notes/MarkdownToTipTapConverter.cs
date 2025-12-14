using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Converts markdown content to TipTap/ProseMirror JSON format.
/// This is a deterministic conversion - no AI required.
/// </summary>
public static partial class MarkdownToTipTapConverter
{
    /// <summary>
    /// Converts markdown text to TipTap JSON format.
    /// </summary>
    /// <param name="markdown">The markdown content to convert.</param>
    /// <returns>JSON string in TipTap/ProseMirror format.</returns>
    public static string Convert(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return CreateEmptyDoc();
        }

        var doc = new JsonObject
        {
            ["type"] = "doc",
            ["content"] = new JsonArray()
        };

        var content = (JsonArray)doc["content"]!;
        var lines = markdown.Split('\n');
        var i = 0;

        while (i < lines.Length)
        {
            var line = lines[i];

            // Skip empty lines (they create paragraph breaks naturally)
            if (string.IsNullOrWhiteSpace(line))
            {
                i++;
                continue;
            }

            // Check for code blocks first (```)
            if (line.TrimStart().StartsWith("```"))
            {
                var (codeBlock, newIndex) = ParseCodeBlock(lines, i);
                if (codeBlock != null)
                {
                    content.Add(codeBlock);
                    i = newIndex;
                    continue;
                }
            }

            // Check for headings (# ## ### etc)
            var headingMatch = HeadingRegex().Match(line);
            if (headingMatch.Success)
            {
                var level = headingMatch.Groups[1].Value.Length;
                var text = headingMatch.Groups[2].Value.Trim();
                content.Add(CreateHeading(level, text));
                i++;
                continue;
            }

            // Check for horizontal rule (--- or ***)
            if (HorizontalRuleRegex().IsMatch(line.Trim()))
            {
                content.Add(new JsonObject { ["type"] = "horizontalRule" });
                i++;
                continue;
            }

            // Check for task list items (- [ ] or - [x])
            var taskMatch = TaskListRegex().Match(line);
            if (taskMatch.Success)
            {
                var (taskList, newIndex) = ParseTaskList(lines, i);
                content.Add(taskList);
                i = newIndex;
                continue;
            }

            // Check for unordered list items (- or *)
            var bulletMatch = BulletListRegex().Match(line);
            if (bulletMatch.Success)
            {
                var (bulletList, newIndex) = ParseBulletList(lines, i);
                content.Add(bulletList);
                i = newIndex;
                continue;
            }

            // Check for ordered list items (1. 2. etc)
            var orderedMatch = OrderedListRegex().Match(line);
            if (orderedMatch.Success)
            {
                var (orderedList, newIndex) = ParseOrderedList(lines, i);
                content.Add(orderedList);
                i = newIndex;
                continue;
            }

            // Check for blockquote (>)
            if (line.TrimStart().StartsWith('>'))
            {
                var (blockquote, newIndex) = ParseBlockquote(lines, i);
                content.Add(blockquote);
                i = newIndex;
                continue;
            }

            // Default: treat as paragraph
            content.Add(CreateParagraph(line));
            i++;
        }

        // If no content was added, add an empty paragraph
        if (content.Count == 0)
        {
            content.Add(CreateParagraph(""));
        }

        return doc.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
    }

    private static string CreateEmptyDoc()
    {
        var doc = new JsonObject
        {
            ["type"] = "doc",
            ["content"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "paragraph"
                }
            }
        };
        return doc.ToJsonString();
    }

    private static JsonObject CreateHeading(int level, string text)
    {
        var heading = new JsonObject
        {
            ["type"] = "heading",
            ["attrs"] = new JsonObject { ["level"] = Math.Min(level, 6) }
        };

        var inlineContent = ParseInlineContent(text);
        if (inlineContent.Count > 0)
        {
            heading["content"] = inlineContent;
        }

        return heading;
    }

    private static JsonObject CreateParagraph(string text)
    {
        var paragraph = new JsonObject
        {
            ["type"] = "paragraph"
        };

        if (!string.IsNullOrEmpty(text))
        {
            var inlineContent = ParseInlineContent(text);
            if (inlineContent.Count > 0)
            {
                paragraph["content"] = inlineContent;
            }
        }

        return paragraph;
    }

    private static JsonArray ParseInlineContent(string text)
    {
        var content = new JsonArray();
        if (string.IsNullOrEmpty(text))
        {
            return content;
        }

        var remaining = text;
        while (remaining.Length > 0)
        {
            // Check for bold (**text** or __text__)
            var boldMatch = BoldRegex().Match(remaining);
            if (boldMatch.Success && boldMatch.Index == 0)
            {
                var boldText = boldMatch.Groups[1].Value;
                content.Add(CreateTextNode(boldText, new[] { "bold" }));
                remaining = remaining[boldMatch.Length..];
                continue;
            }

            // Check for italic (*text* or _text_) - but not ** or __
            var italicMatch = ItalicRegex().Match(remaining);
            if (italicMatch.Success && italicMatch.Index == 0)
            {
                var italicText = italicMatch.Groups[1].Value;
                content.Add(CreateTextNode(italicText, new[] { "italic" }));
                remaining = remaining[italicMatch.Length..];
                continue;
            }

            // Check for inline code (`code`)
            var codeMatch = InlineCodeRegex().Match(remaining);
            if (codeMatch.Success && codeMatch.Index == 0)
            {
                var codeText = codeMatch.Groups[1].Value;
                content.Add(CreateTextNode(codeText, new[] { "code" }));
                remaining = remaining[codeMatch.Length..];
                continue;
            }

            // Check for strikethrough (~~text~~)
            var strikeMatch = StrikethroughRegex().Match(remaining);
            if (strikeMatch.Success && strikeMatch.Index == 0)
            {
                var strikeText = strikeMatch.Groups[1].Value;
                content.Add(CreateTextNode(strikeText, new[] { "strike" }));
                remaining = remaining[strikeMatch.Length..];
                continue;
            }

            // Check for links [text](url)
            var linkMatch = LinkRegex().Match(remaining);
            if (linkMatch.Success && linkMatch.Index == 0)
            {
                var linkText = linkMatch.Groups[1].Value;
                var linkUrl = linkMatch.Groups[2].Value;
                content.Add(CreateLinkNode(linkText, linkUrl));
                remaining = remaining[linkMatch.Length..];
                continue;
            }

            // Find the next special character or take all remaining text
            var nextSpecialIndex = FindNextSpecialIndex(remaining);
            if (nextSpecialIndex > 0)
            {
                content.Add(CreateTextNode(remaining[..nextSpecialIndex]));
                remaining = remaining[nextSpecialIndex..];
            }
            else if (nextSpecialIndex == 0)
            {
                // Special char at start but no pattern matched - consume one char
                content.Add(CreateTextNode(remaining[..1]));
                remaining = remaining[1..];
            }
            else
            {
                // No special chars found - add rest as plain text
                content.Add(CreateTextNode(remaining));
                break;
            }
        }

        return content;
    }

    private static int FindNextSpecialIndex(string text)
    {
        var specialChars = new[] { '*', '_', '`', '~', '[' };
        var minIndex = -1;

        foreach (var c in specialChars)
        {
            var index = text.IndexOf(c);
            if (index >= 0 && (minIndex < 0 || index < minIndex))
            {
                minIndex = index;
            }
        }

        return minIndex;
    }

    private static JsonObject CreateTextNode(string text, string[]? marks = null)
    {
        var node = new JsonObject
        {
            ["type"] = "text",
            ["text"] = text
        };

        if (marks != null && marks.Length > 0)
        {
            var marksArray = new JsonArray();
            foreach (var mark in marks)
            {
                marksArray.Add(new JsonObject { ["type"] = mark });
            }
            node["marks"] = marksArray;
        }

        return node;
    }

    private static JsonObject CreateLinkNode(string text, string url)
    {
        return new JsonObject
        {
            ["type"] = "text",
            ["text"] = text,
            ["marks"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "link",
                    ["attrs"] = new JsonObject
                    {
                        ["href"] = url,
                        ["target"] = "_blank"
                    }
                }
            }
        };
    }

    private static (JsonObject, int) ParseCodeBlock(string[] lines, int startIndex)
    {
        var firstLine = lines[startIndex].TrimStart();
        var language = firstLine.Length > 3 ? firstLine[3..].Trim() : "";

        var codeLines = new List<string>();
        var i = startIndex + 1;

        while (i < lines.Length)
        {
            if (lines[i].TrimStart().StartsWith("```"))
            {
                i++;
                break;
            }
            codeLines.Add(lines[i]);
            i++;
        }

        var codeContent = string.Join("\n", codeLines);

        var codeBlock = new JsonObject
        {
            ["type"] = "codeBlock",
            ["attrs"] = new JsonObject { ["language"] = string.IsNullOrEmpty(language) ? JsonValue.Create<string?>(null) : language }
        };

        if (!string.IsNullOrEmpty(codeContent))
        {
            codeBlock["content"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "text",
                    ["text"] = codeContent
                }
            };
        }

        return (codeBlock, i);
    }

    private static (JsonObject, int) ParseBulletList(string[] lines, int startIndex)
    {
        var bulletList = new JsonObject
        {
            ["type"] = "bulletList",
            ["content"] = new JsonArray()
        };

        var content = (JsonArray)bulletList["content"]!;
        var i = startIndex;

        while (i < lines.Length)
        {
            var match = BulletListRegex().Match(lines[i]);
            if (!match.Success)
            {
                break;
            }

            var itemText = match.Groups[1].Value.Trim();
            var listItem = new JsonObject
            {
                ["type"] = "listItem",
                ["content"] = new JsonArray
                {
                    CreateParagraph(itemText)
                }
            };
            content.Add(listItem);
            i++;
        }

        return (bulletList, i);
    }

    private static (JsonObject, int) ParseOrderedList(string[] lines, int startIndex)
    {
        var orderedList = new JsonObject
        {
            ["type"] = "orderedList",
            ["attrs"] = new JsonObject { ["start"] = 1 },
            ["content"] = new JsonArray()
        };

        var content = (JsonArray)orderedList["content"]!;
        var i = startIndex;

        while (i < lines.Length)
        {
            var match = OrderedListRegex().Match(lines[i]);
            if (!match.Success)
            {
                break;
            }

            var itemText = match.Groups[1].Value.Trim();
            var listItem = new JsonObject
            {
                ["type"] = "listItem",
                ["content"] = new JsonArray
                {
                    CreateParagraph(itemText)
                }
            };
            content.Add(listItem);
            i++;
        }

        return (orderedList, i);
    }

    private static (JsonObject, int) ParseTaskList(string[] lines, int startIndex)
    {
        var taskList = new JsonObject
        {
            ["type"] = "taskList",
            ["content"] = new JsonArray()
        };

        var content = (JsonArray)taskList["content"]!;
        var i = startIndex;

        while (i < lines.Length)
        {
            var match = TaskListRegex().Match(lines[i]);
            if (!match.Success)
            {
                break;
            }

            var isChecked = match.Groups[1].Value.ToLowerInvariant() == "x";
            var itemText = match.Groups[2].Value.Trim();

            var taskItem = new JsonObject
            {
                ["type"] = "taskItem",
                ["attrs"] = new JsonObject { ["checked"] = isChecked },
                ["content"] = new JsonArray
                {
                    CreateParagraph(itemText)
                }
            };
            content.Add(taskItem);
            i++;
        }

        return (taskList, i);
    }

    private static (JsonObject, int) ParseBlockquote(string[] lines, int startIndex)
    {
        var blockquote = new JsonObject
        {
            ["type"] = "blockquote",
            ["content"] = new JsonArray()
        };

        var content = (JsonArray)blockquote["content"]!;
        var i = startIndex;

        while (i < lines.Length)
        {
            var line = lines[i];
            if (!line.TrimStart().StartsWith('>'))
            {
                break;
            }

            // Remove the > prefix
            var text = line.TrimStart();
            text = text.Length > 1 ? text[1..].TrimStart() : "";

            content.Add(CreateParagraph(text));
            i++;
        }

        return (blockquote, i);
    }

    // Regex patterns using source generators for performance
    [GeneratedRegex(@"^(#{1,6})\s+(.+)$")]
    private static partial Regex HeadingRegex();

    [GeneratedRegex(@"^(-{3,}|\*{3,}|_{3,})$")]
    private static partial Regex HorizontalRuleRegex();

    [GeneratedRegex(@"^[-*]\s+\[([xX ])\]\s+(.*)$")]
    private static partial Regex TaskListRegex();

    [GeneratedRegex(@"^[-*]\s+(.*)$")]
    private static partial Regex BulletListRegex();

    [GeneratedRegex(@"^\d+\.\s+(.*)$")]
    private static partial Regex OrderedListRegex();

    [GeneratedRegex(@"\*\*(.+?)\*\*|__(.+?)__")]
    private static partial Regex BoldRegex();

    [GeneratedRegex(@"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)")]
    private static partial Regex ItalicRegex();

    [GeneratedRegex(@"`([^`]+)`")]
    private static partial Regex InlineCodeRegex();

    [GeneratedRegex(@"~~(.+?)~~")]
    private static partial Regex StrikethroughRegex();

    [GeneratedRegex(@"\[([^\]]+)\]\(([^)]+)\)")]
    private static partial Regex LinkRegex();
}
