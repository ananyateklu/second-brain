using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Models;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SecondBrain.Api.Services
{
    public interface IGeminiService
    {
        Task<GeminiUpdate> ChatAsync(string prompt, string modelId = "gemini-1.5-pro", GenerationConfig? generationConfig = null, SafetySetting[]? safetySettings = null);
        Task<GeminiResponse> GenerateContentAsync(GeminiRequest request, string modelId = "gemini-1.5-pro");
        bool IsConfigured();
        
        // Streaming content generation
        IAsyncEnumerable<GeminiUpdate> StreamGenerateContentAsync(GeminiRequest request, string modelId = "gemini-1.5-pro");
        
        // Model information
        Task<List<ModelInfo>> ListModelsAsync(int? pageSize = null, string? pageToken = null);
        Task<ModelInfo> GetModelDetailsAsync(string modelId);
        Task<TokenCountResponse> CountTokensAsync(GeminiRequest request, string modelId = "gemini-1.5-pro");
        
        // Embeddings
        Task<EmbeddingResponse> GenerateEmbeddingAsync(EmbeddingRequest request, string modelId = "gemini-embedding-exp");
        Task<BatchEmbeddingResponse> GenerateBatchEmbeddingsAsync(BatchEmbeddingRequest request, string modelId = "gemini-embedding-exp");
        
        // File handling for multimodal inputs
        Task<FileUploadResponse> UploadFileAsync(Stream fileStream, string fileName, string mimeType);
        Task<bool> DeleteFileAsync(string fileId);
        
        // Image generation (Imagen)
        Task<ImageGenerationResponse> GenerateImageAsync(ImageGenerationRequest request, string modelId = "imagen-3.0-generate-002");
    }
} 