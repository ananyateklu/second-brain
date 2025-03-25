using SecondBrain.Api.Constants;
using SecondBrain.Api.DTOs.Perplexity;

namespace SecondBrain.Api.Utilities
{
    /// <summary>
    /// Utility for mapping between different Perplexity model representations
    /// </summary>
    public static class PerplexityModelUtility
    {
        /// <summary>
        /// Convert from model type enum to model ID string
        /// </summary>
        public static string GetModelId(PerplexityModelType modelType)
        {
            return modelType switch
            {
                PerplexityModelType.Sonar => PerplexityModels.Sonar,
                PerplexityModelType.SonarPro => PerplexityModels.SonarPro,
                PerplexityModelType.SonarDeepResearch => PerplexityModels.SonarDeepResearch,
                PerplexityModelType.SonarReasoning => PerplexityModels.SonarReasoning,
                PerplexityModelType.SonarReasoningPro => PerplexityModels.SonarReasoningPro,
                _ => PerplexityModels.Default
            };
        }

        /// <summary>
        /// Convert from model ID string to model type enum
        /// </summary>
        public static PerplexityModelType GetModelType(string modelId)
        {
            return modelId switch
            {
                var id when id == PerplexityModels.Sonar => PerplexityModelType.Sonar,
                var id when id == PerplexityModels.SonarPro => PerplexityModelType.SonarPro,
                var id when id == PerplexityModels.SonarDeepResearch => PerplexityModelType.SonarDeepResearch,
                var id when id == PerplexityModels.SonarReasoning => PerplexityModelType.SonarReasoning,
                var id when id == PerplexityModels.SonarReasoningPro => PerplexityModelType.SonarReasoningPro,
                _ => PerplexityModelType.Sonar
            };
        }

        /// <summary>
        /// Get a user-friendly display name for a model ID
        /// </summary>
        public static string GetDisplayName(string modelId)
        {
            return modelId switch
            {
                var id when id == PerplexityModels.Sonar => "Sonar",
                var id when id == PerplexityModels.SonarPro => "Sonar Pro",
                var id when id == PerplexityModels.SonarDeepResearch => "Sonar Deep Research",
                var id when id == PerplexityModels.SonarReasoning => "Sonar Reasoning",
                var id when id == PerplexityModels.SonarReasoningPro => "Sonar Reasoning Pro",
                _ => "Unknown Model"
            };
        }

        /// <summary>
        /// Get a category for a model ID
        /// </summary>
        public static string GetCategory(string modelId)
        {
            return modelId switch
            {
                var id when id == PerplexityModels.Sonar || id == PerplexityModels.SonarPro => "search",
                var id when id == PerplexityModels.SonarDeepResearch => "research",
                var id when id == PerplexityModels.SonarReasoning || id == PerplexityModels.SonarReasoningPro => "reasoning",
                _ => "unknown"
            };
        }
    }
} 