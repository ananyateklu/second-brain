using System.Threading.Tasks;
using SecondBrain.Api.Models;

namespace SecondBrain.Api.Services
{
    public interface IOllamaService
    {
        Task<string> GenerateTextAsync(string prompt, string modelName, int numPredict = 2048);
    }
} 