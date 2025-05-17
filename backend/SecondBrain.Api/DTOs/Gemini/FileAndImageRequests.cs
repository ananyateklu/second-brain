using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.Gemini
{
    // File Upload DTOs
    public class FileUploadInitiateRequest
    {
        [JsonPropertyName("file")]
        public required FileMetadata File { get; set; }
    }
    
    public class FileMetadata
    {
        [JsonPropertyName("display_name")]
        public required string DisplayName { get; set; }
    }
    
    public class FileUploadResponse
    {
        [JsonPropertyName("file")]
        public required FileInfo File { get; set; }
    }
    
    public class FileInfo
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; } // e.g., "files/unique-file-id"
        
        [JsonPropertyName("uri")]
        public required string Uri { get; set; } // e.g., "gs://bucket-name/path/to/file"
        
        [JsonPropertyName("mime_type")]
        public required string MimeType { get; set; }
        
        [JsonPropertyName("size_bytes")]
        public required string SizeBytes { get; set; }
        
        [JsonPropertyName("create_time")]
        public required string CreateTime { get; set; }
        
        [JsonPropertyName("update_time")]
        public required string UpdateTime { get; set; }
        
        [JsonPropertyName("display_name")]
        public required string DisplayName { get; set; }
    }
    
    // Image Generation DTOs
    public class ImageGenerationRequest
    {
        [JsonPropertyName("prompt")]
        public required string Prompt { get; set; }
        
        [JsonPropertyName("sampleCount")]
        public int SampleCount { get; set; } = 1;
        
        [JsonPropertyName("width")]
        public int? Width { get; set; }
        
        [JsonPropertyName("height")]
        public int? Height { get; set; }
        
        [JsonPropertyName("safetySettings")]
        public List<SafetySetting>? SafetySettings { get; set; }
    }
    
    public class ImageGenerationResponse
    {
        [JsonPropertyName("images")]
        public required List<GeneratedImage> Images { get; set; }
    }
    
    public class GeneratedImage
    {
        [JsonPropertyName("data")]
        public required string Data { get; set; } // Base64 encoded image data
        
        [JsonPropertyName("mime_type")]
        public required string MimeType { get; set; } // e.g., "image/jpeg"
    }
    
    // For multimodal input
    public class InlineData
    {
        [JsonPropertyName("mime_type")]
        public required string MimeType { get; set; }
        
        [JsonPropertyName("data")]
        public required string Data { get; set; } // Base64 encoded data
    }
    
    public class FileData
    {
        [JsonPropertyName("mime_type")]
        public required string MimeType { get; set; }
        
        [JsonPropertyName("file_uri")]
        public required string FileUri { get; set; }
    }
} 