using System.Threading.Tasks;
using System.Collections.Generic;
using SecondBrain.Api.DTOs.Perplexity;

namespace SecondBrain.Api.Services
{
    public interface IPerplexityService
    {
        Task<PerplexityResponse> SendMessageAsync(PerplexityRequest request);
        Task<SearchResponse> SearchAsync(SearchRequest request);
        Task<bool> TestConnectionAsync();
        Task<AvailableModelsResponse> GetAvailableModelsAsync();
    }
} 