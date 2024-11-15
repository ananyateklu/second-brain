using System.Threading.Tasks;
using SecondBrain.Api.DTOs.OpenAI;
using Microsoft.AspNetCore.Http;

namespace SecondBrain.Api.Services
{
    public interface IOpenAIService
    {
        Task<SendMessageResponse> SendMessageAsync(SendMessageRequest request);
        Task<bool> TestConnectionAsync();
        Task<EmbeddingsResponse> CreateEmbeddingsAsync(EmbeddingsRequest request);
        Task<ImageGenerationResponse> GenerateImageAsync(ImageGenerationRequest request);
        Task<AudioTranscriptionResponse> TranscribeAudioAsync(IFormFile file);
        Task<TextToSpeechResponse> TextToSpeechAsync(TextToSpeechRequest request);
        Task<Stream> GetAudioStreamAsync(TextToSpeechResponse response);
    }
} 