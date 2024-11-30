using System;
using System.Collections.Generic;

namespace SecondBrain.Api.Models
{
    public class GeminiUpdate
    {
        public string Type { get; set; }
        public string Content { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
        public DateTime Timestamp { get; set; }

        public GeminiUpdate(string type, string content, Dictionary<string, object>? metadata = null)
        {
            Type = type;
            Content = content;
            Metadata = metadata;
            Timestamp = DateTime.UtcNow;
        }
    }
} 