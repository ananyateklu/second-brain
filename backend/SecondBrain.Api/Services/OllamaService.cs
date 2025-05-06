using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using System.Text;
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Services
{
    public class OllamaService : IOllamaService
    {
        private readonly ILogger<OllamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;

        public OllamaService(IConfiguration configuration, ILogger<OllamaService> logger)
        {
            _logger = logger;
            var ollamaUri = new Uri(configuration.GetValue<string>("Ollama:OllamaUri") ?? throw new InvalidOperationException("Ollama:OllamaUri configuration is required"));
            _ollamaClient = new OllamaApiClient(ollamaUri);
        }

        public async Task<string> GenerateTextAsync(string prompt, string modelName, int numPredict = 2048)
        {
            try
            {
                _ollamaClient.SelectedModel = modelName;
                var responseBuilder = new StringBuilder();

                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    if (stream?.Response != null)
                    {
                        responseBuilder.Append(stream.Response);
                    }
                }

                return responseBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating text with Ollama model {ModelName}.", modelName);
                throw new OllamaException($"Failed to generate text with Ollama model {modelName}", ex);
            }
        }
    }
}