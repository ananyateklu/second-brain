using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.RAG
{
    public class FileUploadResponse
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }
    }

    public class AssistantResponse
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }
    }

    public class ThreadResponse
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }
    }

    public class RunResponse
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }

        [JsonPropertyName("status")]
        public required string Status { get; set; }
    }

    public class MessageContent
    {
        [JsonPropertyName("type")]
        public required string Type { get; set; }

        [JsonPropertyName("text")]
        public required TextContent Text { get; set; }
    }

    public class TextContent
    {
        [JsonPropertyName("value")]
        public required string Value { get; set; }
    }

    public class MessageResponse
    {
        [JsonPropertyName("role")]
        public required string Role { get; set; }

        [JsonPropertyName("content")]
        public required List<MessageContent> Content { get; set; }
    }

    public class ThreadMessagesResponse
    {
        [JsonPropertyName("data")]
        public required List<MessageResponse> Data { get; set; }
    }
} 