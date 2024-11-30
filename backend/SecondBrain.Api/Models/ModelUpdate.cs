namespace SecondBrain.Api.Models
{
    public class ModelUpdate
    {
        public ExecutionStepType Type { get; set; }
        public string Content { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
        public DateTime Timestamp { get; set; }
        public ExecutionStepType? ParentStep { get; set; }
        public bool IsSubStep { get; set; }
        public TimeSpan? Duration { get; set; }

        public ModelUpdate(
            ExecutionStepType type, 
            string content, 
            Dictionary<string, object>? metadata = null,
            ExecutionStepType? parentStep = null)
        {
            Type = type;
            Content = content;
            Metadata = metadata;
            ParentStep = parentStep;
            IsSubStep = parentStep.HasValue;
            Timestamp = DateTime.UtcNow;
        }

        public void SetDuration(TimeSpan duration)
        {
            Duration = duration;
            if (Metadata == null) Metadata = new Dictionary<string, object>();
            Metadata["duration_ms"] = duration.TotalMilliseconds;
        }
    }
} 