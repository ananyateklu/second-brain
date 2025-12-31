using System.Text.RegularExpressions;

namespace SecondBrain.Tests.Integration.Agent.Framework;

/// <summary>
/// A rule-based mock validator that simulates expected tool selection behavior.
/// This validates that our tool descriptions and system prompt would lead to correct tool selection.
/// </summary>
public class MockToolSelectionValidator : IToolSelectionValidator
{
    private readonly List<ToolSelectionRule> _rules = new();

    public MockToolSelectionValidator()
    {
        InitializeRules();
    }

    private void InitializeRules()
    {
        // ============================================
        // SEARCH TOOLS
        // ============================================

        // SemanticSearch - Default for any search intent
        AddRule(new ToolSelectionRule
        {
            Tool = "SemanticSearch",
            Priority = 10,
            Patterns = new[]
            {
                @"find\s+(my\s+)?(notes?\s+)?(about|on|regarding)",
                @"search\s+(for|my)",
                @"what\s+(do\s+I\s+have|notes?\s+do\s+I\s+have)",
                @"look\s+(up|for)",
                @"where\s+(is|are|did\s+I)",
                @"show\s+me\s+(notes?\s+)?(about|on)",
            },
            ExcludePatterns = new[] { @"exact", @"literal", @"phrase" }
        });

        // SearchNotes - Only for exact text
        AddRule(new ToolSelectionRule
        {
            Tool = "SearchNotes",
            Priority = 15,
            Patterns = new[]
            {
                @"exact\s+(match|phrase|text)",
                @"literal\s+search",
                @"contains?\s+(exactly|the\s+text)",
                @"find\s+exact",
            }
        });

        // SearchByTags - Explicitly mentions tags
        AddRule(new ToolSelectionRule
        {
            Tool = "SearchByTags",
            Priority = 12,
            Patterns = new[]
            {
                @"tagged\s+(with|as)",
                @"notes?\s+with\s+tag",
                @"by\s+tag",
                @"#\w+",
                @"label(ed|s)?\s+(with|as)",
            }
        });

        // GetNotesByDateRange - Date-based queries (explicit date filtering)
        AddRule(new ToolSelectionRule
        {
            Tool = "GetNotesByDateRange",
            Priority = 14,
            Patterns = new[]
            {
                @"(from|since|in)\s+(the\s+)?(last\s+)?(week|month|year)",
                @"notes?\s+(from|created|updated)\s+(yesterday|today|last|this)",
                @"notes?\s+updated\s+last",
                @"notes?\s+created\s+last",
                @"notes?\s+(from|created|updated)\s+\d",
                @"between\s+\d",
                @"what\s+notes?\s+did\s+I\s+(create|write|update)\s+(last|yesterday|today)",
            },
            ExcludePatterns = new[] { @"create\s+a\s+", @"make\s+a\s+", @"new\s+note" }
        });

        // ============================================
        // CRUD TOOLS
        // ============================================

        // CreateNote
        AddRule(new ToolSelectionRule
        {
            Tool = "CreateNote",
            Priority = 10,
            Patterns = new[]
            {
                @"create\s+(a\s+)?(new\s+)?note",
                @"(make|add|write)\s+(a\s+)?(new\s+)?note",
                @"new\s+note\s+(called|titled|about)",
                @"save\s+(this\s+)?(as\s+)?(a\s+)?note",
                @"start\s+a\s+(new\s+)?note",
            }
        });

        // GetNote - Get full content
        AddRule(new ToolSelectionRule
        {
            Tool = "GetNote",
            Priority = 8,
            Patterns = new[]
            {
                @"(show|read|get|open|display)\s+(me\s+)?(the\s+)?(full\s+)?(content|note)",
                @"what('s|\s+is)\s+(in|the\s+content)",
                @"read\s+.*\s+note",
            }
        });

        // UpdateNote - Full replacement
        AddRule(new ToolSelectionRule
        {
            Tool = "UpdateNote",
            Priority = 8,
            Patterns = new[]
            {
                @"(update|change|modify|edit)\s+(the\s+)?(entire|whole|full)",
                @"replace\s+(the\s+)?(entire|whole|all)",
                @"rewrite\s+(the\s+)?note",
            }
        });

        // AppendToNote - Add to end
        AddRule(new ToolSelectionRule
        {
            Tool = "AppendToNote",
            Priority = 15,
            Patterns = new[]
            {
                @"(add|append|put)\s+.*(to|at)\s+(the\s+)?(end|bottom)",
                @"add\s+.*(to\s+)?(my\s+)?.*\s*(list|note)",
                @"append",
                @"(add|include)\s+.+\s+to\s+(the\s+)?note",
            }
        });

        // PrependToNote - Add to beginning (higher priority than AppendToNote)
        AddRule(new ToolSelectionRule
        {
            Tool = "PrependToNote",
            Priority = 18,
            Patterns = new[]
            {
                @"(add|prepend|put)\s+.*(to|at)\s+(the\s+)?(beginning|top|start)",
                @"at the (beginning|top|start)",
                @"prepend",
            }
        });

        // ReplaceInNote - Find and replace
        AddRule(new ToolSelectionRule
        {
            Tool = "ReplaceInNote",
            Priority = 12,
            Patterns = new[]
            {
                @"(replace|change|swap)\s+.*(with|to)\s+",
                @"fix\s+(the\s+)?(typo|error|mistake)",
                @"change\s+\S+\s+to\s+",
            }
        });

        // DeleteNote - Soft delete
        AddRule(new ToolSelectionRule
        {
            Tool = "DeleteNote",
            Priority = 10,
            Patterns = new[]
            {
                @"delete\s+(the\s+)?(old\s+)?",
                @"remove\s+(the\s+)?(my\s+)?(outdated\s+)?",
                @"trash\s+(the\s+)?",
                @"get\s+rid\s+of",
            }
        });

        // ============================================
        // ORGANIZATION TOOLS
        // ============================================

        // ListNotes
        AddRule(new ToolSelectionRule
        {
            Tool = "ListNotes",
            Priority = 10,
            Patterns = new[]
            {
                @"(show|list|display)\s+(me\s+)?(all\s+)?(my\s+)?notes",
                @"what\s+notes\s+do\s+I\s+have",
                @"how\s+many\s+notes",
                @"(show|list|display)\s+(my\s+)?archived\s+notes",
                @"show\s+my\s+archived",
            }
        });

        // SetNoteArchived
        AddRule(new ToolSelectionRule
        {
            Tool = "SetNoteArchived",
            Priority = 14,
            Patterns = new[]
            {
                @"archive\s+(the\s+)?(my\s+)?(project|meeting|old|note)",
                @"^archive\s+",
                @"unarchive",
                @"restore\s+(from\s+)?archive",
                @"hide\s+(the\s+)?note",
            }
        });

        // MoveToFolder
        AddRule(new ToolSelectionRule
        {
            Tool = "MoveToFolder",
            Priority = 12,
            Patterns = new[]
            {
                @"move\s+.*(to\s+)?(folder|category)",
                @"(put|file|organize)\s+.*\s+(into|in)\s+.*(folder|category)",
                @"move\s+.*\s+there",
            }
        });
    }

    private void AddRule(ToolSelectionRule rule)
    {
        _rules.Add(rule);
    }

    public Task<ToolValidationResult> ValidateToolSelectionAsync(
        string userInput,
        List<ConversationTurn>? history,
        CancellationToken cancellationToken = default)
    {
        var input = userInput.ToLowerInvariant();

        // Check for context-dependent language (pronouns, "that", etc.)
        // If we have history and the input references a previous note, use context-aware selection
        var contextAwareTool = GetContextAwareTool(input, history);
        if (contextAwareTool != null)
        {
            var contextParams = ExtractParameters(input, contextAwareTool, history);
            return Task.FromResult(new ToolValidationResult
            {
                SelectedTool = contextAwareTool,
                Parameters = contextParams,
                Success = true,
                ResponseContent = $"Selected tool: {contextAwareTool}"
            });
        }

        // Find the best matching rule
        ToolSelectionRule? bestMatch = null;
        var highestPriority = -1;

        foreach (var rule in _rules)
        {
            // Check exclude patterns first
            if (rule.ExcludePatterns != null &&
                rule.ExcludePatterns.Any(p => Regex.IsMatch(input, p, RegexOptions.IgnoreCase)))
            {
                continue;
            }

            // Check if any pattern matches
            if (rule.Patterns.Any(p => Regex.IsMatch(input, p, RegexOptions.IgnoreCase)))
            {
                if (rule.Priority > highestPriority)
                {
                    highestPriority = rule.Priority;
                    bestMatch = rule;
                }
            }
        }

        // Default to SemanticSearch if no match (it's the default search tool)
        var selectedTool = bestMatch?.Tool ?? "SemanticSearch";

        // Extract potential parameters based on the selected tool
        var parameters = ExtractParameters(input, selectedTool, history);

        return Task.FromResult(new ToolValidationResult
        {
            SelectedTool = selectedTool,
            Parameters = parameters,
            Success = true,
            ResponseContent = $"Selected tool: {selectedTool}"
        });
    }

    /// <summary>
    /// Detects if the input uses context-dependent language and determines the appropriate tool.
    /// </summary>
    private string? GetContextAwareTool(string input, List<ConversationTurn>? history)
    {
        if (history == null || history.Count == 0)
            return null;

        // Check for referential language
        var hasReference = Regex.IsMatch(input, @"\b(it|that|this|the same|that one)\b", RegexOptions.IgnoreCase);
        if (!hasReference)
            return null;

        // Get the last tool used and note ID from history
        var lastNoteId = ExtractLastNoteIdFromHistory(history);
        if (lastNoteId == null)
            return null;

        // Determine action based on the input
        if (Regex.IsMatch(input, @"\b(add|append|also add|include)\b", RegexOptions.IgnoreCase))
        {
            return "AppendToNote";
        }
        if (Regex.IsMatch(input, @"\b(prepend|at the (start|beginning|top))\b", RegexOptions.IgnoreCase))
        {
            return "PrependToNote";
        }
        if (Regex.IsMatch(input, @"\b(edit|update|modify|change)\b", RegexOptions.IgnoreCase))
        {
            return "UpdateNote";
        }
        if (Regex.IsMatch(input, @"\b(delete|remove|trash)\b", RegexOptions.IgnoreCase))
        {
            return "DeleteNote";
        }
        if (Regex.IsMatch(input, @"\b(archive)\b", RegexOptions.IgnoreCase))
        {
            return "SetNoteArchived";
        }
        if (Regex.IsMatch(input, @"\b(move|put)\b.*\b(folder|there)\b", RegexOptions.IgnoreCase))
        {
            return "MoveToFolder";
        }

        return null;
    }

    private Dictionary<string, object>? ExtractParameters(
        string input,
        string tool,
        List<ConversationTurn>? history)
    {
        var parameters = new Dictionary<string, object>();

        switch (tool)
        {
            case "SemanticSearch":
            case "SearchNotes":
                // Extract query from input
                var queryMatch = Regex.Match(input, @"(?:about|for|on|regarding)\s+(.+)", RegexOptions.IgnoreCase);
                if (queryMatch.Success)
                {
                    parameters["query"] = queryMatch.Groups[1].Value.Trim();
                }
                break;

            case "AppendToNote":
                // Extract content to append
                var appendMatch = Regex.Match(input, @"(?:add|append)\s+(.+?)(?:\s+to|\s*$)", RegexOptions.IgnoreCase);
                if (appendMatch.Success)
                {
                    parameters["contentToAppend"] = appendMatch.Groups[1].Value.Trim();
                }
                // Try to get noteId from history
                if (history != null)
                {
                    var lastNoteId = ExtractLastNoteIdFromHistory(history);
                    if (lastNoteId != null)
                    {
                        parameters["noteId"] = lastNoteId;
                    }
                }
                break;

            case "ListNotes":
                if (input.Contains("archived"))
                {
                    parameters["filter"] = "archived";
                }
                else if (input.Contains("all"))
                {
                    parameters["filter"] = "all";
                }
                else
                {
                    parameters["filter"] = "recent";
                }
                break;

            case "SetNoteArchived":
                parameters["isArchived"] = !input.Contains("unarchive") && !input.Contains("restore");
                break;
        }

        return parameters.Count > 0 ? parameters : null;
    }

    private static string? ExtractLastNoteIdFromHistory(List<ConversationTurn> history)
    {
        // Look for note IDs in previous tool results
        foreach (var turn in history.AsEnumerable().Reverse())
        {
            if (turn.ToolResult != null)
            {
                var idMatch = Regex.Match(turn.ToolResult, @"""id""\s*:\s*""([^""]+)""");
                if (idMatch.Success)
                {
                    return idMatch.Groups[1].Value;
                }
            }
        }
        return null;
    }
}

/// <summary>
/// Defines a rule for tool selection based on patterns.
/// </summary>
public class ToolSelectionRule
{
    public required string Tool { get; init; }
    public required string[] Patterns { get; init; }
    public string[]? ExcludePatterns { get; init; }
    public int Priority { get; init; } = 5;
}
