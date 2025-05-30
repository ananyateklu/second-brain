using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading.Tasks;
using SecondBrain.Data;
using SecondBrain.Data.Entities;

namespace SecondBrain.Api.Services
{
    public class ActivityLogger : IActivityLogger
    {
        private readonly DataContext _context;
        private readonly ILogger<ActivityLogger> _logger;

        public ActivityLogger(DataContext context, ILogger<ActivityLogger> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task LogActivityAsync(
            string userId,
            string actionType,
            string itemType,
            string itemId,
            string itemTitle,
            string description,
            object? metadata = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentNullException(nameof(userId), "User ID cannot be null or empty.");
            }

            if (string.IsNullOrEmpty(actionType))
            {
                throw new ArgumentException("Action type cannot be null or empty.", nameof(actionType));
            }

            if (string.IsNullOrEmpty(itemType))
            {
                throw new ArgumentException("Item type cannot be null or empty.", nameof(itemType));
            }

            if (string.IsNullOrEmpty(itemId))
            {
                throw new ArgumentException("Item ID cannot be null or empty.", nameof(itemId));
            }

            if (string.IsNullOrEmpty(itemTitle))
            {
                throw new ArgumentException("Item title cannot be null or empty.", nameof(itemTitle));
            }

            if (string.IsNullOrEmpty(description))
            {
                throw new ArgumentException("Description cannot be null or empty.", nameof(description));
            }

            try
            {
                var activity = new Activity
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = userId,
                    ActionType = actionType,
                    ItemType = itemType,
                    ItemId = itemId,
                    ItemTitle = itemTitle,
                    Description = description,
                    MetadataJson = metadata != null ? JsonSerializer.Serialize(metadata) : null!,
                    Timestamp = DateTime.UtcNow
                };

                await _context.Activities.AddAsync(activity);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log activity");
                // Don't throw - we don't want activity logging to break the main operation
            }
        }
    }
}