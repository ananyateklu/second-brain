using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;

namespace SecondBrain.Application.Services.Agents;

/// <summary>
/// Detects whether a user query would benefit from automatic note context retrieval.
/// Uses heuristics for fast detection and optional AI-powered intent classification for richer analysis.
/// </summary>
public class QueryIntentDetector
{
    private readonly IStructuredOutputService? _structuredOutputService;
    private readonly ILogger<QueryIntentDetector>? _logger;

    /// <summary>
    /// Creates a QueryIntentDetector with optional AI-powered intent detection.
    /// </summary>
    /// <param name="structuredOutputService">Optional structured output service for AI-powered detection.</param>
    /// <param name="logger">Optional logger for diagnostic output.</param>
    public QueryIntentDetector(
        IStructuredOutputService? structuredOutputService = null,
        ILogger<QueryIntentDetector>? logger = null)
    {
        _structuredOutputService = structuredOutputService;
        _logger = logger;
    }

    /// <summary>
    /// Default constructor for backward compatibility.
    /// Uses heuristic-only detection without AI.
    /// </summary>
    public QueryIntentDetector() : this(null, null)
    {
    }

    // Question words that indicate information seeking
    private static readonly string[] QuestionWords =
    {
        "what", "where", "when", "how", "why", "which", "who", "whose",
        "did i", "have i", "do i", "am i", "was i", "were there",
        "can you tell", "could you tell", "would you", "can you find",
        "is there", "are there", "does", "do you know"
    };

    // Recall/memory trigger phrases
    private static readonly string[] RecallPhrases =
    {
        "my notes", "my note", "i wrote", "i saved", "i created", "i have",
        "remember", "recall", "find my", "show me", "tell me about",
        "what do i know", "what have i", "anything about", "something about",
        "information on", "information about", "details on", "details about",
        "notes on", "notes about", "written about", "documented",
        "look up", "lookup", "search for", "search my", "in my notes",
        "from my notes", "based on my notes", "according to my notes"
    };

    // Action verbs that indicate CRUD operations (should NOT trigger context retrieval)
    private static readonly string[] ActionVerbs =
    {
        "create", "make", "add", "new", "write", "save",
        "delete", "remove", "erase", "trash",
        "update", "edit", "modify", "change", "rename",
        "archive", "unarchive", "restore",
        "move", "organize", "tag", "untag",
        "duplicate", "copy", "clone",
        "append", "prepend"
    };

    // Phrases that strongly indicate an action command
    private static readonly string[] ActionPhrases =
    {
        "create a note", "make a note", "add a note", "write a note",
        "delete the note", "remove the note", "delete this",
        "update the note", "edit the note", "change the",
        "move to folder", "add tag", "remove tag",
        "create new", "make new", "add new"
    };

    /// <summary>
    /// Determines if the query would benefit from automatic semantic search context injection.
    /// </summary>
    /// <param name="query">The user's query text</param>
    /// <returns>True if context should be retrieved, false otherwise</returns>
    public bool ShouldRetrieveContext(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return false;

        var normalizedQuery = query.ToLowerInvariant().Trim();

        // First, check if this is clearly an action command (should NOT retrieve context)
        if (IsActionCommand(normalizedQuery))
            return false;

        // Check for question patterns
        if (IsQuestionQuery(normalizedQuery))
            return true;

        // Check for recall/memory phrases
        if (ContainsRecallPhrase(normalizedQuery))
            return true;

        // Check for topic-based queries (questions about specific subjects)
        if (IsTopicQuery(normalizedQuery))
            return true;

        return false;
    }

    /// <summary>
    /// Checks if the query is clearly an action/CRUD command
    /// </summary>
    private bool IsActionCommand(string query)
    {
        // Check for explicit action phrases first (highest confidence)
        foreach (var phrase in ActionPhrases)
        {
            if (query.Contains(phrase))
                return true;
        }

        // Check if query starts with an action verb (imperative command)
        var firstWord = query.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        foreach (var verb in ActionVerbs)
        {
            if (firstWord.Equals(verb, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        // Check for action verb patterns like "please create" or "can you create"
        foreach (var verb in ActionVerbs)
        {
            if (Regex.IsMatch(query, $@"\b(please|can you|could you|would you|i want to|i need to|let's|lets)\s+{verb}\b", RegexOptions.IgnoreCase))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if the query contains question patterns
    /// </summary>
    private bool IsQuestionQuery(string query)
    {
        // Check for question mark
        if (query.Contains('?'))
            return true;

        // Check for question words at the start or within common patterns
        foreach (var questionWord in QuestionWords)
        {
            // Check if query starts with question word
            if (query.StartsWith(questionWord + " ") || query.StartsWith(questionWord + ","))
                return true;

            // Check for question word patterns like "can you tell me what"
            if (Regex.IsMatch(query, $@"\b{Regex.Escape(questionWord)}\b", RegexOptions.IgnoreCase))
            {
                // Additional check: make sure it's not part of an action command
                // e.g., "what should I name the new note" is action-oriented
                if (!ContainsActionVerb(query))
                    return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Checks if the query contains recall/memory trigger phrases
    /// </summary>
    private bool ContainsRecallPhrase(string query)
    {
        foreach (var phrase in RecallPhrases)
        {
            if (query.Contains(phrase))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if this appears to be a topic-based query (asking about a subject)
    /// </summary>
    private bool IsTopicQuery(string query)
    {
        // Pattern: "about [topic]" without action verbs
        if (Regex.IsMatch(query, @"\babout\s+\w+", RegexOptions.IgnoreCase) && !ContainsActionVerb(query))
            return true;

        // Pattern: "[topic] notes" or "notes on [topic]"
        if (Regex.IsMatch(query, @"\bnotes?\s+(on|about|regarding|for)\b", RegexOptions.IgnoreCase))
            return true;

        // Pattern: "anything on [topic]" or "something about [topic]"
        if (Regex.IsMatch(query, @"\b(anything|something|info|information)\s+(on|about)\b", RegexOptions.IgnoreCase))
            return true;

        return false;
    }

    /// <summary>
    /// Helper to check if query contains any action verbs
    /// </summary>
    private bool ContainsActionVerb(string query)
    {
        foreach (var verb in ActionVerbs)
        {
            if (Regex.IsMatch(query, $@"\b{verb}\b", RegexOptions.IgnoreCase))
                return true;
        }
        return false;
    }

    // ============================================================================
    // AI-Powered Intent Detection Methods
    // ============================================================================

    /// <summary>
    /// Detects query intent using AI-powered structured output.
    /// Provides richer intent classification than heuristic-only detection.
    /// Falls back to heuristic-based detection if AI is unavailable.
    /// </summary>
    /// <param name="query">The user's query text</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>QueryIntent with detailed classification, or null if detection failed</returns>
    public async Task<QueryIntent?> DetectIntentAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return null;

        // If no structured output service, fall back to heuristic-based intent
        if (_structuredOutputService == null)
        {
            _logger?.LogDebug("No structured output service available, using heuristic fallback");
            return CreateHeuristicIntent(query);
        }

        try
        {
            var prompt = BuildIntentDetectionPrompt(query);

            var options = new StructuredOutputOptions
            {
                Temperature = 0.1f, // Low temperature for consistent classification
                MaxTokens = 500,
                SystemInstruction = "You are an intent classifier for a personal knowledge management system. Analyze user queries to determine their intent, required features, and suggested tools."
            };

            var intent = await _structuredOutputService.GenerateAsync<QueryIntent>(prompt, options, cancellationToken);

            if (intent != null)
            {
                _logger?.LogDebug(
                    "AI detected intent: Type={IntentType}, RequiresRAG={RequiresRAG}, RequiresTools={RequiresTools}, Confidence={Confidence}",
                    intent.IntentType, intent.RequiresRAG, intent.RequiresTools, intent.Confidence);
                return intent;
            }

            _logger?.LogWarning("AI intent detection returned null, falling back to heuristics");
            return CreateHeuristicIntent(query);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "AI intent detection failed, falling back to heuristics");
            return CreateHeuristicIntent(query);
        }
    }

    /// <summary>
    /// Detects query intent using AI with a specific provider.
    /// </summary>
    /// <param name="provider">The AI provider to use (e.g., "OpenAI", "Gemini")</param>
    /// <param name="query">The user's query text</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>QueryIntent with detailed classification, or null if detection failed</returns>
    public async Task<QueryIntent?> DetectIntentAsync(
        string provider,
        string query,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return null;

        if (_structuredOutputService == null)
        {
            _logger?.LogDebug("No structured output service available, using heuristic fallback");
            return CreateHeuristicIntent(query);
        }

        try
        {
            var prompt = BuildIntentDetectionPrompt(query);

            var options = new StructuredOutputOptions
            {
                Temperature = 0.1f,
                MaxTokens = 500,
                SystemInstruction = "You are an intent classifier for a personal knowledge management system. Analyze user queries to determine their intent, required features, and suggested tools."
            };

            var intent = await _structuredOutputService.GenerateAsync<QueryIntent>(provider, prompt, options, cancellationToken);

            if (intent != null)
            {
                _logger?.LogDebug(
                    "AI ({Provider}) detected intent: Type={IntentType}, RequiresRAG={RequiresRAG}, Confidence={Confidence}",
                    provider, intent.IntentType, intent.RequiresRAG, intent.Confidence);
                return intent;
            }

            return CreateHeuristicIntent(query);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "AI intent detection with provider {Provider} failed", provider);
            return CreateHeuristicIntent(query);
        }
    }

    /// <summary>
    /// Checks if AI-powered intent detection is available.
    /// </summary>
    public bool IsAIDetectionAvailable => _structuredOutputService != null;

    /// <summary>
    /// Builds the prompt for intent detection.
    /// </summary>
    private static string BuildIntentDetectionPrompt(string query)
    {
        return $@"Analyze this user query from a personal knowledge management system and classify its intent.

User Query: ""{query}""

Consider:
1. What is the user trying to accomplish? (search, create, update, delete, question, analyze, summarize, compare)
2. Would retrieving relevant notes from their knowledge base help answer this query?
3. Does this query require using tools to manipulate notes or search?
4. What specific tools might be needed?

Intent types:
- search: Looking for specific information in notes
- create: Creating new notes or content
- update: Modifying existing notes
- delete: Removing notes
- question: Asking a question that might benefit from note context
- analyze: Requesting analysis of notes or content
- summarize: Requesting a summary of notes or topics
- compare: Comparing notes or concepts

Classify this query and provide your analysis.";
    }

    /// <summary>
    /// Creates a QueryIntent based on heuristic detection when AI is unavailable.
    /// </summary>
    private QueryIntent CreateHeuristicIntent(string query)
    {
        var normalizedQuery = query.ToLowerInvariant().Trim();
        var isAction = IsActionCommand(normalizedQuery);
        var shouldRetrieve = ShouldRetrieveContext(query);

        // Determine intent type based on heuristics
        string intentType;
        var suggestedTools = new List<string>();

        if (isAction)
        {
            if (normalizedQuery.Contains("create") || normalizedQuery.Contains("make") || normalizedQuery.Contains("add") || normalizedQuery.Contains("write"))
            {
                intentType = "create";
                suggestedTools.Add("create_note");
            }
            else if (normalizedQuery.Contains("delete") || normalizedQuery.Contains("remove"))
            {
                intentType = "delete";
                suggestedTools.Add("delete_note");
            }
            else if (normalizedQuery.Contains("update") || normalizedQuery.Contains("edit") || normalizedQuery.Contains("modify"))
            {
                intentType = "update";
                suggestedTools.Add("update_note");
            }
            else
            {
                intentType = "update"; // Default action type
            }
        }
        else if (shouldRetrieve)
        {
            if (normalizedQuery.Contains("summar"))
            {
                intentType = "summarize";
            }
            else if (normalizedQuery.Contains("compare") || normalizedQuery.Contains("difference"))
            {
                intentType = "compare";
            }
            else if (normalizedQuery.Contains("analyz") || normalizedQuery.Contains("analys"))
            {
                intentType = "analyze";
            }
            else if (ContainsRecallPhrase(normalizedQuery) || normalizedQuery.Contains("search") || normalizedQuery.Contains("find"))
            {
                intentType = "search";
                suggestedTools.Add("search_notes");
            }
            else
            {
                intentType = "question";
            }
        }
        else
        {
            intentType = "question";
        }

        return new QueryIntent
        {
            IntentType = intentType,
            RequiresRAG = shouldRetrieve,
            RequiresTools = isAction || suggestedTools.Count > 0,
            SuggestedTools = suggestedTools,
            Confidence = 0.7f, // Heuristic confidence is moderate
            Reasoning = "Classified using heuristic pattern matching (AI unavailable)",
            Entities = ExtractSimpleEntities(query)
        };
    }

    /// <summary>
    /// Extracts simple entities from the query using basic patterns.
    /// </summary>
    private static List<string> ExtractSimpleEntities(string query)
    {
        var entities = new List<string>();

        // Extract quoted strings as potential entities
        var quotedMatches = Regex.Matches(query, @"""([^""]+)""|'([^']+)'");
        foreach (Match match in quotedMatches)
        {
            var value = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
            if (!string.IsNullOrWhiteSpace(value))
                entities.Add(value);
        }

        // Extract words after common prepositions as potential topics
        var topicMatches = Regex.Matches(query, @"\b(?:about|on|regarding|for|called|named|titled)\s+([a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)?)", RegexOptions.IgnoreCase);
        foreach (Match match in topicMatches)
        {
            if (match.Groups[1].Success && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                entities.Add(match.Groups[1].Value);
        }

        return entities.Distinct().ToList();
    }
}

