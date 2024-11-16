using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Models;
using System.Threading.Tasks;

namespace SecondBrain.Api.Services
{
    public interface IGeminiService
    {
        Task<ModelUpdate> ChatAsync(string prompt, string modelId = "gemini-1.5-pro");
        Task<GeminiResponse> GenerateContentAsync(GeminiRequest request);
        bool IsConfigured();
    }
} 