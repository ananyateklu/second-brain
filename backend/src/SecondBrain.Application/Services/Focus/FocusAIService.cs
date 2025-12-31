using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pgvector;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs.Focus;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.Focus;

/// <summary>
/// AI service for focus suggestions and progress summaries
/// </summary>
public class FocusAIService : IFocusAIService
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly IRagService _ragService;
    private readonly IFocusItemRepository _focusRepository;
    private readonly IFocusSuggestionRepository _suggestionRepository;
    private readonly IEmbeddingProvider _embeddingProvider;
    private readonly IUserRepository _userRepository;
    private readonly FocusAISettings _settings;
    private readonly ILogger<FocusAIService> _logger;

    public FocusAIService(
        IAIProviderFactory aiProviderFactory,
        IRagService ragService,
        IFocusItemRepository focusRepository,
        IFocusSuggestionRepository suggestionRepository,
        IEmbeddingProvider embeddingProvider,
        IUserRepository userRepository,
        IOptions<FocusAISettings> settings,
        ILogger<FocusAIService> logger)
    {
        _aiProviderFactory = aiProviderFactory;
        _ragService = ragService;
        _focusRepository = focusRepository;
        _suggestionRepository = suggestionRepository;
        _embeddingProvider = embeddingProvider;
        _userRepository = userRepository;
        _settings = settings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<FocusSuggestionsResponse> GetSuggestionsAsync(
        string userId,
        string? currentFocusTitle = null,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            _logger.LogDebug("Focus AI is disabled");
            return new FocusSuggestionsResponse(
                Suggestions: new List<FocusSuggestionItem>(),
                Context: "AI suggestions are currently disabled",
                GeneratedAt: DateTime.UtcNow
            );
        }

        try
        {
            // Get user-specific settings (merged with global defaults)
            var effectiveSettings = await GetEffectiveSettingsAsync(userId, cancellationToken);
            _logger.LogDebug(
                "Using Focus AI settings for user {UserId}: Provider={Provider}, Model={Model}, TopK={TopK}",
                userId, effectiveSettings.Provider, effectiveSettings.Model, effectiveSettings.RagTopK);

            // Build search query based on context
            var searchQuery = BuildSuggestionSearchQuery(currentFocusTitle);

            // Retrieve relevant notes via RAG using user's settings
            var ragContext = await _ragService.RetrieveContextAsync(
                query: searchQuery,
                userId: userId,
                topK: effectiveSettings.RagTopK,
                similarityThreshold: effectiveSettings.SimilarityThreshold,
                cancellationToken: cancellationToken
            );

            if (ragContext.RetrievedNotes.Count == 0)
            {
                _logger.LogDebug("No relevant notes found for suggestions");
                return new FocusSuggestionsResponse(
                    Suggestions: new List<FocusSuggestionItem>(),
                    Context: "No relevant notes found to base suggestions on",
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Get AI provider from user preferences
            var provider = GetEnabledProvider(effectiveSettings.Provider);
            if (provider == null)
            {
                return new FocusSuggestionsResponse(
                    Suggestions: new List<FocusSuggestionItem>(),
                    Context: "No AI provider available",
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Get existing active focus items to avoid duplicate suggestions (Layer 1: Prompt)
            var activeItems = await _focusRepository.GetActiveItemsAsync(userId, cancellationToken);
            var existingTitles = activeItems.Select(f => f.Title).ToList();
            _logger.LogDebug("Found {Count} existing active focus items for deduplication", existingTitles.Count);

            // Build prompt with note context and existing items to avoid
            var prompt = BuildSuggestionPrompt(ragContext.FormattedContext, currentFocusTitle, effectiveSettings.MaxSuggestions, existingTitles);

            // Generate suggestions using user's model and settings
            var request = new AIRequest
            {
                Prompt = prompt,
                Model = effectiveSettings.Model,
                MaxTokens = effectiveSettings.MaxTokens,
                Temperature = effectiveSettings.Temperature
            };

            var response = await provider.GenerateCompletionAsync(request, cancellationToken);

            if (!response.Success)
            {
                _logger.LogWarning("AI suggestion generation failed: {Error}", response.Error);
                return new FocusSuggestionsResponse(
                    Suggestions: new List<FocusSuggestionItem>(),
                    Context: $"Failed to generate suggestions: {response.Error}",
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Parse suggestions from AI response
            var suggestions = ParseSuggestions(response.Content, ragContext.RetrievedNotes);

            return new FocusSuggestionsResponse(
                Suggestions: suggestions.Take(effectiveSettings.MaxSuggestions).ToList(),
                Context: $"Based on {ragContext.RetrievedNotes.Count} relevant notes (Provider: {effectiveSettings.Provider})",
                GeneratedAt: DateTime.UtcNow
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating focus suggestions for user {UserId}", userId);
            return new FocusSuggestionsResponse(
                Suggestions: new List<FocusSuggestionItem>(),
                Context: $"Error: {ex.Message}",
                GeneratedAt: DateTime.UtcNow
            );
        }
    }

    /// <inheritdoc />
    public async Task<ProgressSummaryResponse> GetProgressSummaryAsync(
        string userId,
        string period = "today",
        CancellationToken cancellationToken = default)
    {
        // Calculate date range based on period
        var (startDate, endDate) = GetDateRange(period);

        // Get completed items in the period
        var completedItems = await _focusRepository.GetCompletedInRangeAsync(
            userId,
            startDate,
            endDate,
            cancellationToken
        );

        // Calculate stats
        var completedList = completedItems.ToList();
        var stats = new CompletionStats(
            TotalCompleted: completedList.Count,
            TotalMinutesTracked: completedList.Sum(i => i.ActualMinutes ?? 0),
            CompletedByPriority: completedList
                .GroupBy(i => i.Priority)
                .ToDictionary(g => g.Key, g => g.Count()),
            StreakDays: await CalculateStreakAsync(userId, cancellationToken)
        );

        if (!_settings.Enabled || completedList.Count == 0)
        {
            return new ProgressSummaryResponse(
                Period: period,
                StartDate: startDate,
                EndDate: endDate,
                Stats: stats,
                Summary: completedList.Count == 0
                    ? "No items completed in this period yet."
                    : "AI summary is disabled.",
                Highlights: new List<string>(),
                Encouragement: null,
                GeneratedAt: DateTime.UtcNow
            );
        }

        try
        {
            // Get user-specific settings
            var effectiveSettings = await GetEffectiveSettingsAsync(userId, cancellationToken);

            // Get AI provider from user preferences
            var provider = GetEnabledProvider(effectiveSettings.Provider);
            if (provider == null)
            {
                return new ProgressSummaryResponse(
                    Period: period,
                    StartDate: startDate,
                    EndDate: endDate,
                    Stats: stats,
                    Summary: $"Completed {stats.TotalCompleted} items.",
                    Highlights: new List<string>(),
                    Encouragement: null,
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Build summary prompt
            var completedTitles = completedList.Select(i => i.Title).ToList();
            var prompt = BuildSummaryPrompt(completedTitles, stats, period);

            // Generate summary using user's model and settings
            // Use lower temperature for summaries (more factual)
            var request = new AIRequest
            {
                Prompt = prompt,
                Model = effectiveSettings.Model,
                MaxTokens = Math.Min(effectiveSettings.MaxTokens, 500), // Summaries need fewer tokens
                Temperature = Math.Min(effectiveSettings.Temperature, 0.5f) // Lower temp for factual summaries
            };

            var response = await provider.GenerateCompletionAsync(request, cancellationToken);

            if (!response.Success)
            {
                _logger.LogWarning("AI summary generation failed: {Error}", response.Error);
                return new ProgressSummaryResponse(
                    Period: period,
                    StartDate: startDate,
                    EndDate: endDate,
                    Stats: stats,
                    Summary: $"Completed {stats.TotalCompleted} items.",
                    Highlights: completedTitles.Take(3).ToList(),
                    Encouragement: null,
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Parse summary response
            var (summary, highlights, encouragement) = ParseSummaryResponse(response.Content);

            return new ProgressSummaryResponse(
                Period: period,
                StartDate: startDate,
                EndDate: endDate,
                Stats: stats,
                Summary: summary,
                Highlights: highlights,
                Encouragement: encouragement,
                GeneratedAt: DateTime.UtcNow
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating progress summary for user {UserId}", userId);
            return new ProgressSummaryResponse(
                Period: period,
                StartDate: startDate,
                EndDate: endDate,
                Stats: stats,
                Summary: $"Completed {stats.TotalCompleted} items.",
                Highlights: new List<string>(),
                Encouragement: null,
                GeneratedAt: DateTime.UtcNow
            );
        }
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    /// <summary>
    /// Gets effective Focus AI settings by merging user preferences with global defaults
    /// </summary>
    private async Task<EffectiveFocusSettings> GetEffectiveSettingsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            var prefs = user?.Preferences;

            return new EffectiveFocusSettings
            {
                Provider = !string.IsNullOrWhiteSpace(prefs?.FocusAIProvider)
                    ? prefs.FocusAIProvider
                    : _settings.Provider,
                Model = !string.IsNullOrWhiteSpace(prefs?.FocusAIModel)
                    ? prefs.FocusAIModel
                    : _settings.SuggestionModel,
                Temperature = prefs?.FocusAITemperature ?? _settings.SuggestionTemperature,
                MaxTokens = prefs?.FocusAIMaxTokens ?? _settings.SuggestionMaxTokens,
                RagTopK = prefs?.FocusAIRagTopK ?? _settings.RagTopK,
                SimilarityThreshold = prefs?.FocusAISimilarityThreshold ?? _settings.RagSimilarityThreshold,
                MaxSuggestions = prefs?.FocusAIMaxSuggestions ?? _settings.MaxSuggestions,
                DedupThreshold = prefs?.FocusAIDedupThreshold ?? _settings.SuggestionSimilarityThreshold
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load user preferences for {UserId}, using defaults", userId);
            return new EffectiveFocusSettings
            {
                Provider = _settings.Provider,
                Model = _settings.SuggestionModel,
                Temperature = _settings.SuggestionTemperature,
                MaxTokens = _settings.SuggestionMaxTokens,
                RagTopK = _settings.RagTopK,
                SimilarityThreshold = _settings.RagSimilarityThreshold,
                MaxSuggestions = _settings.MaxSuggestions,
                DedupThreshold = _settings.SuggestionSimilarityThreshold
            };
        }
    }

    /// <summary>
    /// Effective Focus AI settings (merged from user prefs + global defaults)
    /// </summary>
    private class EffectiveFocusSettings
    {
        public string Provider { get; set; } = "OpenAI";
        public string Model { get; set; } = "gpt-4o-mini";
        public float Temperature { get; set; } = 0.7f;
        public int MaxTokens { get; set; } = 800;
        public int RagTopK { get; set; } = 10;
        public float SimilarityThreshold { get; set; } = 0.3f;
        public int MaxSuggestions { get; set; } = 5;
        public float DedupThreshold { get; set; } = 0.85f;
    }

    private IAIProvider? GetEnabledProvider(string preferredProvider)
    {
        try
        {
            var provider = _aiProviderFactory.GetProvider(preferredProvider);
            if (provider.IsEnabled)
            {
                _logger.LogDebug("Using user-preferred Focus AI provider: {Provider}", preferredProvider);
                return provider;
            }

            _logger.LogWarning("User-preferred provider {Provider} is not enabled, falling back", preferredProvider);
            // Fallback to any enabled provider
            return _aiProviderFactory.GetEnabledProviders().FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get AI provider {Provider}", preferredProvider);
            return _aiProviderFactory.GetEnabledProviders().FirstOrDefault();
        }
    }

    [Obsolete("Use GetEnabledProvider(string preferredProvider) instead")]
    private IAIProvider? GetEnabledProvider()
    {
        return GetEnabledProvider(_settings.Provider);
    }

    private static string BuildSuggestionSearchQuery(string? currentFocusTitle)
    {
        var baseQuery = "actionable tasks TODO items to do next steps action items goals objectives priorities important urgent";

        if (!string.IsNullOrWhiteSpace(currentFocusTitle))
        {
            return $"{baseQuery} related to {currentFocusTitle}";
        }

        return baseQuery;
    }

    private string BuildSuggestionPrompt(
        string noteContext,
        string? currentFocusTitle,
        int maxSuggestions,
        IEnumerable<string>? existingFocusTitles = null)
    {
        var currentFocusSection = string.IsNullOrWhiteSpace(currentFocusTitle)
            ? ""
            : $"\n\nCurrent focus: {currentFocusTitle}";

        // Build existing focus items section to prevent duplicate suggestions
        var existingItemsSection = "";
        var existingList = existingFocusTitles?.ToList() ?? new List<string>();
        if (existingList.Count > 0)
        {
            var existingItemsList = string.Join("\n- ", existingList);
            existingItemsSection = $"""


            EXISTING FOCUS ITEMS (DO NOT SUGGEST THESE OR SIMILAR):
            - {existingItemsList}

            IMPORTANT: Do NOT suggest items that are the same as or very similar to the existing focus items listed above. The user already has these in their plan or backlog.
            """;
        }

        return $$"""
            You are a productivity assistant helping a user decide what to focus on next.

            Based on the following notes from the user's knowledge base, suggest {{maxSuggestions}} actionable focus items they could work on.
            {{currentFocusSection}}

            NOTES CONTEXT:
            {{noteContext}}
            {{existingItemsSection}}

            For each suggestion, provide:
            1. A clear, actionable title (max 100 chars)
            2. A brief description of what to do (max 200 chars)
            3. Priority (1=High/Urgent, 2=Medium/Important, 3=Low/Nice-to-have)
            4. Estimated time in minutes (15, 30, 45, 60, 90, 120, or leave empty)
            5. Why this is a good focus item (max 100 chars)
            6. Confidence score (0.0 to 1.0)

            Respond in JSON format:
            {
              "suggestions": [
                {
                  "title": "string",
                  "description": "string or null",
                  "priority": 1|2|3,
                  "estimatedMinutes": number or null,
                  "reason": "string",
                  "confidence": 0.0-1.0
                }
              ]
            }

            Focus on:
            - Actionable items that can be started immediately
            - Items that appear urgent or time-sensitive
            - Items mentioned as goals or TODOs
            - Items related to ongoing projects

            Respond ONLY with valid JSON, no other text.
            """;
    }

    private string BuildSummaryPrompt(List<string> completedTitles, CompletionStats stats, string period)
    {
        var titlesList = string.Join("\n- ", completedTitles);
        var periodLabel = period switch
        {
            "today" => "today",
            "week" => "this week",
            "month" => "this month",
            _ => period
        };

        return $$"""
            You are a supportive productivity assistant. Summarize the user's progress {{periodLabel}}.

            COMPLETED ITEMS ({{stats.TotalCompleted}} total):
            - {{titlesList}}

            STATS:
            - Total time tracked: {{stats.TotalMinutesTracked}} minutes
            - High priority completed: {{stats.CompletedByPriority.GetValueOrDefault(1, 0)}}
            - Medium priority completed: {{stats.CompletedByPriority.GetValueOrDefault(2, 0)}}
            - Low priority completed: {{stats.CompletedByPriority.GetValueOrDefault(3, 0)}}
            - Current streak: {{stats.StreakDays}} days

            Provide a brief, encouraging summary. Respond in JSON format:
            {
              "summary": "A 1-2 sentence summary of accomplishments",
              "highlights": ["highlight 1", "highlight 2", "highlight 3"],
              "encouragement": "A brief motivational message"
            }

            Be concise, warm, and genuine. Don't be over-the-top or use excessive praise.
            Respond ONLY with valid JSON, no other text.
            """;
    }

    private List<FocusSuggestionItem> ParseSuggestions(
        string aiResponse,
        List<VectorSearchResult> retrievedNotes)
    {
        var suggestions = new List<FocusSuggestionItem>();

        try
        {
            // Extract JSON from response (handle markdown code blocks)
            var jsonContent = ExtractJsonFromResponse(aiResponse);

            using var doc = JsonDocument.Parse(jsonContent);
            var root = doc.RootElement;

            if (root.TryGetProperty("suggestions", out var suggestionsArray))
            {
                foreach (var item in suggestionsArray.EnumerateArray())
                {
                    var title = item.GetProperty("title").GetString() ?? "";
                    var description = item.TryGetProperty("description", out var descProp) && descProp.ValueKind != JsonValueKind.Null
                        ? descProp.GetString()
                        : null;
                    var priority = item.TryGetProperty("priority", out var prioProp)
                        ? prioProp.GetInt32()
                        : 2;
                    var estimatedMinutes = item.TryGetProperty("estimatedMinutes", out var estProp) && estProp.ValueKind != JsonValueKind.Null
                        ? estProp.GetInt32()
                        : (int?)null;
                    var reason = item.TryGetProperty("reason", out var reasonProp)
                        ? reasonProp.GetString() ?? ""
                        : "";
                    var confidence = item.TryGetProperty("confidence", out var confProp)
                        ? (float)confProp.GetDouble()
                        : 0.5f;

                    // Try to match with a source note
                    var matchingNote = retrievedNotes.FirstOrDefault(n =>
                        n.NoteTitle?.Contains(title, StringComparison.OrdinalIgnoreCase) == true ||
                        title.Contains(n.NoteTitle ?? "", StringComparison.OrdinalIgnoreCase));

                    suggestions.Add(new FocusSuggestionItem(
                        Title: title.Length > 100 ? title[..100] : title,
                        Description: description?.Length > 200 ? description[..200] : description,
                        Priority: Math.Clamp(priority, 1, 3),
                        EstimatedMinutes: estimatedMinutes,
                        Reason: reason.Length > 100 ? reason[..100] : reason,
                        SourceNoteId: matchingNote?.NoteId,
                        SourceNoteTitle: matchingNote?.NoteTitle,
                        Confidence: Math.Clamp(confidence, 0f, 1f)
                    ));
                }
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI suggestions JSON");
        }

        return suggestions;
    }

    private (string summary, List<string> highlights, string? encouragement) ParseSummaryResponse(string aiResponse)
    {
        try
        {
            var jsonContent = ExtractJsonFromResponse(aiResponse);

            using var doc = JsonDocument.Parse(jsonContent);
            var root = doc.RootElement;

            var summary = root.TryGetProperty("summary", out var sumProp)
                ? sumProp.GetString() ?? ""
                : "";

            var highlights = new List<string>();
            if (root.TryGetProperty("highlights", out var hlArray))
            {
                foreach (var hl in hlArray.EnumerateArray())
                {
                    var text = hl.GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        highlights.Add(text);
                    }
                }
            }

            var encouragement = root.TryGetProperty("encouragement", out var encProp)
                ? encProp.GetString()
                : null;

            return (summary, highlights, encouragement);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI summary JSON");
            return ("Progress summary unavailable.", new List<string>(), null);
        }
    }

    private static string ExtractJsonFromResponse(string response)
    {
        // Remove markdown code blocks if present
        var jsonMatch = Regex.Match(response, @"```(?:json)?\s*([\s\S]*?)\s*```");
        if (jsonMatch.Success)
        {
            return jsonMatch.Groups[1].Value.Trim();
        }

        // Try to find JSON object directly
        var startIndex = response.IndexOf('{');
        var endIndex = response.LastIndexOf('}');

        if (startIndex >= 0 && endIndex > startIndex)
        {
            return response.Substring(startIndex, endIndex - startIndex + 1);
        }

        return response.Trim();
    }

    private static (DateTime startDate, DateTime endDate) GetDateRange(string period)
    {
        var today = DateTime.UtcNow.Date;

        return period.ToLowerInvariant() switch
        {
            "today" => (today, today.AddDays(1).AddTicks(-1)),
            "week" => (today.AddDays(-7), today.AddDays(1).AddTicks(-1)),
            "month" => (today.AddDays(-30), today.AddDays(1).AddTicks(-1)),
            _ => (today, today.AddDays(1).AddTicks(-1))
        };
    }

    private async Task<int> CalculateStreakAsync(string userId, CancellationToken cancellationToken)
    {
        // Simple streak calculation - count consecutive days with completions
        var today = DateTime.UtcNow.Date;
        var streak = 0;

        for (int i = 0; i < 365; i++) // Max 1 year streak
        {
            var date = today.AddDays(-i);
            var completed = await _focusRepository.GetCompletedInRangeAsync(
                userId,
                date,
                date.AddDays(1).AddTicks(-1),
                cancellationToken
            );

            if (completed.Any())
            {
                streak++;
            }
            else if (i > 0) // Don't break streak on today if nothing completed yet
            {
                break;
            }
        }

        return streak;
    }

    // ============================================
    // Persisted Suggestions Methods
    // ============================================

    /// <inheritdoc />
    public async Task<GenerateSuggestionsResponse> GenerateAndPersistSuggestionsAsync(
        string userId,
        string? currentFocusTitle = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation(
                "Generating and persisting suggestions for user. UserId: {UserId}",
                userId);

            // Step 1: Generate suggestions using existing method
            var aiResponse = await GetSuggestionsAsync(userId, currentFocusTitle, cancellationToken);

            if (aiResponse.Suggestions.Count == 0)
            {
                _logger.LogDebug("No new suggestions generated, returning existing");
                var existing = await GetPersistedSuggestionsAsync(userId, false, cancellationToken);
                return new GenerateSuggestionsResponse(
                    AllSuggestions: existing,
                    NewSuggestionsAdded: 0,
                    DuplicatesSkipped: 0,
                    Context: aiResponse.Context ?? "No new suggestions generated",
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Step 2: Generate embeddings for each suggestion
            var textsToEmbed = aiResponse.Suggestions
                .Select(s => $"{s.Title} {s.Description ?? ""} {s.Reason}")
                .ToList();

            var embeddingResult = await _embeddingProvider.GenerateEmbeddingsAsync(
                textsToEmbed,
                cancellationToken);

            if (!embeddingResult.Success || embeddingResult.Embeddings.Count != aiResponse.Suggestions.Count)
            {
                _logger.LogWarning("Failed to generate embeddings for suggestions");
                var existing = await GetPersistedSuggestionsAsync(userId, false, cancellationToken);
                return new GenerateSuggestionsResponse(
                    AllSuggestions: existing,
                    NewSuggestionsAdded: 0,
                    DuplicatesSkipped: 0,
                    Context: "Failed to generate embeddings for deduplication",
                    GeneratedAt: DateTime.UtcNow
                );
            }

            // Step 3: Check for duplicates and create new suggestions
            var newSuggestions = new List<FocusSuggestion>();
            var duplicatesSkipped = 0;
            // Get user-specific settings for dedup threshold
            var effectiveSettings = await GetEffectiveSettingsAsync(userId, cancellationToken);
            var similarityThreshold = effectiveSettings.DedupThreshold;

            // Layer 2: Get existing focus item titles for post-generation filtering
            var activeItems = await _focusRepository.GetActiveItemsAsync(userId, cancellationToken);
            var existingFocusTitles = activeItems.Select(f => f.Title).ToList();
            _logger.LogDebug("Layer 2 filter: {Count} existing focus items to check against", existingFocusTitles.Count);

            for (int i = 0; i < aiResponse.Suggestions.Count; i++)
            {
                var suggestion = aiResponse.Suggestions[i];
                var embeddingList = embeddingResult.Embeddings[i];

                // Convert List<double> to float[] for Vector
                var floatArray = embeddingList.Select(d => (float)d).ToArray();
                var embedding = new Vector(floatArray);
                var embeddingDimensions = floatArray.Length;

                // Check if similar suggestion already exists
                // Filter by dimensions to enable index usage and ensure compatible vector comparison
                var hasSimilar = await _suggestionRepository.ExistsSimilarAsync(
                    userId,
                    embedding,
                    embeddingDimensions,
                    similarityThreshold,
                    cancellationToken);

                if (hasSimilar)
                {
                    duplicatesSkipped++;
                    _logger.LogDebug(
                        "Skipping duplicate suggestion (similar to existing suggestion): {Title}",
                        suggestion.Title);
                    continue;
                }

                // Layer 2: Check if similar to existing focus items (belt and suspenders)
                if (existingFocusTitles.Count > 0 && IsSimilarToExistingFocusItem(suggestion.Title, existingFocusTitles))
                {
                    duplicatesSkipped++;
                    _logger.LogDebug(
                        "Skipping suggestion similar to existing focus item: {Title}",
                        suggestion.Title);
                    continue;
                }

                // Create new entity
                newSuggestions.Add(new FocusSuggestion
                {
                    Id = UuidV7.NewId(),
                    UserId = userId,
                    Title = suggestion.Title,
                    Description = suggestion.Description,
                    Priority = suggestion.Priority,
                    EstimatedMinutes = suggestion.EstimatedMinutes,
                    Reason = suggestion.Reason,
                    Confidence = suggestion.Confidence,
                    SourceNoteId = suggestion.SourceNoteId,
                    SourceNoteTitle = suggestion.SourceNoteTitle,
                    Embedding = embedding,
                    EmbeddingProvider = _embeddingProvider.ProviderName,
                    EmbeddingModel = _embeddingProvider.ModelName,
                    EmbeddingDimensions = embeddingDimensions
                });
            }

            // Step 4: Batch save new suggestions
            if (newSuggestions.Count > 0)
            {
                await _suggestionRepository.CreateBatchAsync(newSuggestions, cancellationToken);
                _logger.LogInformation(
                    "Saved {Count} new suggestions for user. UserId: {UserId}",
                    newSuggestions.Count, userId);
            }

            // Step 5: Return all suggestions (existing + new)
            var allSuggestions = await GetPersistedSuggestionsAsync(userId, false, cancellationToken);

            return new GenerateSuggestionsResponse(
                AllSuggestions: allSuggestions,
                NewSuggestionsAdded: newSuggestions.Count,
                DuplicatesSkipped: duplicatesSkipped,
                Context: aiResponse.Context ?? "",
                GeneratedAt: DateTime.UtcNow
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating and persisting suggestions. UserId: {UserId}", userId);
            var existing = await GetPersistedSuggestionsAsync(userId, false, cancellationToken);
            return new GenerateSuggestionsResponse(
                AllSuggestions: existing,
                NewSuggestionsAdded: 0,
                DuplicatesSkipped: 0,
                Context: $"Error: {ex.Message}",
                GeneratedAt: DateTime.UtcNow
            );
        }
    }

    /// <inheritdoc />
    public async Task<List<PersistedFocusSuggestionResponse>> GetPersistedSuggestionsAsync(
        string userId,
        bool includeAccepted = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var suggestions = await _suggestionRepository.GetAllByUserIdAsync(
                userId,
                includeAccepted,
                cancellationToken);

            return suggestions.Select(MapToResponse).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting persisted suggestions. UserId: {UserId}", userId);
            return new List<PersistedFocusSuggestionResponse>();
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteSuggestionAsync(
        string suggestionId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Verify ownership
            var suggestion = await _suggestionRepository.GetByIdAsync(suggestionId, cancellationToken);
            if (suggestion == null || suggestion.UserId != userId)
            {
                _logger.LogWarning(
                    "Suggestion not found or not owned by user. SuggestionId: {Id}, UserId: {UserId}",
                    suggestionId, userId);
                return false;
            }

            return await _suggestionRepository.SoftDeleteAsync(suggestionId, userId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting suggestion. SuggestionId: {Id}", suggestionId);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<PersistedFocusSuggestionResponse?> AcceptSuggestionAsync(
        string suggestionId,
        string focusItemId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Verify ownership
            var suggestion = await _suggestionRepository.GetByIdAsync(suggestionId, cancellationToken);
            if (suggestion == null || suggestion.UserId != userId)
            {
                _logger.LogWarning(
                    "Suggestion not found or not owned by user. SuggestionId: {Id}, UserId: {UserId}",
                    suggestionId, userId);
                return null;
            }

            var updated = await _suggestionRepository.MarkAsAcceptedAsync(
                suggestionId,
                focusItemId,
                cancellationToken);

            return updated != null ? MapToResponse(updated) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting suggestion. SuggestionId: {Id}", suggestionId);
            return null;
        }
    }

    private static PersistedFocusSuggestionResponse MapToResponse(FocusSuggestion suggestion)
    {
        return new PersistedFocusSuggestionResponse(
            Id: suggestion.Id,
            Title: suggestion.Title,
            Description: suggestion.Description,
            Priority: suggestion.Priority,
            EstimatedMinutes: suggestion.EstimatedMinutes,
            Reason: suggestion.Reason,
            Confidence: suggestion.Confidence,
            SourceNoteId: suggestion.SourceNoteId,
            SourceNoteTitle: suggestion.SourceNoteTitle,
            IsAccepted: suggestion.IsAccepted,
            AcceptedFocusItemId: suggestion.AcceptedFocusItemId,
            CreatedAt: suggestion.CreatedAt
        );
    }

    /// <summary>
    /// Calculates fuzzy text similarity using Jaccard similarity on word tokens.
    /// Returns a value between 0.0 (no similarity) and 1.0 (identical).
    /// </summary>
    private static double FuzzyTextSimilarity(string a, string b)
    {
        if (string.IsNullOrWhiteSpace(a) || string.IsNullOrWhiteSpace(b))
            return 0;

        // Normalize: lowercase, split on whitespace and common punctuation
        var wordsA = a.ToLowerInvariant()
            .Split(new[] { ' ', '-', '_', ':', '/', '&', '+' }, StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet();
        var wordsB = b.ToLowerInvariant()
            .Split(new[] { ' ', '-', '_', ':', '/', '&', '+' }, StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet();

        if (wordsA.Count == 0 || wordsB.Count == 0)
            return 0;

        var intersection = wordsA.Intersect(wordsB).Count();
        var union = wordsA.Union(wordsB).Count();

        return union == 0 ? 0 : (double)intersection / union;
    }

    /// <summary>
    /// Checks if a suggestion title is similar to any existing focus item titles.
    /// Uses fuzzy matching and substring containment.
    /// </summary>
    private static bool IsSimilarToExistingFocusItem(string suggestionTitle, IEnumerable<string> existingTitles)
    {
        var suggestionLower = suggestionTitle.ToLowerInvariant();

        foreach (var existingTitle in existingTitles)
        {
            var existingLower = existingTitle.ToLowerInvariant();

            // Check Jaccard similarity (word overlap)
            if (FuzzyTextSimilarity(suggestionTitle, existingTitle) > 0.6)
                return true;

            // Check substring containment (one contains the other)
            if (existingLower.Contains(suggestionLower) || suggestionLower.Contains(existingLower))
                return true;

            // Check if most words overlap (handles slight rewording)
            var suggestionWords = suggestionLower.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
            var existingWords = existingLower.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
            var overlap = suggestionWords.Intersect(existingWords).Count();
            var minWords = Math.Min(suggestionWords.Count, existingWords.Count);

            // If 70%+ of the shorter title's words appear in the longer one, it's similar
            if (minWords > 0 && (double)overlap / minWords >= 0.7)
                return true;
        }

        return false;
    }
}
