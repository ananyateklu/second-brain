using System.Threading.Tasks;

namespace SecondBrain.Api.Services
{
    public interface ILlamaService
    {
        Task<string> GenerateTextAsync(string prompt, string modelName);
    }
} 