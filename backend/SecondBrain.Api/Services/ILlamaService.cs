using System.Threading.Tasks;
using SecondBrain.Api.Models;

namespace SecondBrain.Api.Services
{
    public interface ILlamaService
    {
        Task<string> GenerateTextAsync(string prompt, string modelName);
        Task<string> ExecuteDatabaseOperationAsync(string prompt, string messageId);
    }
} 