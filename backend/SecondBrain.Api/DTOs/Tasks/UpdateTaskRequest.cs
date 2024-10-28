namespace SecondBrain.Api.DTOs.Tasks
{
    public class UpdateTaskRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public TaskPriority? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public TaskStatus? Status { get; set; }

        // New Tags property
        public List<string> Tags { get; set; }
    }
}
