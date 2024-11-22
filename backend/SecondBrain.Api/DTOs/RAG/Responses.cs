using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.RAG
{
    public class FileUploadResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
    }

    public class AssistantResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
    }

    public class ThreadResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
    }

    public class RunResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; }
    }

    public class MessageContent
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("text")]
        public TextContent Text { get; set; }
    }

    public class TextContent
    {
        [JsonPropertyName("value")]
        public string Value { get; set; }
    }

    public class MessageResponse
    {
        [JsonPropertyName("role")]
        public string Role { get; set; }

        [JsonPropertyName("content")]
        public List<MessageContent> Content { get; set; }
    }

    public class ThreadMessagesResponse
    {
        [JsonPropertyName("data")]
        public List<MessageResponse> Data { get; set; }
    }
} 