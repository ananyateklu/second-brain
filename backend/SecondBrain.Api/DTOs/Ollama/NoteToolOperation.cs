using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.Ollama
{
    public class NoteToolOperation
    {
        public string Function { get; set; } = string.Empty;
        public Dictionary<string, object> Arguments { get; set; } = new();
        public string UserId { get; set; } = string.Empty;
    }

    public class NoteToolResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }
    }

    public class NoteToolRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public bool IsIdea { get; set; }
        public string? Tags { get; set; }
        public string UserId { get; set; } = string.Empty;
    }

    public class NoteToolSearchCriteria
    {
        public string? Query { get; set; }
        public string? Tags { get; set; }
        public bool? IsPinned { get; set; }
        public bool? IsFavorite { get; set; }
        public bool? IsArchived { get; set; }
        public bool? IsIdea { get; set; }
        public string UserId { get; set; } = string.Empty;
    }
} 