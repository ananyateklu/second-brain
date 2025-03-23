using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using System.Text;
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private readonly ILogger<LlamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;

        public LlamaService(IConfiguration configuration, ILogger<LlamaService> logger)
        {
            _logger = logger;
            var ollamaUri = new Uri(configuration.GetValue<string>("Llama:OllamaUri") ?? throw new InvalidOperationException("Llama:OllamaUri configuration is required"));
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
                _logger.LogError(ex, "Error generating text with Llama model {ModelName}.", modelName);
                throw new LlamaException($"Failed to generate text with Llama model {modelName}", ex);
            }
        }
    }
}