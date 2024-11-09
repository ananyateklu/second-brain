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
                    MetadataJson = metadata != null ? JsonSerializer.Serialize(metadata) : null,
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