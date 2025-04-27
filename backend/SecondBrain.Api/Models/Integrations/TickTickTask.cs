using System;
using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents a Task object from the TickTick API.
    // IMPORTANT: Verify this structure against the official TickTick API documentation.
    public class TickTickTask
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("projectId")]
        public string ProjectId { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string? Content { get; set; } // Optional notes/description

        [JsonPropertyName("desc")] // Some APIs use 'desc' for description
        public string? Description { get; set; } 

        [JsonPropertyName("status")]
        public int Status { get; set; } // 0 for normal, 2 for completed (Verify TickTick specific values)

        [JsonPropertyName("priority")]
        public int Priority { get; set; } // e.g., 0, 1, 3, 5 (Verify TickTick specific values)

        [JsonPropertyName("dueDate")]
        public string? DueDate { get; set; } // Format might be like "yyyy-MM-ddTHH:mm:ss.fff+0000"

        [JsonPropertyName("startDate")]
        public string? StartDate { get; set; } // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"

        [JsonPropertyName("completedTime")]
        public string? CompletedTime { get; set; }

        [JsonPropertyName("createdTime")]
        public string? CreatedTime { get; set; }

        [JsonPropertyName("modifiedTime")]
        public string? ModifiedTime { get; set; }

        [JsonPropertyName("timeZone")]
        public string? TimeZone { get; set; }

        [JsonPropertyName("isAllDay")]
        public bool? IsAllDay { get; set; }

        [JsonPropertyName("tags")]
        public List<string>? Tags { get; set; }

        [JsonPropertyName("repeatFlag")]
        public string? RepeatFlag { get; set; } // e.g., "RRULE:FREQ=DAILY;INTERVAL=1"

        [JsonPropertyName("reminders")]
        public List<string>? Reminders { get; set; } // e.g., ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"]

        [JsonPropertyName("sortOrder")]
        public long? SortOrder { get; set; } // Use long for potentially large sort orders

        [JsonPropertyName("items")]
        public List<TickTickSubtask>? Items { get; set; } // For subtasks/checklist items

        // Add any other relevant fields based on TickTick documentation
    }

    // Represents a Subtask or Checklist item within a TickTick Task.
    public class TickTickSubtask
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public int Status { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("sortOrder")]
        public long? SortOrder { get; set; }

        [JsonPropertyName("startDate")]
        public string? StartDate { get; set; }

        [JsonPropertyName("isAllDay")]
        public bool? IsAllDay { get; set; }

        [JsonPropertyName("timeZone")]
        public string? TimeZone { get; set; }

        [JsonPropertyName("completedTime")]
        public string? CompletedTime { get; set; }
    }
} 