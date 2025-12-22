using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlUserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlUserRepository> _logger;

    public SqlUserRepository(ApplicationDbContext context, ILogger<SqlUserRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving user by ID. UserId: {UserId}", id);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogDebug("User not found. UserId: {UserId}", id);
                return null;
            }

            _logger.LogDebug("User retrieved successfully. UserId: {UserId}", id);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by ID. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to retrieve user with ID '{id}'", ex);
        }
    }

    public async Task<User?> GetByApiKeyAsync(string apiKey)
    {
        try
        {
            _logger.LogDebug("Retrieving user by API key");
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.ApiKey == apiKey);

            if (user == null)
            {
                _logger.LogDebug("User not found by API key");
                return null;
            }

            _logger.LogDebug("User retrieved by API key. UserId: {UserId}", user.Id);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by API key");
            throw new RepositoryException("Failed to retrieve user by API key", ex);
        }
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        try
        {
            _logger.LogDebug("Retrieving user by email. Email: {Email}", email);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                _logger.LogDebug("User not found by email. Email: {Email}", email);
                return null;
            }

            _logger.LogDebug("User retrieved by email. UserId: {UserId}, Email: {Email}", user.Id, email);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by email. Email: {Email}", email);
            throw new RepositoryException($"Failed to retrieve user with email '{email}'", ex);
        }
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        try
        {
            _logger.LogDebug("Retrieving user by username. Username: {Username}", username);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == username.ToLower());

            if (user == null)
            {
                _logger.LogDebug("User not found by username. Username: {Username}", username);
                return null;
            }

            _logger.LogDebug("User retrieved by username. UserId: {UserId}, Username: {Username}", user.Id, username);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by username. Username: {Username}", username);
            throw new RepositoryException($"Failed to retrieve user with username '{username}'", ex);
        }
    }

    public async Task<User> CreateAsync(User user)
    {
        try
        {
            _logger.LogDebug("Creating new user. Email: {Email}", user.Email);

            if (string.IsNullOrWhiteSpace(user.Id))
            {
                user.Id = UuidV7.NewId();
            }

            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            // If preferences exist, set the ID and UserId
            if (user.Preferences != null)
            {
                if (string.IsNullOrWhiteSpace(user.Preferences.Id))
                {
                    user.Preferences.Id = UuidV7.NewId();
                }
                user.Preferences.UserId = user.Id;
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User created successfully. UserId: {UserId}, Email: {Email}", user.Id, user.Email);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user. Email: {Email}", user.Email);
            throw new RepositoryException("Failed to create user", ex);
        }
    }

    public async Task<User?> UpdateAsync(string id, User user)
    {
        try
        {
            _logger.LogDebug("Updating user. UserId: {UserId}", id);
            var existingUser = await _context.Users
                .Include(u => u.Preferences)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (existingUser == null)
            {
                _logger.LogDebug("User not found for update. UserId: {UserId}", id);
                return null;
            }

            // Update basic properties
            existingUser.Email = user.Email;
            existingUser.Username = user.Username;
            existingUser.DisplayName = user.DisplayName;
            existingUser.ApiKey = user.ApiKey;
            existingUser.PasswordHash = user.PasswordHash;
            existingUser.IsActive = user.IsActive;
            existingUser.UpdatedAt = DateTime.UtcNow;

            // Update preferences
            if (user.Preferences != null)
            {
                if (existingUser.Preferences == null)
                {
                    // Create new preferences
                    user.Preferences.Id = UuidV7.NewId();
                    user.Preferences.UserId = id;
                    existingUser.Preferences = user.Preferences;
                }
                else
                {
                    // Update existing preferences
                    existingUser.Preferences.ChatProvider = user.Preferences.ChatProvider;
                    existingUser.Preferences.ChatModel = user.Preferences.ChatModel;
                    existingUser.Preferences.VectorStoreProvider = user.Preferences.VectorStoreProvider;
                    existingUser.Preferences.DefaultNoteView = user.Preferences.DefaultNoteView;
                    existingUser.Preferences.ItemsPerPage = user.Preferences.ItemsPerPage;
                    existingUser.Preferences.FontSize = user.Preferences.FontSize;
                    existingUser.Preferences.EnableNotifications = user.Preferences.EnableNotifications;
                    existingUser.Preferences.OllamaRemoteUrl = user.Preferences.OllamaRemoteUrl;
                    existingUser.Preferences.UseRemoteOllama = user.Preferences.UseRemoteOllama;
                    existingUser.Preferences.RerankingProvider = user.Preferences.RerankingProvider;
                    existingUser.Preferences.NoteSummaryEnabled = user.Preferences.NoteSummaryEnabled;
                    existingUser.Preferences.NoteSummaryProvider = user.Preferences.NoteSummaryProvider;
                    existingUser.Preferences.NoteSummaryModel = user.Preferences.NoteSummaryModel;

                    // RAG Feature Toggles
                    existingUser.Preferences.RagEnableHyde = user.Preferences.RagEnableHyde;
                    existingUser.Preferences.RagEnableQueryExpansion = user.Preferences.RagEnableQueryExpansion;
                    existingUser.Preferences.RagEnableHybridSearch = user.Preferences.RagEnableHybridSearch;
                    existingUser.Preferences.RagEnableReranking = user.Preferences.RagEnableReranking;
                    existingUser.Preferences.RagEnableAnalytics = user.Preferences.RagEnableAnalytics;

                    // RAG Advanced Settings - Tier 1: Core Retrieval
                    existingUser.Preferences.RagTopK = user.Preferences.RagTopK;
                    existingUser.Preferences.RagSimilarityThreshold = user.Preferences.RagSimilarityThreshold;
                    existingUser.Preferences.RagInitialRetrievalCount = user.Preferences.RagInitialRetrievalCount;
                    existingUser.Preferences.RagMinRerankScore = user.Preferences.RagMinRerankScore;

                    // RAG Advanced Settings - Tier 2: Hybrid Search
                    existingUser.Preferences.RagVectorWeight = user.Preferences.RagVectorWeight;
                    existingUser.Preferences.RagBm25Weight = user.Preferences.RagBm25Weight;
                    existingUser.Preferences.RagMultiQueryCount = user.Preferences.RagMultiQueryCount;
                    existingUser.Preferences.RagMaxContextLength = user.Preferences.RagMaxContextLength;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "User updated successfully. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}",
                id,
                existingUser.Preferences?.VectorStoreProvider);

            return existingUser;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to update user with ID '{id}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting user. UserId: {UserId}", id);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogDebug("User not found for deletion. UserId: {UserId}", id);
                return false;
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User deleted successfully. UserId: {UserId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to delete user with ID '{id}'", ex);
        }
    }

    public async Task<string?> ResolveUserIdByApiKeyAsync(string apiKey)
    {
        try
        {
            _logger.LogDebug("Resolving user ID by API key");
            var user = await _context.Users
                .AsNoTracking()
                .Where(u => u.ApiKey == apiKey && u.IsActive)
                .Select(u => new { u.Id })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                _logger.LogDebug("No active user found for API key");
                return null;
            }

            _logger.LogDebug("User ID resolved by API key. UserId: {UserId}", user.Id);
            return user.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving user ID by API key");
            throw new RepositoryException("Failed to resolve user by API key", ex);
        }
    }
}

