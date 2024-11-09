using SecondBrain.Api.DTOs.Nexus;

namespace SecondBrain.Api.Services
{
    public interface INexusStorageService
    {
        Task<NexusStorageItem> GetItemAsync(string key);
        Task<IEnumerable<NexusStorageItem>> SearchByTagsAsync(string tags);
        Task<NexusStorageItem> StoreItemAsync(NexusStorageItem item);
        Task<bool> DeleteItemAsync(string key);
        Task<NexusStorageItem> UpdateItemAsync(string key, string value);
    }
} 