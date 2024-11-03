namespace SecondBrain.Api.DTOs.Ideas
{
    public class IdeaResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<string> Tags { get; set; }
        public List<LinkedItemResponse> LinkedItems { get; set; }
    }

    public class LinkedItemResponse
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Title { get; set; }
    }
} 