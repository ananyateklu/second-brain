namespace SecondBrain.Data.Entities
{
    public class IdeaLink
    {
        public required string IdeaId { get; set; }
        public Idea? Idea { get; set; }
        public required string LinkedItemId { get; set; }
        public required string LinkedItemType { get; set; } // "Idea" or "Note"
        public bool IsDeleted { get; set; } = false;
    }
} 