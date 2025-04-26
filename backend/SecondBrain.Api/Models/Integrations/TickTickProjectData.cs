using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents the response from GET /open/v1/project/{projectId}/data
    public class TickTickProjectData
    {
        [JsonPropertyName("project")]
        public TickTickProject Project { get; set; } = new TickTickProject();

        [JsonPropertyName("tasks")]
        public List<TickTickTask> Tasks { get; set; } = new List<TickTickTask>();

        [JsonPropertyName("columns")]
        public List<TickTickColumn>? Columns { get; set; }
    }

    public class TickTickColumn
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("projectId")]
        public string ProjectId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("sortOrder")]
        public int SortOrder { get; set; }
    }
} 