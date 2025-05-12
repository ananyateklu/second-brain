using System;
using System.Threading.Tasks;
using SecondBrain.Api.Models;
using SecondBrain.Api.DTOs.Ollama;

namespace SecondBrain.Api.Services
{
    public interface IOllamaService
    {
        Task<string> GenerateTextAsync(string prompt, string modelName, int numPredict = 2048);
        
        /// <summary>
        /// Streams the generated text response token-by-token using the specified model
        /// </summary>
        /// <param name="prompt">The input prompt</param>
        /// <param name="modelName">The model to use for generation</param>
        /// <param name="numPredict">The maximum number of tokens to predict</param>
        /// <param name="callback">A callback function that will be called with each token as it's generated</param>
        Task StreamGenerateTextAsync(string prompt, string modelName, Func<string, Task> callback, int numPredict = 2048);

        /// <summary>
        /// Fetches the list of available models from Ollama
        /// </summary>
        /// <returns>A list of available models</returns>
        Task<OllamaModelsResponse> GetAvailableModelsAsync();
    }
} 