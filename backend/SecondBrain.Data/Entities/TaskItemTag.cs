namespace SecondBrain.Data.Entities
{
    public class TaskItemTag
    {
        public required string Id { get; set; }
        public required string TaskItemId { get; set; }
        public TaskItem? TaskItem { get; set; }

        public required string TagId { get; set; }
        public Tag? Tag { get; set; }
    }
}
