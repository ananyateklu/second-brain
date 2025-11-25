using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Application.Services.Stats;

public interface IStatsService
{
    Task<AIUsageStatsResponse> GetAIUsageStatsAsync(string userId);
}

