using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class AgentMessage
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public required string ChatId { get; set; }
        public AgentChat? Chat { get; set; }

        [Required]
        public required string Role { get; set; }

        [Required]
        public required string Content { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string Status { get; set; } = "sent";

        [Column(TypeName = "nvarchar(max)")]
        public string? Reactions { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? Metadata { get; set; }
    }
}