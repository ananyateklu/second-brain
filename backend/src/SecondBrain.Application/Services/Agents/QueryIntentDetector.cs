using System.Text.RegularExpressions;

namespace SecondBrain.Application.Services.Agents;

/// <summary>
/// Detects whether a user query would benefit from automatic note context retrieval.
/// Uses heuristics to identify knowledge/recall queries vs. action commands.
/// </summary>
public class QueryIntentDetector
{
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
}

