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
using SecondBrain.Api.Models;
using System.Runtime.CompilerServices;
using System.Collections.Generic;
using System.Threading;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using SecondBrain.Api.Hubs;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private readonly ILogger<LlamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;
        private readonly INexusStorageService _nexusStorage;
        private readonly INoteToolService _noteToolService;
        private readonly IHubContext<ToolHub> _hubContext;

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

        public LlamaService(IConfiguration configuration, ILogger<LlamaService> logger, INexusStorageService nexusStorage, INoteToolService noteToolService, IHubContext<ToolHub> hubContext)
        {
            _logger = logger;
            _nexusStorage = nexusStorage;
            _noteToolService = noteToolService;
            _hubContext = hubContext;
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
                // Extract user ID and emit initial step
                var userIdMatch = System.Text.RegularExpressions.Regex.Match(prompt, @"\[USER:([^\]]+)\]");
                var userId = userIdMatch.Success ? userIdMatch.Groups[1].Value : "unknown";
                
                await EmitExecutionStep("processing", $"Processing request for user: {userId}", new Dictionary<string, object>
                {
                    { "userId", userId },
                    { "timestamp", DateTime.UtcNow }
                });

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
                            operation.OriginalPrompt = prompt;
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
                    functionCall.OriginalPrompt = prompt;
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
                        var rawIdOrTitle = operation.Arguments.GetValueOrDefault("id", "");
                        var cleanIdOrTitle = System.Text.RegularExpressions.Regex.Replace(rawIdOrTitle, @"\[(?:NOTE|USER):(.*?)\]", "$1");
                        
                        if (string.IsNullOrEmpty(cleanIdOrTitle))
                        {
                            throw new Exception("Note ID or title is required for update operation");
                        }

                        // First try to find by exact ID
                        var note = await _noteToolService.GetNoteByIdAsync(cleanIdOrTitle, userId);
                        
                        // If not found by ID, try to find by title
                        if (note == null)
                        {
                            // Extract title from arguments or use the cleanIdOrTitle
                            var searchTitle = operation.Arguments.GetValueOrDefault("title", cleanIdOrTitle);
                            var matchingNotes = await _noteToolService.FindNotesByDescriptionAsync(searchTitle, userId);
                            
                            if (!matchingNotes.Any())
                            {
                                throw new Exception($"Could not find note matching '{searchTitle}'");
                            }
                            
                            // If multiple notes found, prefer exact title match first
                            note = matchingNotes.FirstOrDefault(n => 
                                n.Title.Equals(searchTitle, StringComparison.OrdinalIgnoreCase)) 
                                ?? ChooseBestNoteMatch(matchingNotes, searchTitle);
                        }

                        var updateRequest = new NoteToolRequest
                        {
                            Title = operation.Arguments.GetValueOrDefault("title", note.Title),
                            Content = operation.Arguments.GetValueOrDefault("content", note.Content),
                            IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault("isPinned", note.IsPinned.ToString())),
                            IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault("isFavorite", note.IsFavorite.ToString())),
                            IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault("isArchived", note.IsArchived.ToString())),
                            Tags = operation.Arguments.GetValueOrDefault("tags", note.Tags ?? ""),
                            UserId = userId
                        };

                        _logger.LogInformation("Updating note: {NoteId} - {Title}", note.Id, note.Title);
                        var updateResponse = await _noteToolService.UpdateNoteAsync(note.Id, updateRequest);
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
                        var rawSourceId = operation.Arguments.GetValueOrDefault("sourceId", "");
                        var sourceId = System.Text.RegularExpressions.Regex.Replace(rawSourceId, @"\[NOTE:(.*?)\]", "$1");
                        
                        var targetIdsStr = operation.Arguments.GetValueOrDefault("targetIds", "");
                        var targetIds = targetIdsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                                  .Select(id => System.Text.RegularExpressions.Regex.Replace(id.Trim(), @"\[NOTE:(.*?)\]", "$1"))
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
                            UserId = userId
                        };

                        // Only parse boolean values if they're not "null"
                        if (operation.Arguments.TryGetValue("isPinned", out var isPinnedStr) && isPinnedStr.ToLower() != "null")
                        {
                            searchCriteria.IsPinned = bool.Parse(isPinnedStr);
                        }
                        
                        if (operation.Arguments.TryGetValue("isFavorite", out var isFavoriteStr) && isFavoriteStr.ToLower() != "null")
                        {
                            searchCriteria.IsFavorite = bool.Parse(isFavoriteStr);
                        }
                        
                        if (operation.Arguments.TryGetValue("isArchived", out var isArchivedStr) && isArchivedStr.ToLower() != "null")
                        {
                            searchCriteria.IsArchived = bool.Parse(isArchivedStr);
                        }
                        
                        if (operation.Arguments.TryGetValue("isIdea", out var isIdeaStr) && isIdeaStr.ToLower() != "null")
                        {
                            searchCriteria.IsIdea = bool.Parse(isIdeaStr);
                        }

                        var searchResponse = await _noteToolService.SearchNotesAsync(searchCriteria);
                        return JsonSerializer.Serialize(searchResponse);

                    case "archive_note":
                        var rawArchiveId = operation.Arguments.GetValueOrDefault("id", "");
                        var archiveNoteId = System.Text.RegularExpressions.Regex.Replace(rawArchiveId, @"\[NOTE:(.*?)\]", "$1");
                        
                        if (string.IsNullOrEmpty(archiveNoteId))
                        {
                            throw new Exception("Note ID is required for archive operation");
                        }
                        var archiveResponse = await _noteToolService.ArchiveNoteAsync(archiveNoteId, userId);
                        return JsonSerializer.Serialize(archiveResponse);

                    case "delete_note":
                        var rawDeleteId = operation.Arguments.GetValueOrDefault("id", "");
                        var deleteNoteId = System.Text.RegularExpressions.Regex.Replace(rawDeleteId, @"\[NOTE:(.*?)\]", "$1");
                        
                        if (string.IsNullOrEmpty(deleteNoteId))
                        {
                            throw new Exception("Note ID is required for delete operation");
                        }
                        var deleteResponse = await _noteToolService.DeleteNoteAsync(deleteNoteId, userId);
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

        public async IAsyncEnumerable<ModelUpdate> StreamResponseAsync(string prompt, string modelId)
        {
            // Initial processing step
            yield return new ModelUpdate(
                "step",
                "Processing request...",
                new Dictionary<string, object>
                {
                    { "type", "processing" },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                }
            );

            // Thinking/Analysis step
            yield return new ModelUpdate(
                "step",
                "Analyzing request...",
                new Dictionary<string, object>
                {
                    { "type", "thinking" },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                }
            );

            var rawResponse = await GetRawModelResponse(prompt);
            _logger.LogInformation($"Raw model response: {rawResponse}");

            // Function call step
            yield return new ModelUpdate(
                "step",
                $"Extracted function call: {rawResponse}",
                new Dictionary<string, object>
                {
                    { "type", "function_call" },
                    { "timestamp", DateTime.UtcNow.ToString("o") },
                    { "rawResponse", rawResponse }
                }
            );

            // When database operation starts
            yield return new ModelUpdate(
                "step",
                "Executing database operation...",
                new Dictionary<string, object>
                {
                    { "type", "database_operation" },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                }
            );

            var functionCall = await ExtractFunctionCall(rawResponse);
            // Execute the function call...

            // Result step
            yield return new ModelUpdate(
                "step",
                "Operation completed successfully",
                new Dictionary<string, object>
                {
                    { "type", "result" },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                }
            );
        }

        private string ExtractUserId(string prompt)
        {
            var match = Regex.Match(prompt, @"\[USER:([^\]]+)\]");
            return match.Success ? match.Groups[1].Value : "unknown";
        }

        private async Task<string> GetRawModelResponse(string prompt)
        {
            await Task.Delay(500); // Simulate API call
            return "Sample raw response";
        }

        private async Task<(string Name, Dictionary<string, object> Arguments)> ExtractFunctionCall(string rawResponse)
        {
            _logger.LogInformation($"Parsing function call from: {rawResponse}");
            
            await Task.Delay(100); // Simulate processing
            return ("create_note", new Dictionary<string, object>
            {
                { "title", "Sample Note" },
                { "content", "Sample Content" },
                { "tags", "sample,test" }
            });
        }

        private async Task<string> ExecuteOperation((string Name, Dictionary<string, object> Arguments) functionCall)
        {
            _logger.LogInformation($"Executing operation: {JsonSerializer.Serialize(functionCall)}");
            
            await Task.Delay(500);
            return "Operation completed successfully";
        }

        private async Task EmitExecutionStep(string type, string content, Dictionary<string, object>? metadata = null)
        {
            var step = new ModelUpdate(type, content, metadata);
            await _hubContext.Clients.All.SendAsync("ReceiveExecutionStep", step);
            _logger.LogInformation($"Emitted step: {type} - {content}");
        }
    }
}