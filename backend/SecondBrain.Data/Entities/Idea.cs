namespace SecondBrain.Data.Entities
{
    public class Idea
    {
        public required string Id { get; set; }
        public required string Title { get; set; }
        public required string Content { get; set; }
        public required string UserId { get; set; }
        public User? User { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsPinned { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required DateTime UpdatedAt { get; set; }
        public string? Tags { get; set; }
        public ICollection<IdeaLink> IdeaLinks { get; set; } = new List<IdeaLink>();
    }
}
