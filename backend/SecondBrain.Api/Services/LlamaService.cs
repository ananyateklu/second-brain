using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using SecondBrain.Api.DTOs.Llama;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private readonly ILogger<LlamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;

        public LlamaService(IConfiguration configuration, ILogger<LlamaService> logger)
        {
            _logger = logger;
            var ollamaUri = new Uri(configuration["Llama:OllamaUri"] ?? "http://localhost:11434");
            _ollamaClient = new OllamaApiClient(ollamaUri);
        }

        public async Task<string> GenerateTextAsync(string prompt, string modelName)
        {
            try
            {
                // Set the selected model per request
                _ollamaClient.SelectedModel = modelName;

                string responseText = string.Empty;

                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    responseText += stream.Response;
                }

                return responseText;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating text with Llama model {ModelName}.", modelName);
                throw new Exception("Failed to generate text with Llama.");
            }
        }
    }
} 