namespace SecondBrain.Data.Entities
{
    public class IdeaLink
    {
        public string IdeaId { get; set; }
        public Idea Idea { get; set; }
        public string LinkedItemId { get; set; }
        public string LinkedItemType { get; set; } // "Idea" or "Note"
        public bool IsDeleted { get; set; } = false;
    }
} 