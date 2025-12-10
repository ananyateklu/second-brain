using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services;

public interface IUserPreferencesService
{
    Task<UserPreferencesResponse> GetPreferencesAsync(string userId);
    Task<UserPreferencesResponse> UpdatePreferencesAsync(string userId, UpdateUserPreferencesRequest request);
}

public class UserPreferencesService : IUserPreferencesService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserPreferencesService> _logger;

    public UserPreferencesService(
        IUserRepository userRepository,
        ILogger<UserPreferencesService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<UserPreferencesResponse> GetPreferencesAsync(string userId)
    {
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

        _logger.LogInformation(
            "Retrieved preferences for user {UserId}. VectorStoreProvider: {VectorStoreProvider}, ChatProvider: {ChatProvider}, ChatModel: {ChatModel}",
            userId,
            user.Preferences.VectorStoreProvider,
            user.Preferences.ChatProvider,
            user.Preferences.ChatModel);

        // Log RAG toggle values for debugging
        _logger.LogInformation(
            "RAG toggles for user {UserId} - HyDE: {HyDE}, QueryExpansion: {QueryExpansion}, HybridSearch: {HybridSearch}, Reranking: {Reranking}, Analytics: {Analytics}",
            userId,
            user.Preferences.RagEnableHyde,
            user.Preferences.RagEnableQueryExpansion,
            user.Preferences.RagEnableHybridSearch,
            user.Preferences.RagEnableReranking,
            user.Preferences.RagEnableAnalytics);

        return MapToResponse(user.Preferences);
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

        // Update only provided fields
        if (request.ChatProvider != null)
            user.Preferences.ChatProvider = request.ChatProvider;

        if (request.ChatModel != null)
            user.Preferences.ChatModel = request.ChatModel;

        if (request.VectorStoreProvider != null)
            user.Preferences.VectorStoreProvider = request.VectorStoreProvider;

        if (request.DefaultNoteView != null)
            user.Preferences.DefaultNoteView = request.DefaultNoteView;

        if (request.ItemsPerPage.HasValue)
            user.Preferences.ItemsPerPage = request.ItemsPerPage.Value;

        if (request.FontSize != null)
            user.Preferences.FontSize = request.FontSize;

        if (request.EnableNotifications.HasValue)
            user.Preferences.EnableNotifications = request.EnableNotifications.Value;

        if (request.OllamaRemoteUrl != null)
            user.Preferences.OllamaRemoteUrl = request.OllamaRemoteUrl;

        if (request.UseRemoteOllama.HasValue)
            user.Preferences.UseRemoteOllama = request.UseRemoteOllama.Value;

        if (request.RerankingProvider != null)
            user.Preferences.RerankingProvider = request.RerankingProvider;

        // Note Summary settings
        if (request.NoteSummaryEnabled.HasValue)
            user.Preferences.NoteSummaryEnabled = request.NoteSummaryEnabled.Value;

        if (request.NoteSummaryProvider != null)
            user.Preferences.NoteSummaryProvider = request.NoteSummaryProvider;

        if (request.NoteSummaryModel != null)
            user.Preferences.NoteSummaryModel = request.NoteSummaryModel;

        // RAG Feature Toggles
        if (request.RagEnableHyde.HasValue)
            user.Preferences.RagEnableHyde = request.RagEnableHyde.Value;

        if (request.RagEnableQueryExpansion.HasValue)
            user.Preferences.RagEnableQueryExpansion = request.RagEnableQueryExpansion.Value;

        if (request.RagEnableHybridSearch.HasValue)
            user.Preferences.RagEnableHybridSearch = request.RagEnableHybridSearch.Value;

        if (request.RagEnableReranking.HasValue)
            user.Preferences.RagEnableReranking = request.RagEnableReranking.Value;

        if (request.RagEnableAnalytics.HasValue)
            user.Preferences.RagEnableAnalytics = request.RagEnableAnalytics.Value;

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
        _logger.LogInformation(
            "RAG toggles after update for user {UserId} - HyDE: {HyDE}, QueryExpansion: {QueryExpansion}, HybridSearch: {HybridSearch}, Reranking: {Reranking}, Analytics: {Analytics}",
            userId,
            updatedUser.Preferences?.RagEnableHyde,
            updatedUser.Preferences?.RagEnableQueryExpansion,
            updatedUser.Preferences?.RagEnableHybridSearch,
            updatedUser.Preferences?.RagEnableReranking,
            updatedUser.Preferences?.RagEnableAnalytics);

        return MapToResponse(updatedUser.Preferences);
    }

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
            EnableNotifications = preferences.EnableNotifications,
            OllamaRemoteUrl = preferences.OllamaRemoteUrl,
            UseRemoteOllama = preferences.UseRemoteOllama,
            RerankingProvider = preferences.RerankingProvider,
            NoteSummaryEnabled = preferences.NoteSummaryEnabled,
            NoteSummaryProvider = preferences.NoteSummaryProvider,
            NoteSummaryModel = preferences.NoteSummaryModel,
            // RAG Feature Toggles
            RagEnableHyde = preferences.RagEnableHyde,
            RagEnableQueryExpansion = preferences.RagEnableQueryExpansion,
            RagEnableHybridSearch = preferences.RagEnableHybridSearch,
            RagEnableReranking = preferences.RagEnableReranking,
            RagEnableAnalytics = preferences.RagEnableAnalytics
        };
    }
}

