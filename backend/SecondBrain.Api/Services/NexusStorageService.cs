using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.DTOs.Nexus;
using SecondBrain.Data;
using SecondBrain.Data.Entities;

namespace SecondBrain.Api.Services
{
    public class NexusStorageService : INexusStorageService
    {
        private readonly DataContext _context;
        private readonly ILogger<NexusStorageService> _logger;

        public NexusStorageService(DataContext context, ILogger<NexusStorageService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<NexusStorageItem> GetItemAsync(string key)
        {
            var item = await _context.NexusStorage
                .FirstOrDefaultAsync(x => x.Key == key);

            if (item == null)
            {
                throw new KeyNotFoundException($"Item with key '{key}' not found.");
            }

            return new NexusStorageItem
            {
                Id = item.Id,
                Key = item.Key,
                Value = item.Value,
                DataType = item.DataType,
                Tags = item.Tags,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };
        }

        public async Task<IEnumerable<NexusStorageItem>> SearchByTagsAsync(string tags)
        {
            var tagArray = tags.Split(',').Select(t => t.Trim().ToLower());
            
            var items = await _context.NexusStorage
                .Where(x => tagArray.All(tag => x.Tags.ToLower().Contains(tag)))
                .Select(x => new NexusStorageItem
                {
                    Id = x.Id,
                    Key = x.Key,
                    Value = x.Value,
                    DataType = x.DataType,
                    Tags = x.Tags,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                })
                .ToListAsync();

            return items;
        }

        public async Task<NexusStorageItem> StoreItemAsync(NexusStorageItem item)
        {
            var entity = new Data.Entities.NexusStorage
            {
                Key = item.Key,
                Value = item.Value,
                DataType = item.DataType,
                Tags = item.Tags,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.NexusStorage.Add(entity);
            await _context.SaveChangesAsync();

            item.Id = entity.Id;
            item.CreatedAt = entity.CreatedAt;
            item.UpdatedAt = entity.UpdatedAt;

            return item;
        }

        public async Task<bool> DeleteItemAsync(string key)
        {
            var item = await _context.NexusStorage
                .FirstOrDefaultAsync(x => x.Key == key);

            if (item == null)
            {
                return false;
            }

            _context.NexusStorage.Remove(item);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<NexusStorageItem> UpdateItemAsync(string key, string value)
        {
            var item = await _context.NexusStorage
                .FirstOrDefaultAsync(x => x.Key == key);

            if (item == null)
            {
                throw new KeyNotFoundException($"Item with key '{key}' not found.");
            }

            item.Value = value;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new NexusStorageItem
            {
                Id = item.Id,
                Key = item.Key,
                Value = item.Value,
                DataType = item.DataType,
                Tags = item.Tags,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };
        }
    }
} 