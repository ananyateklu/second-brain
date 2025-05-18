using System.Threading.Tasks;
using SecondBrain.Api.DTOs.Anthropic;

namespace SecondBrain.Api.Services
{
    public interface IAnthropicService
    {
        Task<SendMessageResponse> SendMessageAsync(SendMessageRequest requestPayload);
        Task<AnthropicModelsResponse> GetModelsAsync();
        Task<bool> TestConnectionAsync();
        Task<bool> SetApiKeyAsync(string apiKey);
    }
}
