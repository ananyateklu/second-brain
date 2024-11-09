using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using SecondBrain.Api.DTOs.Llama;
using SecondBrain.Api.DTOs.Nexus;
using SecondBrain.Api.Services;
using System.Text.Json;
using SecondBrain.Data.Entities;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private readonly ILogger<LlamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;
        private readonly INexusStorageService _nexusStorage;
        private readonly INoteToolService _noteToolService;

        private readonly string systemPrompt = @"You are a natural language interface for a Notes database with the following schema:

TABLES:
1. Users (READ-ONLY):
   - Id: NVARCHAR(450) (PK)
   - Email: NVARCHAR(450)
   - Name: NVARCHAR(MAX)
   - Other fields not relevant for operations

2. Notes:
   - Id: NVARCHAR(36) (PK)
   - Title: NVARCHAR(MAX)
   - Content: NVARCHAR(MAX)
   - IsPinned: BIT (default 0)
   - IsFavorite: BIT (default 0)
   - IsArchived: BIT (default 0)
   - IsIdea: BIT (default 0)
   - IsDeleted: BIT (default 0)
   - Tags: NVARCHAR(255)
   - UserId: NVARCHAR(450) (FK to Users)
   - CreatedAt: DATETIME2
   - UpdatedAt: DATETIME2
   - ArchivedAt: DATETIME2 (nullable)
   - DeletedAt: DATETIME2 (nullable)

3. NoteLinks:
   - NoteId: NVARCHAR(36) (PK, FK to Notes)
   - LinkedNoteId: NVARCHAR(36) (PK, FK to Notes)
   - IsDeleted: BIT (default 0)

RESPONSE FORMAT (use only one):
1. JSON (preferred):
{
    ""function"": ""create_note"",
    ""arguments"": {
        ""title"": ""Project Meeting Notes"",
        ""content"": ""Discussion about Q2 roadmap"",
        ""isPinned"": false,
        ""isFavorite"": false,
        ""isArchived"": false,
        ""tags"": ""meeting,project,roadmap"",
        ""isIdea"": false
    }
}

2. Function call (alternative):
create_note(title='Project Meeting Notes', content='Discussion about Q2 roadmap', tags='meeting,project,roadmap', isPinned=false, isIdea=false)

AVAILABLE OPERATIONS:
1. create_note(title, content, isPinned?, isFavorite?, isArchived?, isIdea?, tags?)
   - Creates a new note/idea
   - Defaults: isPinned=false, isFavorite=false, isArchived=false, isIdea=false
   - Tags should be comma-separated string

2. update_note(id, title?, content?, isPinned?, isFavorite?, isArchived?, tags?)
   - Updates existing note
   - Only specified fields are updated
   - Cannot change isIdea status

3. link_notes(sourceDescription, targetDescription)
   - Links two notes based on their descriptions
   - Will attempt to find the best matching notes
   - Example: link_notes(sourceDescription='project meeting from yesterday', targetDescription='Q2 roadmap draft')

4. unlink_notes(sourceId, targetIds)
   - Removes links between notes
   - targetIds should be comma-separated string
   - Maximum 20 links at once

5. search_notes(query?, tags?, isPinned?, isFavorite?, isArchived?, isIdea?)
   - Complex search supporting multiple criteria
   - All parameters are optional

6. archive_note(id)
   - Sets IsArchived=true and ArchivedAt

7. delete_note(id)
   - Sets IsDeleted=true and DeletedAt
   - Soft delete only

Note: For tags, always use comma-separated strings (e.g., tags='project,planning' not tags=['project', 'planning'])
User context must be preserved in [USER:id] format
All operations require valid user authentication";

        public LlamaService(IConfiguration configuration, ILogger<LlamaService> logger, INexusStorageService nexusStorage, INoteToolService noteToolService)
        {
            _logger = logger;
            _nexusStorage = nexusStorage;
            _noteToolService = noteToolService;
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

            try
            {
                // Store the original prompt for user context
                var originalPrompt = prompt; // Keep this for user ID extraction

                // Extract user ID for logging
                var userIdMatch = System.Text.RegularExpressions.Regex.Match(prompt, @"\[USER:([^\]]+)\]");
                if (userIdMatch.Success)
                {
                    _logger.LogInformation("Processing request for user: {UserId}", userIdMatch.Groups[1].Value);
                }

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
                            // Add the original prompt to the operation for user context
                            operation.OriginalPrompt = originalPrompt;
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
                    // Add the original prompt to the operation for user context
                    functionCall.OriginalPrompt = originalPrompt;
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
            try
            {
                // First try to find a JSON object in the response
                var jsonStart = response.IndexOf('{');
                var jsonEnd = response.LastIndexOf('}');

                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    var jsonPart = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                    try
                    {
                        var operation = JsonSerializer.Deserialize<DatabaseOperation>(jsonPart);
                        if (operation != null)
                        {
                            return operation;
                        }
                    }
                    catch (JsonException)
                    {
                        _logger.LogInformation("Failed to parse JSON, trying function call format");
                    }
                }

                // Try to parse function call format
                var functionMatch = System.Text.RegularExpressions.Regex.Match(
                    response,
                    @"(?:Call:\s*)?(\w+)\((.*?)\)(?:<bot_end>|$)",
                    System.Text.RegularExpressions.RegexOptions.Singleline
                );

                if (!functionMatch.Success)
                {
                    return null;
                }

                var function = functionMatch.Groups[1].Value;
                var argsString = functionMatch.Groups[2].Value;

                var arguments = new Dictionary<string, string>();

                // Match both single and double quotes, handle arrays and simple values
                var argMatches = System.Text.RegularExpressions.Regex.Matches(
                    argsString,
                    @"(\w+)=(?:'([^']*)'|\[(.*?)\]|([^,\s]*))",
                    System.Text.RegularExpressions.RegexOptions.Singleline
                );

                foreach (System.Text.RegularExpressions.Match argMatch in argMatches)
                {
                    var key = argMatch.Groups[1].Value;
                    var value = argMatch.Groups[2].Value;

                    // If single quoted value is empty, try array or bare value
                    if (string.IsNullOrEmpty(value))
                    {
                        // Check for array value
                        value = argMatch.Groups[3].Value;
                        if (!string.IsNullOrEmpty(value))
                        {
                            // Convert Python-style array to comma-separated string
                            value = value.Replace("'", "")
                                        .Replace("[", "")
                                        .Replace("]", "")
                                        .Replace(" ", "");
                        }
                        else
                        {
                            // Try bare value
                            value = argMatch.Groups[4].Value;
                        }
                    }

                    arguments[key] = value;
                }

                return new DatabaseOperation
                {
                    Function = function,
                    Arguments = arguments
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing function call");
                return null;
            }
        }

        private async Task<string> ExecuteOperation(DatabaseOperation operation)
        {
            try
            {
                // Extract userId from the operation context
                string userId = ExtractUserId(operation);
                if (string.IsNullOrEmpty(userId))
                {
                    throw new Exception("User context not found in operation");
                }

                switch (operation.Function.ToLower())
                {
                    case "create_note":
                        var createRequest = new NoteToolRequest
                        {
                            Title = operation.Arguments.GetValueOrDefault("title", ""),
                            Content = operation.Arguments.GetValueOrDefault("content", ""),
                            IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault("isPinned", "false")),
                            IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault("isFavorite", "false")),
                            IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault("isArchived", "false")),
                            IsIdea = bool.Parse(operation.Arguments.GetValueOrDefault("isIdea", "false")),
                            Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                            UserId = userId
                        };
                        var createResponse = await _noteToolService.CreateNoteAsync(createRequest);
                        return JsonSerializer.Serialize(createResponse);

                    case "update_note":
                        var noteId = operation.Arguments.GetValueOrDefault("id", "");
                        if (string.IsNullOrEmpty(noteId))
                        {
                            throw new Exception("Note ID is required for update operation");
                        }

                        var updateRequest = new NoteToolRequest
                        {
                            Title = operation.Arguments.GetValueOrDefault("title", ""),
                            Content = operation.Arguments.GetValueOrDefault("content", ""),
                            IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault("isPinned", "false")),
                            IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault("isFavorite", "false")),
                            IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault("isArchived", "false")),
                            Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                            UserId = userId
                        };
                        var updateResponse = await _noteToolService.UpdateNoteAsync(noteId, updateRequest);
                        return JsonSerializer.Serialize(updateResponse);

                    case "link_notes":
                        var sourceDesc = operation.Arguments.GetValueOrDefault("sourceDescription", "");
                        var targetDesc = operation.Arguments.GetValueOrDefault("targetDescription", "");
                        
                        if (string.IsNullOrEmpty(sourceDesc) || string.IsNullOrEmpty(targetDesc))
                        {
                            throw new Exception("Source and target note descriptions are required for linking");
                        }

                        return await HandleNoteLinking(sourceDesc, targetDesc, userId);

                    case "unlink_notes":
                        var sourceId = operation.Arguments.GetValueOrDefault("sourceId", "");
                        var targetIdsStr = operation.Arguments.GetValueOrDefault("targetIds", "");
                        
                        // Parse comma-separated string into array
                        var targetIds = targetIdsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                                   .Select(id => id.Trim())
                                                   .ToArray();
                        
                        if (string.IsNullOrEmpty(sourceId) || !targetIds.Any())
                        {
                            throw new Exception("Source note ID and target note IDs are required for unlink operation");
                        }

                        var unlinkResponse = await _noteToolService.UnlinkNotesAsync(sourceId, targetIds, userId);
                        return JsonSerializer.Serialize(unlinkResponse);

                    case "search_notes":
                        var searchCriteria = new NoteToolSearchCriteria
                        {
                            Query = operation.Arguments.GetValueOrDefault("query", ""),
                            Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                            IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault("isPinned", "null")),
                            IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault("isFavorite", "null")),
                            IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault("isArchived", "null")),
                            IsIdea = bool.Parse(operation.Arguments.GetValueOrDefault("isIdea", "null")),
                            UserId = userId
                        };
                        var searchResponse = await _noteToolService.SearchNotesAsync(searchCriteria);
                        return JsonSerializer.Serialize(searchResponse);

                    case "archive_note":
                        noteId = operation.Arguments.GetValueOrDefault("id", "");
                        if (string.IsNullOrEmpty(noteId))
                        {
                            throw new Exception("Note ID is required for archive operation");
                        }
                        var archiveResponse = await _noteToolService.ArchiveNoteAsync(noteId, userId);
                        return JsonSerializer.Serialize(archiveResponse);

                    case "delete_note":
                        noteId = operation.Arguments.GetValueOrDefault("id", "");
                        if (string.IsNullOrEmpty(noteId))
                        {
                            throw new Exception("Note ID is required for delete operation");
                        }
                        var deleteResponse = await _noteToolService.DeleteNoteAsync(noteId, userId);
                        return JsonSerializer.Serialize(deleteResponse);

                    // Keep existing operations
                    case "get_item":
                        if (!operation.Arguments.ContainsKey("key"))
                            throw new Exception("Get operation requires a key");
                        var item = await _nexusStorage.GetItemAsync(operation.Arguments["key"]);
                        return JsonSerializer.Serialize(new { success = true, item });

                    default:
                        throw new Exception($"Unknown function: {operation.Function}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing operation {Function}", operation.Function);
                return JsonSerializer.Serialize(new { 
                    success = false, 
                    error = ex.Message 
                });
            }
        }

        private string ExtractUserId(DatabaseOperation operation)
        {
            try 
            {
                // Get the original prompt from the operation context
                var prompt = operation.ToString() ?? "";
                
                // Look for [USER:id] pattern in the prompt
                var userIdMatch = System.Text.RegularExpressions.Regex.Match(
                    prompt,
                    @"\[USER:([^\]]+)\]"
                );

                if (!userIdMatch.Success)
                {
                    _logger.LogWarning("No user ID found in prompt: {Prompt}", prompt);
                    return string.Empty;
                }

                var userId = userIdMatch.Groups[1].Value;
                _logger.LogInformation("Extracted user ID: {UserId}", userId);
                return userId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting user ID from operation");
                return string.Empty;
            }
        }

        private async Task<string> HandleNoteLinking(string sourceDescription, string targetDescription, string userId)
        {
            try
            {
                // First, find potential source notes
                var sourceNotes = await _noteToolService.FindNotesByDescriptionAsync(sourceDescription, userId);
                if (!sourceNotes.Any())
                {
                    return JsonSerializer.Serialize(new { 
                        success = false, 
                        error = $"Could not find source note matching '{sourceDescription}'" 
                    });
                }

                // Find potential target notes
                var targetNotes = await _noteToolService.FindNotesByDescriptionAsync(targetDescription, userId);
                if (!targetNotes.Any())
                {
                    return JsonSerializer.Serialize(new { 
                        success = false, 
                        error = $"Could not find target note matching '{targetDescription}'" 
                    });
                }

                // If we found multiple potential matches, we need to be smart about choosing
                var sourceNote = ChooseBestNoteMatch(sourceNotes, sourceDescription);
                var targetNote = ChooseBestNoteMatch(targetNotes, targetDescription);

                // Log what we found for debugging
                _logger.LogInformation(
                    "Linking notes - Source: {SourceTitle} ({SourceId}), Target: {TargetTitle} ({TargetId})",
                    sourceNote.Title, sourceNote.Id, targetNote.Title, targetNote.Id
                );

                // Perform the linking
                var linkResponse = await _noteToolService.LinkNotesAsync(
                    sourceNote.Id, 
                    new[] { targetNote.Id }, 
                    userId
                );

                // Add additional context to the response
                var response = new
                {
                    success = linkResponse.Success,
                    message = linkResponse.Message,
                    sourceNote = new { id = sourceNote.Id, title = sourceNote.Title },
                    targetNote = new { id = targetNote.Id, title = targetNote.Title }
                };

                return JsonSerializer.Serialize(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling note linking");
                return JsonSerializer.Serialize(new { 
                    success = false, 
                    error = "Failed to link notes: " + ex.Message 
                });
            }
        }

        private Note ChooseBestNoteMatch(List<Note> notes, string description)
        {
            // If only one note, return it
            if (notes.Count == 1) return notes[0];

            // Calculate similarity scores
            var scores = notes.Select(note => new
            {
                Note = note,
                Score = CalculateSimilarityScore(note, description)
            }).OrderByDescending(x => x.Score);

            return scores.First().Note;
        }

        private double CalculateSimilarityScore(Note note, string description)
        {
            var descWords = description.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var titleWords = note.Title.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var contentPreview = note.Content.Length > 200 
                ? note.Content.Substring(0, 200) 
                : note.Content;
            var contentWords = contentPreview.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);

            // Calculate word overlap
            var titleMatches = descWords.Count(w => titleWords.Contains(w));
            var contentMatches = descWords.Count(w => contentWords.Contains(w));

            // Title matches are weighted more heavily
            return (titleMatches * 2.0) + contentMatches;
        }
    }
}