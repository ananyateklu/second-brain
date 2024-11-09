using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using SecondBrain.Api.DTOs.Llama;
using SecondBrain.Api.DTOs.Nexus;
using SecondBrain.Api.Services;
using System.Text.Json;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private readonly ILogger<LlamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;
        private readonly INexusStorageService _nexusStorage;

        public LlamaService(IConfiguration configuration, ILogger<LlamaService> logger, INexusStorageService nexusStorage)
        {
            _logger = logger;
            _nexusStorage = nexusStorage;
            var ollamaUri = new Uri(configuration["Llama:OllamaUri"] ?? "http://localhost:11434");
            _ollamaClient = new OllamaApiClient(ollamaUri);
        }

        public async Task<string> GenerateTextAsync(string prompt, string modelName)
        {
            try
            {
                // Set the selected model per request
                _ollamaClient.SelectedModel = modelName;

                string responseText = string.Empty;

                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    responseText += stream.Response;
                }

                return responseText;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating text with Llama model {ModelName}.", modelName);
                throw new Exception("Failed to generate text with Llama.");
            }
        }

        public async Task<string> ExecuteDatabaseOperationAsync(string prompt)
        {
            const string MODEL_NAME = "nexusraven";
            string response = string.Empty;

            var systemPrompt = @"You are a natural language interface for a NexusStorage database table with this schema:

Table: NexusStorage
- Id: INT (auto-generated)
- Key: NVARCHAR(255) (unique identifier for the item)
- Value: NVARCHAR(MAX) (the actual content)
- DataType: NVARCHAR(255) (type of data stored)
- Tags: NVARCHAR(MAX) (comma-separated tags)
- CreatedAt: DATETIME (auto-set)
- UpdatedAt: DATETIME (auto-updated)

Your job is to convert natural language requests into precise database operations.

RESPONSE FORMAT (use only one):
1. JSON:
{
    ""function"": ""store_item"",
    ""arguments"": {
        ""key"": ""meeting-2024-03"",
        ""value"": ""Team sync discussion notes"",
        ""dataType"": ""note"",
        ""tags"": ""meeting,team,sync""
    }
}

2. Function:
store_item(key='meeting-2024-03', value='Team sync discussion notes', dataType='note', tags='meeting,team,sync')

AVAILABLE OPERATIONS:
1. store_item(key, value, dataType?, tags?)
   - Stores new information
   - Generates appropriate key if not specified
   - DataType defaults to 'text' if not specified
   - Tags are optional

2. get_item(key)
   - Retrieves a specific item by its key
   - Key must match exactly

3. update_item(key, value)
   - Updates existing item's value
   - Cannot modify key
   - Automatically updates UpdatedAt

4. delete_item(key)
   - Removes item permanently
   - Requires exact key match

5. search_by_tags(tags)
   - Searches items by tags
   - Tags are comma-separated
   - Case-insensitive matching

NATURAL LANGUAGE UNDERSTANDING:
- Handle variations like:
  ""Save this..."" → store_item
  ""Remember that..."" → store_item
  ""Find all..."" → search_by_tags
  ""Show me..."" → get_item
  ""Update..."" → update_item
  ""Change..."" → update_item
  ""Remove..."" → delete_item
  ""Delete..."" → delete_item

KEY GENERATION RULES:
1. Meeting notes: 'meeting-{YYYY-MM-DD}'
2. Reminders: 'reminder-{topic}'
3. Tasks: 'task-{topic}'
4. General notes: 'note-{topic}'
5. Custom items: '{category}-{descriptor}'

EXAMPLES:
Input: ""Save notes from today's team meeting about project timeline""
Output: store_item(
    key='meeting-2024-03-15',
    value='Project timeline discussion notes',
    dataType='note',
    tags='meeting,team,project,timeline'
)

Input: ""Find all my project-related notes""
Output: search_by_tags(tags='project')

Input: ""Update the meeting notes from March 15th to include budget discussion""
Output: update_item(
    key='meeting-2024-03-15',
    value='Project timeline and budget discussion notes'
)

IMPORTANT:
- NEVER reference external systems
- ONLY return the operation format
- Generate meaningful keys based on content
- Preserve existing keys when updating
- Use relevant tags for searchability
- Handle date references intelligently
- Maintain data consistency";

            try
            {
                // Combine system prompt and user prompt
                var fullPrompt = $"{systemPrompt}\n\nUser Input: {prompt}";
                response = await GenerateTextAsync(fullPrompt, MODEL_NAME);
                _logger.LogInformation("Raw model response: {Response}", response);

                // Try to parse as JSON first
                try
                {
                    var jsonStart = response.IndexOf('{');
                    var jsonEnd = response.LastIndexOf('}');

                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonPart = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                        var operation = JsonSerializer.Deserialize<DatabaseOperation>(jsonPart);
                        if (operation != null)
                        {
                            return await ExecuteOperation(operation);
                        }
                    }
                }
                catch (JsonException)
                {
                    _logger.LogInformation("Response was not in JSON format, trying function call format");
                }

                // Try to parse as function call
                var functionCall = ParseFunctionCall(response);
                if (functionCall != null)
                {
                    return await ExecuteOperation(functionCall);
                }

                throw new Exception($"Could not parse response in either JSON or function call format: {response}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing database operation. Raw response: {Response}", response);
                throw new Exception($"Invalid model response format. Details: {ex.Message}. Raw response: {response}");
            }
        }

        private DatabaseOperation? ParseFunctionCall(string response)
        {
            // Match pattern: functionName(key='value', key2='value2')
            var match = System.Text.RegularExpressions.Regex.Match(response, @"(\w+)\((.*?)\)");
            if (!match.Success) return null;

            var function = match.Groups[1].Value;
            var argsString = match.Groups[2].Value;

            var arguments = new Dictionary<string, string>();
            var argMatches = System.Text.RegularExpressions.Regex.Matches(argsString, @"(\w+)=['""]([^'""]*)['""]");

            foreach (System.Text.RegularExpressions.Match argMatch in argMatches)
            {
                var key = argMatch.Groups[1].Value;
                var value = argMatch.Groups[2].Value;
                arguments[key] = value;
            }

            return new DatabaseOperation
            {
                Function = function,
                Arguments = arguments
            };
        }

        private async Task<string> ExecuteOperation(DatabaseOperation operation)
        {
            switch (operation.Function.ToLower())
            {
                case "get_item":
                    if (!operation.Arguments.ContainsKey("key"))
                        throw new Exception("Get operation requires a key");
                    var item = await _nexusStorage.GetItemAsync(operation.Arguments["key"]);
                    return JsonSerializer.Serialize(new { success = true, item });

                case "store_item":
                    var newItem = new NexusStorageItem
                    {
                        Key = operation.Arguments.GetValueOrDefault("key", ""),
                        Value = operation.Arguments.GetValueOrDefault("value", ""),
                        DataType = operation.Arguments.GetValueOrDefault("dataType", "text"),
                        Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    var storedItem = await _nexusStorage.StoreItemAsync(newItem);
                    return JsonSerializer.Serialize(new { success = true, item = storedItem });

                case "search_by_tags":
                    if (!operation.Arguments.ContainsKey("tags"))
                        throw new Exception("Search operation requires tags");
                    var items = await _nexusStorage.SearchByTagsAsync(operation.Arguments["tags"]);
                    return JsonSerializer.Serialize(new { success = true, items });

                case "delete_item":
                    if (!operation.Arguments.ContainsKey("key"))
                        throw new Exception("Delete operation requires a key");
                    var deleted = await _nexusStorage.DeleteItemAsync(operation.Arguments["key"]);
                    return JsonSerializer.Serialize(new { success = true, deleted });

                case "update_item":
                    if (!operation.Arguments.ContainsKey("key") || !operation.Arguments.ContainsKey("value"))
                        throw new Exception("Update operation requires both key and value");
                    var updated = await _nexusStorage.UpdateItemAsync(
                        operation.Arguments["key"],
                        operation.Arguments["value"]
                    );
                    return JsonSerializer.Serialize(new { success = true, item = updated });

                default:
                    throw new Exception($"Unknown function: {operation.Function}");
            }
        }
    }
}