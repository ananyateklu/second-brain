using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.DTOs.Preferences;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PreferencesController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<PreferencesController> _logger;
        private const string USER_ID_NOT_FOUND_ERROR = "User ID not found in token.";
        private const string PREFERENCE_NOT_FOUND_ERROR = "Preference not found.";

        public PreferencesController(DataContext context, ILogger<PreferencesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPreferences()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims when getting all preferences");
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            try
            {
                var preferences = await _context.UserPreferences
                    .Where(up => up.UserId == userId)
                    .Select(up => new UserPreferenceDto
                    {
                        Id = up.Id,
                        PreferenceType = up.PreferenceType,
                        Value = up.Value,
                        CreatedAt = up.CreatedAt,
                        UpdatedAt = up.UpdatedAt
                    })
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} preferences for user {UserId}", preferences.Count, userId);
                return Ok(preferences);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving preferences for user {UserId}", userId);
                return StatusCode(500, new { error = "An error occurred while retrieving preferences." });
            }
        }

        [HttpGet("{preferenceType}")]
        public async Task<IActionResult> GetPreferenceByType(string preferenceType)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims when getting preference of type {PreferenceType}", preferenceType);
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            try
            {
                var preference = await _context.UserPreferences
                    .FirstOrDefaultAsync(up => up.UserId == userId && up.PreferenceType == preferenceType);

                if (preference == null)
                {
                    _logger.LogInformation("Preference of type {PreferenceType} not found for user {UserId}", preferenceType, userId);
                    return NotFound(new { error = PREFERENCE_NOT_FOUND_ERROR, message = $"Preference of type '{preferenceType}' not found." });
                }

                var preferenceDto = new UserPreferenceDto
                {
                    Id = preference.Id,
                    PreferenceType = preference.PreferenceType,
                    Value = preference.Value,
                    CreatedAt = preference.CreatedAt,
                    UpdatedAt = preference.UpdatedAt
                };

                return Ok(preferenceDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving preference of type {PreferenceType} for user {UserId}", preferenceType, userId);
                return StatusCode(500, new { error = "An error occurred while retrieving the preference." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SavePreference([FromBody] SaveUserPreferenceRequest request)
        {
            if (request == null)
            {
                _logger.LogWarning("Save preference request body is null");
                return BadRequest(new { error = "Request body cannot be null." });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims when saving preference of type {PreferenceType}", request.PreferenceType);
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            try
            {
                // Check if preference already exists
                var existingPreference = await _context.UserPreferences
                    .FirstOrDefaultAsync(up => up.UserId == userId && up.PreferenceType == request.PreferenceType);

                if (existingPreference != null)
                {
                    // Update existing preference
                    existingPreference.Value = request.Value;
                    existingPreference.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Updated preference of type {PreferenceType} for user {UserId}", request.PreferenceType, userId);

                    var updatedDto = new UserPreferenceDto
                    {
                        Id = existingPreference.Id,
                        PreferenceType = existingPreference.PreferenceType,
                        Value = existingPreference.Value,
                        CreatedAt = existingPreference.CreatedAt,
                        UpdatedAt = existingPreference.UpdatedAt
                    };

                    return Ok(updatedDto);
                }
                else
                {
                    // Create new preference
                    var newPreference = new UserPreference
                    {
                        UserId = userId,
                        PreferenceType = request.PreferenceType,
                        Value = request.Value,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.UserPreferences.Add(newPreference);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Created new preference of type {PreferenceType} for user {UserId}", request.PreferenceType, userId);

                    var newDto = new UserPreferenceDto
                    {
                        Id = newPreference.Id,
                        PreferenceType = newPreference.PreferenceType,
                        Value = newPreference.Value,
                        CreatedAt = newPreference.CreatedAt,
                        UpdatedAt = newPreference.UpdatedAt
                    };

                    return Created($"/api/preferences/{newPreference.PreferenceType}", newDto);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving preference of type {PreferenceType} for user {UserId}", request.PreferenceType, userId);
                return StatusCode(500, new { error = "An error occurred while saving the preference." });
            }
        }

        [HttpPut("{preferenceType}")]
        public async Task<IActionResult> UpdatePreference(string preferenceType, [FromBody] UpdateUserPreferenceRequest request)
        {
            if (request == null)
            {
                _logger.LogWarning("Update preference request body is null for type {PreferenceType}", preferenceType);
                return BadRequest(new { error = "Request body cannot be null." });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims when updating preference of type {PreferenceType}", preferenceType);
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            try
            {
                var preference = await _context.UserPreferences
                    .FirstOrDefaultAsync(up => up.UserId == userId && up.PreferenceType == preferenceType);

                if (preference == null)
                {
                    _logger.LogInformation("Preference of type {PreferenceType} not found for update for user {UserId}", preferenceType, userId);
                    return NotFound(new { error = PREFERENCE_NOT_FOUND_ERROR, message = $"Preference of type '{preferenceType}' not found." });
                }

                preference.Value = request.Value;
                preference.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated preference of type {PreferenceType} for user {UserId}", preferenceType, userId);

                var preferenceDto = new UserPreferenceDto
                {
                    Id = preference.Id,
                    PreferenceType = preference.PreferenceType,
                    Value = preference.Value,
                    CreatedAt = preference.CreatedAt,
                    UpdatedAt = preference.UpdatedAt
                };

                return Ok(preferenceDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating preference of type {PreferenceType} for user {UserId}", preferenceType, userId);
                return StatusCode(500, new { error = "An error occurred while updating the preference." });
            }
        }

        [HttpDelete("{preferenceType}")]
        public async Task<IActionResult> DeletePreference(string preferenceType)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims when deleting preference of type {PreferenceType}", preferenceType);
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            try
            {
                var preference = await _context.UserPreferences
                    .FirstOrDefaultAsync(up => up.UserId == userId && up.PreferenceType == preferenceType);

                if (preference == null)
                {
                    _logger.LogInformation("Preference of type {PreferenceType} not found for deletion for user {UserId}", preferenceType, userId);
                    return NotFound(new { error = PREFERENCE_NOT_FOUND_ERROR, message = $"Preference of type '{preferenceType}' not found." });
                }

                _context.UserPreferences.Remove(preference);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted preference of type {PreferenceType} for user {UserId}", preferenceType, userId);

                return Ok(new { message = "Preference deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting preference of type {PreferenceType} for user {UserId}", preferenceType, userId);
                return StatusCode(500, new { error = "An error occurred while deleting the preference." });
            }
        }
    }
} 