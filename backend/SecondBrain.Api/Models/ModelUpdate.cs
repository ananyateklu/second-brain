namespace SecondBrain.Api.Models
{
    public class ModelUpdate
    {
        public string Type { get; set; }
        public string Content { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
        public DateTime Timestamp { get; set; }

        public ModelUpdate(string type, string content, Dictionary<string, object>? metadata = null)
        {
            Type = type;
            Content = content;
            Metadata = metadata;
            Timestamp = DateTime.UtcNow;
        }
    }
} 