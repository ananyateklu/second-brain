using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Telemetry;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services;

public interface IUserPreferencesService
{
    Task<UserPreferencesResponse> GetPreferencesAsync(string userId);
    Task<UserPreferencesResponse> UpdatePreferencesAsync(string userId, UpdateUserPreferencesRequest request);

    /// <summary>
    /// Invalidates the cached preferences for a user.
    /// Call this when preferences are modified outside the normal update flow.
    /// </summary>
    Task InvalidateCacheAsync(string userId, CancellationToken cancellationToken = default);
}

public class UserPreferencesService : IUserPreferencesService
{
    private readonly IUserRepository _userRepository;
    private readonly HybridCache _cache;
    private readonly ILogger<UserPreferencesService> _logger;

    /// <summary>
    /// Cache key prefix for user preferences
    /// </summary>
    private const string CacheKeyPrefix = "user-prefs";

    /// <summary>
    /// L1 (memory) cache duration - short for responsiveness
    /// </summary>
    private static readonly TimeSpan LocalCacheExpiration = TimeSpan.FromMinutes(5);

    /// <summary>
    /// L2 (distributed) cache duration - longer for persistence
    /// </summary>
    private static readonly TimeSpan DistributedCacheExpiration = TimeSpan.FromHours(1);

    public UserPreferencesService(
        IUserRepository userRepository,
        HybridCache cache,
        ILogger<UserPreferencesService> logger)
    {
        _userRepository = userRepository;
        _cache = cache;
        _logger = logger;
    }

    public async Task<UserPreferencesResponse> GetPreferencesAsync(string userId)
    {
        var cacheKey = GetCacheKey(userId);
        var cacheHit = true;

        // HybridCache provides stampede protection - multiple concurrent requests
        // for the same user's preferences will share a single database lookup
#pragma warning disable EXTEXP0018 // HybridCache is experimental
        var response = await _cache.GetOrCreateAsync(
            cacheKey,
            async ct =>
            {
                cacheHit = false;
                _logger.LogDebug("User preferences cache miss for user {UserId}", userId);

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    throw new NotFoundException($"User with ID {userId} not found");
                }

                // Initialize preferences if they don't exist
                if (user.Preferences == null)
                {
                    user.Preferences = new UserPreferences();
                    user.UpdatedAt = DateTime.UtcNow;
                    await _userRepository.UpdateAsync(userId, user);
                    _logger.LogInformation("Initialized preferences for user {UserId}", userId);
                }

                _logger.LogDebug(
                    "Loaded preferences from database for user {UserId}. VectorStoreProvider: {VectorStoreProvider}, ChatProvider: {ChatProvider}",
                    userId,
                    user.Preferences.VectorStoreProvider,
                    user.Preferences.ChatProvider);

                return MapToResponse(user.Preferences);
            },
            new HybridCacheEntryOptions
            {
                LocalCacheExpiration = LocalCacheExpiration,
                Expiration = DistributedCacheExpiration
            });
#pragma warning restore EXTEXP0018

        // Record telemetry
        if (cacheHit)
        {
            ApplicationTelemetry.RecordCacheHit("user-preferences");
            _logger.LogDebug("User preferences cache hit for user {UserId}", userId);
        }
        else
        {
            ApplicationTelemetry.RecordCacheMiss("user-preferences");
        }

        return response;
    }

    public async Task<UserPreferencesResponse> UpdatePreferencesAsync(string userId, UpdateUserPreferencesRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new NotFoundException($"User with ID {userId} not found");
        }

        // Log incoming RAG toggle values for debugging
        _logger.LogInformation(
            "Updating preferences for user {UserId}. RAG toggles received - HyDE: {HyDE}, QueryExpansion: {QueryExpansion}, HybridSearch: {HybridSearch}, Reranking: {Reranking}, Analytics: {Analytics}",
            userId,
            request.RagEnableHyde,
            request.RagEnableQueryExpansion,
            request.RagEnableHybridSearch,
            request.RagEnableReranking,
            request.RagEnableAnalytics);

        // Initialize preferences if null
        user.Preferences ??= new UserPreferences();

        // Helper to check if a property should be cleared
        var clearSet = request.ClearProperties != null
            ? new HashSet<string>(request.ClearProperties, StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool ShouldClear(string propName) => clearSet.Contains(propName);

        // Update only provided fields (or clear if in ClearProperties)
        if (request.ChatProvider != null)
            user.Preferences.ChatProvider = request.ChatProvider;
        else if (ShouldClear("chatProvider"))
            user.Preferences.ChatProvider = null;

        if (request.ChatModel != null)
            user.Preferences.ChatModel = request.ChatModel;
        else if (ShouldClear("chatModel"))
            user.Preferences.ChatModel = null;

        if (request.VectorStoreProvider != null)
            user.Preferences.VectorStoreProvider = request.VectorStoreProvider;
        else if (ShouldClear("vectorStoreProvider"))
            user.Preferences.VectorStoreProvider = null;

        if (request.DefaultNoteView != null)
            user.Preferences.DefaultNoteView = request.DefaultNoteView;
        else if (ShouldClear("defaultNoteView"))
            user.Preferences.DefaultNoteView = null;

        if (request.ItemsPerPage.HasValue)
            user.Preferences.ItemsPerPage = request.ItemsPerPage.Value;
        else if (ShouldClear("itemsPerPage"))
            user.Preferences.ItemsPerPage = 10; // Reset to default

        if (request.FontSize != null)
            user.Preferences.FontSize = request.FontSize;
        else if (ShouldClear("fontSize"))
            user.Preferences.FontSize = null;

        if (request.MarkdownRenderer != null)
            user.Preferences.MarkdownRenderer = request.MarkdownRenderer;
        else if (ShouldClear("markdownRenderer"))
            user.Preferences.MarkdownRenderer = null;

        if (request.EnableNotifications.HasValue)
            user.Preferences.EnableNotifications = request.EnableNotifications.Value;
        else if (ShouldClear("enableNotifications"))
            user.Preferences.EnableNotifications = true; // Reset to default

        if (request.OllamaRemoteUrl != null)
            user.Preferences.OllamaRemoteUrl = request.OllamaRemoteUrl;
        else if (ShouldClear("ollamaRemoteUrl"))
            user.Preferences.OllamaRemoteUrl = null;

        if (request.UseRemoteOllama.HasValue)
            user.Preferences.UseRemoteOllama = request.UseRemoteOllama.Value;
        else if (ShouldClear("useRemoteOllama"))
            user.Preferences.UseRemoteOllama = false; // Reset to default

        if (request.RerankingProvider != null)
            user.Preferences.RerankingProvider = request.RerankingProvider;
        else if (ShouldClear("rerankingProvider"))
            user.Preferences.RerankingProvider = null;

        // Reranking Model Setting
        if (request.RagRerankingModel != null)
            user.Preferences.RagRerankingModel = request.RagRerankingModel;
        else if (ShouldClear("ragRerankingModel"))
            user.Preferences.RagRerankingModel = null;

        // Note Summary settings
        if (request.NoteSummaryEnabled.HasValue)
            user.Preferences.NoteSummaryEnabled = request.NoteSummaryEnabled.Value;
        else if (ShouldClear("noteSummaryEnabled"))
            user.Preferences.NoteSummaryEnabled = true; // Reset to default

        if (request.NoteSummaryProvider != null)
            user.Preferences.NoteSummaryProvider = request.NoteSummaryProvider;
        else if (ShouldClear("noteSummaryProvider"))
            user.Preferences.NoteSummaryProvider = null;

        if (request.NoteSummaryModel != null)
            user.Preferences.NoteSummaryModel = request.NoteSummaryModel;
        else if (ShouldClear("noteSummaryModel"))
            user.Preferences.NoteSummaryModel = null;

        // RAG Feature Toggles
        if (request.RagEnableHyde.HasValue)
            user.Preferences.RagEnableHyde = request.RagEnableHyde.Value;
        else if (ShouldClear("ragEnableHyde"))
            user.Preferences.RagEnableHyde = false; // Reset to default

        if (request.RagEnableQueryExpansion.HasValue)
            user.Preferences.RagEnableQueryExpansion = request.RagEnableQueryExpansion.Value;
        else if (ShouldClear("ragEnableQueryExpansion"))
            user.Preferences.RagEnableQueryExpansion = false;

        if (request.RagEnableHybridSearch.HasValue)
            user.Preferences.RagEnableHybridSearch = request.RagEnableHybridSearch.Value;
        else if (ShouldClear("ragEnableHybridSearch"))
            user.Preferences.RagEnableHybridSearch = true; // Reset to default

        if (request.RagEnableReranking.HasValue)
            user.Preferences.RagEnableReranking = request.RagEnableReranking.Value;
        else if (ShouldClear("ragEnableReranking"))
            user.Preferences.RagEnableReranking = false;

        if (request.RagEnableAnalytics.HasValue)
            user.Preferences.RagEnableAnalytics = request.RagEnableAnalytics.Value;
        else if (ShouldClear("ragEnableAnalytics"))
            user.Preferences.RagEnableAnalytics = true;

        // HyDE Provider Settings
        if (request.RagHydeProvider != null)
            user.Preferences.RagHydeProvider = request.RagHydeProvider;
        else if (ShouldClear("ragHydeProvider"))
            user.Preferences.RagHydeProvider = null;

        if (request.RagHydeModel != null)
            user.Preferences.RagHydeModel = request.RagHydeModel;
        else if (ShouldClear("ragHydeModel"))
            user.Preferences.RagHydeModel = null;

        // Query Expansion Provider Settings
        if (request.RagQueryExpansionProvider != null)
            user.Preferences.RagQueryExpansionProvider = request.RagQueryExpansionProvider;
        else if (ShouldClear("ragQueryExpansionProvider"))
            user.Preferences.RagQueryExpansionProvider = null;

        if (request.RagQueryExpansionModel != null)
            user.Preferences.RagQueryExpansionModel = request.RagQueryExpansionModel;
        else if (ShouldClear("ragQueryExpansionModel"))
            user.Preferences.RagQueryExpansionModel = null;

        // RAG Advanced Settings - Tier 1: Core Retrieval
        if (request.RagTopK.HasValue)
            user.Preferences.RagTopK = request.RagTopK.Value;
        else if (ShouldClear("ragTopK"))
            user.Preferences.RagTopK = 5; // Reset to default

        if (request.RagSimilarityThreshold.HasValue)
            user.Preferences.RagSimilarityThreshold = request.RagSimilarityThreshold.Value;
        else if (ShouldClear("ragSimilarityThreshold"))
            user.Preferences.RagSimilarityThreshold = 0.3f;

        if (request.RagInitialRetrievalCount.HasValue)
            user.Preferences.RagInitialRetrievalCount = request.RagInitialRetrievalCount.Value;
        else if (ShouldClear("ragInitialRetrievalCount"))
            user.Preferences.RagInitialRetrievalCount = 20;

        if (request.RagMinRerankScore.HasValue)
            user.Preferences.RagMinRerankScore = request.RagMinRerankScore.Value;
        else if (ShouldClear("ragMinRerankScore"))
            user.Preferences.RagMinRerankScore = 0.0f;

        // RAG Advanced Settings - Tier 2: Hybrid Search
        if (request.RagVectorWeight.HasValue)
            user.Preferences.RagVectorWeight = request.RagVectorWeight.Value;
        else if (ShouldClear("ragVectorWeight"))
            user.Preferences.RagVectorWeight = 0.7f;

        if (request.RagBm25Weight.HasValue)
            user.Preferences.RagBm25Weight = request.RagBm25Weight.Value;
        else if (ShouldClear("ragBm25Weight"))
            user.Preferences.RagBm25Weight = 0.3f;

        if (request.RagMultiQueryCount.HasValue)
            user.Preferences.RagMultiQueryCount = request.RagMultiQueryCount.Value;
        else if (ShouldClear("ragMultiQueryCount"))
            user.Preferences.RagMultiQueryCount = 3;

        if (request.RagMaxContextLength.HasValue)
            user.Preferences.RagMaxContextLength = request.RagMaxContextLength.Value;
        else if (ShouldClear("ragMaxContextLength"))
            user.Preferences.RagMaxContextLength = 4000;

        // RAG Embedding Settings
        if (request.RagEmbeddingProvider != null)
            user.Preferences.RagEmbeddingProvider = request.RagEmbeddingProvider;
        else if (ShouldClear("ragEmbeddingProvider"))
            user.Preferences.RagEmbeddingProvider = null;

        if (request.RagEmbeddingModel != null)
            user.Preferences.RagEmbeddingModel = request.RagEmbeddingModel;
        else if (ShouldClear("ragEmbeddingModel"))
            user.Preferences.RagEmbeddingModel = null;

        if (request.RagEmbeddingDimensions.HasValue)
            user.Preferences.RagEmbeddingDimensions = request.RagEmbeddingDimensions.Value;
        else if (ShouldClear("ragEmbeddingDimensions"))
            user.Preferences.RagEmbeddingDimensions = 1536;

        user.UpdatedAt = DateTime.UtcNow;

        var updatedUser = await _userRepository.UpdateAsync(userId, user);
        if (updatedUser == null)
        {
            throw new Exception("Failed to update user preferences");
        }

        _logger.LogInformation(
            "Updated preferences for user {UserId}. VectorStoreProvider: {VectorStoreProvider}, ChatProvider: {ChatProvider}, ChatModel: {ChatModel}",
            userId,
            updatedUser.Preferences?.VectorStoreProvider,
            updatedUser.Preferences?.ChatProvider,
            updatedUser.Preferences?.ChatModel);

        // Log the RAG toggle values in the response
        _logger.LogDebug(
            "RAG toggles after update for user {UserId} - HyDE: {HyDE}, QueryExpansion: {QueryExpansion}, HybridSearch: {HybridSearch}, Reranking: {Reranking}, Analytics: {Analytics}",
            userId,
            updatedUser.Preferences?.RagEnableHyde,
            updatedUser.Preferences?.RagEnableQueryExpansion,
            updatedUser.Preferences?.RagEnableHybridSearch,
            updatedUser.Preferences?.RagEnableReranking,
            updatedUser.Preferences?.RagEnableAnalytics);

        // Invalidate cache after successful update
        await InvalidateCacheAsync(userId);

        // Cache the updated response immediately (write-through pattern)
        var response = MapToResponse(updatedUser.Preferences);
        var cacheKey = GetCacheKey(userId);

#pragma warning disable EXTEXP0018 // HybridCache is experimental
        await _cache.SetAsync(
            cacheKey,
            response,
            new HybridCacheEntryOptions
            {
                LocalCacheExpiration = LocalCacheExpiration,
                Expiration = DistributedCacheExpiration
            });
#pragma warning restore EXTEXP0018

        _logger.LogDebug("Updated and cached preferences for user {UserId}", userId);

        return response;
    }

    /// <inheritdoc />
    public async Task InvalidateCacheAsync(string userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(userId);

#pragma warning disable EXTEXP0018 // HybridCache is experimental
        await _cache.RemoveAsync(cacheKey, cancellationToken);
#pragma warning restore EXTEXP0018

        _logger.LogDebug("Invalidated preferences cache for user {UserId}", userId);
    }

    /// <summary>
    /// Generates a cache key for user preferences.
    /// </summary>
    private static string GetCacheKey(string userId) => $"{CacheKeyPrefix}:{userId}";

    private static UserPreferencesResponse MapToResponse(UserPreferences? preferences)
    {
        // Always return defaults if preferences is null
        preferences ??= new UserPreferences();

        return new UserPreferencesResponse
        {
            ChatProvider = preferences.ChatProvider,
            ChatModel = preferences.ChatModel,
            VectorStoreProvider = preferences.VectorStoreProvider,
            DefaultNoteView = preferences.DefaultNoteView,
            ItemsPerPage = preferences.ItemsPerPage,
            FontSize = preferences.FontSize,
            MarkdownRenderer = preferences.MarkdownRenderer,
            EnableNotifications = preferences.EnableNotifications,
            OllamaRemoteUrl = preferences.OllamaRemoteUrl,
            UseRemoteOllama = preferences.UseRemoteOllama,
            RerankingProvider = preferences.RerankingProvider,
            // Reranking Model Setting
            RagRerankingModel = preferences.RagRerankingModel,
            NoteSummaryEnabled = preferences.NoteSummaryEnabled,
            NoteSummaryProvider = preferences.NoteSummaryProvider,
            NoteSummaryModel = preferences.NoteSummaryModel,
            // RAG Feature Toggles
            RagEnableHyde = preferences.RagEnableHyde,
            RagEnableQueryExpansion = preferences.RagEnableQueryExpansion,
            RagEnableHybridSearch = preferences.RagEnableHybridSearch,
            RagEnableReranking = preferences.RagEnableReranking,
            RagEnableAnalytics = preferences.RagEnableAnalytics,
            // HyDE Provider Settings
            RagHydeProvider = preferences.RagHydeProvider,
            RagHydeModel = preferences.RagHydeModel,
            // Query Expansion Provider Settings
            RagQueryExpansionProvider = preferences.RagQueryExpansionProvider,
            RagQueryExpansionModel = preferences.RagQueryExpansionModel,
            // RAG Advanced Settings - Tier 1: Core Retrieval
            RagTopK = preferences.RagTopK,
            RagSimilarityThreshold = preferences.RagSimilarityThreshold,
            RagInitialRetrievalCount = preferences.RagInitialRetrievalCount,
            RagMinRerankScore = preferences.RagMinRerankScore,
            // RAG Advanced Settings - Tier 2: Hybrid Search
            RagVectorWeight = preferences.RagVectorWeight,
            RagBm25Weight = preferences.RagBm25Weight,
            RagMultiQueryCount = preferences.RagMultiQueryCount,
            RagMaxContextLength = preferences.RagMaxContextLength,
            // RAG Embedding Settings
            RagEmbeddingProvider = preferences.RagEmbeddingProvider,
            RagEmbeddingModel = preferences.RagEmbeddingModel,
            RagEmbeddingDimensions = preferences.RagEmbeddingDimensions
        };
    }
}

