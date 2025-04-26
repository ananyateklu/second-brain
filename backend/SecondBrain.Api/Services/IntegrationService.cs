using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Integrations;
using SecondBrain.Api.Services.Interfaces;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace SecondBrain.Api.Services
{
    // Provides services for managing third-party integration credentials.
    public class IntegrationService : IIntegrationService
    {
        private readonly DataContext _context;
        private readonly ILogger<IntegrationService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        // TODO: Inject data protection provider for encryption
        // private readonly IDataProtector _protector;

        public IntegrationService(
            DataContext context, 
            ILogger<IntegrationService> logger, 
            IHttpClientFactory httpClientFactory /*, IDataProtectionProvider protectionProvider */)
        {
            _context = context;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            // TODO: Create a specific protector for integration tokens
            // _protector = protectionProvider.CreateProtector("SecondBrain.IntegrationTokens.v1");
        }

        public async Task<bool> SaveTickTickCredentialsAsync(string userId, TickTickTokenResponse tokenResponse)
        {
            if (string.IsNullOrEmpty(userId) || tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
            {
                _logger.LogWarning("Attempted to save invalid TickTick credentials for user {UserId}", userId);
                return false;
            }

            try
            {
                _logger.LogInformation("Attempting to save TickTick credentials for user {UserId}", userId);
                
                var existingCredential = await _context.UserIntegrationCredentials
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Provider == "TickTick");

                // IMPORTANT: Encrypt tokens before storing
                // var encryptedAccessToken = _protector.Protect(tokenResponse.AccessToken);
                // var encryptedRefreshToken = tokenResponse.RefreshToken != null ? _protector.Protect(tokenResponse.RefreshToken) : null;
                var accessTokenToStore = tokenResponse.AccessToken; // Replace with encryptedAccessToken
                var refreshTokenToStore = tokenResponse.RefreshToken ?? string.Empty; // Replace with encryptedRefreshToken and ensure not null

                if (existingCredential != null)
                {
                    _logger.LogInformation("Updating existing TickTick credentials for user {UserId}", userId);
                    existingCredential.AccessToken = accessTokenToStore;
                    existingCredential.RefreshToken = refreshTokenToStore;
                    existingCredential.ExpiresAt = tokenResponse.ExpiresAt;
                    existingCredential.Scope = tokenResponse.Scope;
                    existingCredential.TokenType = tokenResponse.TokenType;
                    existingCredential.UpdatedAt = DateTime.UtcNow;
                    _context.UserIntegrationCredentials.Update(existingCredential);
                }
                else
                {
                    _logger.LogInformation("Creating new TickTick credentials for user {UserId}", userId);
                    
                    // Log full user ID details for debugging
                    _logger.LogInformation("User ID details - Length: {Length}, Value: {UserId}", 
                        userId.Length, userId);
                    
                    var newCredential = new UserIntegrationCredential
                    {
                        UserId = userId,
                        Provider = "TickTick",
                        AccessToken = accessTokenToStore,
                        RefreshToken = refreshTokenToStore,
                        ExpiresAt = tokenResponse.ExpiresAt,
                        Scope = tokenResponse.Scope,
                        TokenType = tokenResponse.TokenType,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _context.UserIntegrationCredentials.AddAsync(newCredential);
                }

                var result = await _context.SaveChangesAsync();
                _logger.LogInformation("Saved TickTick credentials for user {UserId} with {Count} database changes", userId, result);
                
                // Double-check the credentials were saved
                var verification = await _context.UserIntegrationCredentials
                    .AnyAsync(c => c.UserId == userId && c.Provider == "TickTick");
                _logger.LogInformation("Verification after save for user {UserId}: Credentials exist = {Exists}", userId, verification);
                
                return true;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error occurred while saving TickTick credentials for user {UserId}", userId);
                return false;
            }
            catch (Exception ex)
            {
                // TODO: Catch specific data protection exceptions if encryption is implemented
                _logger.LogError(ex, "Unexpected error occurred while saving TickTick credentials for user {UserId}", userId);
                return false;
            }
        }

        public async Task<bool> DeleteTickTickCredentialsAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to delete TickTick credentials with invalid UserId.");
                return false;
            }

            try
            {
                var credential = await _context.UserIntegrationCredentials
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Provider == "TickTick");

                if (credential == null)
                {
                    _logger.LogInformation("No TickTick credentials found to delete for user {UserId}", userId);
                    return true; // Or false if you want to indicate nothing was deleted
                }

                _context.UserIntegrationCredentials.Remove(credential);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Successfully deleted TickTick credentials for user {UserId}", userId);
                return true;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error occurred while deleting TickTick credentials for user {UserId}", userId);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while deleting TickTick credentials for user {UserId}", userId);
                return false;
            }
        }

        public async Task<UserIntegrationCredential?> GetTickTickCredentialsAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to retrieve TickTick credentials with invalid UserId.");
                return null;
            }

            try
            {
                // IMPORTANT: Decrypt tokens after retrieving if they were encrypted
                _logger.LogInformation("Looking for TickTick credentials for user {UserId}", userId);
                
                var credentialsCount = await _context.UserIntegrationCredentials
                    .CountAsync(c => c.UserId == userId);
                _logger.LogInformation("Found {Count} total integration credentials for user {UserId}", credentialsCount, userId);
                
                // Use parameterized query to avoid SQL injection and handle parameter type safely
                var credentials = await _context.UserIntegrationCredentials
                    .FromSqlRaw("SELECT * FROM UserIntegrationCredentials WHERE UserId = @userId AND Provider = @provider",
                        new SqlParameter("@userId", userId),
                        new SqlParameter("@provider", "TickTick"))
                    .AsNoTracking()
                    .FirstOrDefaultAsync();

                if (credentials == null)
                {
                    _logger.LogWarning("No TickTick credentials found for user {UserId}", userId);
                    return null;
                }

                _logger.LogInformation("Successfully found TickTick credentials for user {UserId} (created at {CreatedAt})", 
                    userId, credentials.CreatedAt);
                
                return credentials;
            }
            catch (Exception ex)
            {
                // TODO: Catch specific data protection exceptions if decryption is implemented
                _logger.LogError(ex, "Error occurred while retrieving TickTick credentials for user {UserId}", userId);
                return null;
            }
        }

        // TODO: Implement RefreshTickTickTokenAsync later
        // private async Task<string?> RefreshTickTickTokenInternalAsync(UserIntegrationCredential credential)
        // { ... logic to call TickTick refresh endpoint, update DB, return new access token ... }
    }
} 