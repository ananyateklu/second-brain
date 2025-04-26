using System.Threading.Tasks;
using SecondBrain.Api.Models.Integrations; // Assuming DTOs are here
using SecondBrain.Data.Entities; // Add this using

namespace SecondBrain.Api.Services.Interfaces
{
    // Defines operations related to managing third-party integration credentials.
    public interface IIntegrationService
    {
        // Saves or updates TickTick credentials for a given user.
        Task<bool> SaveTickTickCredentialsAsync(string userId, TickTickTokenResponse tokenResponse);

        // Retrieves TickTick credentials for a given user.
        Task<UserIntegrationCredential?> GetTickTickCredentialsAsync(string userId);

        // Removes TickTick credentials for a given user.
        Task<bool> DeleteTickTickCredentialsAsync(string userId);

        // Initiates a two-way synchronization between local tasks and TickTick tasks.
        Task<bool> SyncTickTickTasksAsync(string userId, string? tickTickProjectId);

        // Method to handle refreshing the token if necessary (implement later)
        // Task<string?> RefreshTickTickTokenAsync(UserIntegrationCredential credential);
    }
} 