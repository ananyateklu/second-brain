namespace SecondBrain.Api.DTOs.Tasks
{
    public class CreateTaskRequest
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public TaskPriority Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public required List<string> Tags { get; set; }
    }
}
