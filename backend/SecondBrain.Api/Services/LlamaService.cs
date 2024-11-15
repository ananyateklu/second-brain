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

        private readonly string qwenSystemPrompt = @"You are a natural language interface for a Notes database. 
Please respond with function calls in this format:

function_name(param1=""value1"", param2=""value2"")

Available functions:
1. create_note(title=""string"", content=""string"", isPinned=""bool"", isFavorite=""bool"", isArchived=""bool"", isIdea=""bool"", tags=""comma,separated,tags"")
2. update_note(id=""string"", title=""string"", content=""string"", isPinned=""bool"", isFavorite=""bool"", isArchived=""bool"", tags=""comma,separated,tags"")
3. link_notes(sourceDescription=""string"", targetDescription=""string"")
4. search_notes(query=""string"", tags=""string"", isPinned=""bool"", isFavorite=""bool"", isArchived=""bool"", isIdea=""bool"")

Example response:
create_note(title=""Meeting Notes"", content=""Discussion about project timeline"", tags=""meeting,project"", isPinned=""false"")

Note: Always use double quotes for string values and ""true"" or ""false"" for boolean values.";

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

        public async Task<string> ExecuteDatabaseOperationAsync(string prompt, string messageId)
        {
            string modelId = "nexusraven"; // Default value
            try
            {
                // Extract model ID from prompt
                var modelMatch = Regex.Match(prompt, @"\[MODEL:([^\]]+)\]");
                modelId = modelMatch.Success ? modelMatch.Groups[1].Value : "nexusraven";

                // Remove the model tag from prompt
                prompt = Regex.Replace(prompt, @"\[MODEL:[^\]]+\]", "").Trim();

                _logger.LogInformation("[LlamaService] Executing operation with model: {ModelId}", modelId);

                // Extract user ID and emit initial step
                var userIdMatch = Regex.Match(prompt, @"\[USER:([^\]]+)\]");
                var userId = userIdMatch.Success ? userIdMatch.Groups[1].Value : "unknown";

                // Initial processing step
                await EmitExecutionStep("processing", $"Processing request with {modelId} for user: {userId}", new Dictionary<string, object>
                {
                    { "messageId", messageId },
                    { "userId", userId },
                    { "modelId", modelId },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                });

                // Choose appropriate system prompt based on model
                var systemPromptToUse = modelId.StartsWith("qwen2.5-coder")
                    ? qwenSystemPrompt
                    : systemPrompt;

                var fullPrompt = $"{systemPromptToUse}\n\nUser Input: {prompt}";

                // Thinking step
                await EmitExecutionStep("thinking", $"Model {modelId} analyzing request and determining required operation...", new Dictionary<string, object>
                {
                    { "messageId", messageId },
                    { "modelId", modelId },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                });

                string response = string.Empty;

                response = await GenerateTextAsync(fullPrompt, modelId);
                _logger.LogInformation("Raw model response: {Response}", response);

                // Function call step
                await EmitExecutionStep("function_call", $"Extracted operation from model response: {response}", new Dictionary<string, object>
                {
                    { "messageId", messageId },
                    { "rawResponse", response },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                });

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
                            // Database operation step
                            await EmitExecutionStep("database_operation", "Executing database operation...", new Dictionary<string, object>
                            {
                                { "messageId", messageId },
                                { "operation", operation },
                                { "timestamp", DateTime.UtcNow.ToString("o") }
                            });

                            operation.OriginalPrompt = prompt;
                            var result = await ExecuteOperation(operation);

                            // Result step
                            await EmitExecutionStep("result", "Operation completed successfully", new Dictionary<string, object>
                            {
                                { "messageId", messageId },
                                { "result", result },
                                { "timestamp", DateTime.UtcNow.ToString("o") }
                            });

                            return result;
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
                    // Add database operation step
                    await EmitExecutionStep("database_operation", "Executing database operation...", new Dictionary<string, object>
                    {
                        { "messageId", messageId },
                        { "operation", functionCall },
                        { "timestamp", DateTime.UtcNow.ToString("o") }
                    });

                    // Add the original prompt to the operation for user context
                    functionCall.OriginalPrompt = prompt;
                    var result = await ExecuteOperation(functionCall);

                    // Add result step
                    await EmitExecutionStep("result", "Operation completed successfully", new Dictionary<string, object>
                    {
                        { "messageId", messageId },
                        { "result", result },
                        { "timestamp", DateTime.UtcNow.ToString("o") }
                    });

                    return result;
                }

                throw new Exception($"Could not parse response in either JSON or function call format: {response}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing database operation with model {ModelId}", modelId);
                throw;
            }
        }

        private DatabaseOperation? ParseFunctionCall(string response)
        {
            try
            {
                // Try to parse function call format
                var functionMatch = Regex.Match(
                    response,
                    @"(?:Call:\s*)?(\w+)\s*\((.*?)\)",
                    RegexOptions.Singleline
                );

                if (!functionMatch.Success)
                {
                    return null;
                }

                var function = functionMatch.Groups[1].Value;
                var argsString = functionMatch.Groups[2].Value;

                var arguments = new Dictionary<string, string>();

                // Match both single and double quotes, handle arrays and simple values
                var argMatches = Regex.Matches(
                    argsString,
                    @"(\w+)\s*=\s*(?:'([^']*)'|""([^""]*)""|\[(.*?)\]|([^,\s]*))",
                    RegexOptions.Singleline
                );

                foreach (Match argMatch in argMatches)
                {
                    var key = argMatch.Groups[1].Value;
                    string value = null;

                    if (argMatch.Groups[2].Success) // Single-quoted value
                    {
                        value = argMatch.Groups[2].Value;
                    }
                    else if (argMatch.Groups[3].Success) // Double-quoted value
                    {
                        value = argMatch.Groups[3].Value;
                    }
                    else if (argMatch.Groups[4].Success) // Array value
                    {
                        value = argMatch.Groups[4].Value;
                        // Convert array to comma-separated string
                        value = value.Replace("'", "")
                                     .Replace("[", "")
                                     .Replace("]", "")
                                     .Replace(" ", "");
                    }
                    else if (argMatch.Groups[5].Success) // Bare value
                    {
                        value = argMatch.Groups[5].Value;
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

                // Add model detection
                var modelId = operation.OriginalPrompt != null && operation.OriginalPrompt.Contains("[MODEL:")
                    ? Regex.Match(operation.OriginalPrompt, @"\[MODEL:([^\]]+)\]").Groups[1].Value
                    : "unknown";

                // Special handling for Qwen models
                if (modelId.StartsWith("qwen2.5-coder"))
                {
                    // Qwen tends to return function calls in a different format
                    // We need to parse its response differently
                    return await HandleQwenOperation(operation, userId);
                }

                // Existing operation handling for other models...
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
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        private async Task<string> HandleQwenOperation(DatabaseOperation operation, string userId)
        {
            try
            {
                // Qwen typically returns function calls in this format:
                // create_note(title="Example", content="Content", tags="tag1,tag2")
                var functionMatch = Regex.Match(operation.ToString(), @"(\w+)\((.*?)\)");
                if (!functionMatch.Success)
                {
                    throw new Exception("Could not parse Qwen function call format");
                }

                var function = functionMatch.Groups[1].Value;
                var argsString = functionMatch.Groups[2].Value;

                // Parse arguments from key=value pairs
                var args = new Dictionary<string, string>();
                var argMatches = Regex.Matches(argsString, @"(\w+)=""([^""]*)""|(\w+)='([^']*)'");
                foreach (Match match in argMatches)
                {
                    var key = match.Groups[1].Value;
                    var value = match.Groups[2].Value;
                    args[key] = value;
                }

                // Create a new operation with parsed data
                var parsedOperation = new DatabaseOperation
                {
                    Function = function,
                    Arguments = args,
                    OriginalPrompt = operation.OriginalPrompt
                };

                // Now execute the parsed operation using existing logic
                switch (function.ToLower())
                {
                    case "create_note":
                        var createRequest = new NoteToolRequest
                        {
                            Title = args.GetValueOrDefault("title", ""),
                            Content = args.GetValueOrDefault("content", ""),
                            IsPinned = bool.Parse(args.GetValueOrDefault("isPinned", "false")),
                            IsFavorite = bool.Parse(args.GetValueOrDefault("isFavorite", "false")),
                            IsArchived = bool.Parse(args.GetValueOrDefault("isArchived", "false")),
                            IsIdea = bool.Parse(args.GetValueOrDefault("isIdea", "false")),
                            Tags = args.GetValueOrDefault("tags", ""),
                            UserId = userId
                        };
                        var createResponse = await _noteToolService.CreateNoteAsync(createRequest);
                        return JsonSerializer.Serialize(createResponse);

                    // Add other cases as needed...

                    default:
                        throw new Exception($"Unknown function: {function}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling Qwen operation");
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = $"Failed to execute Qwen operation: {ex.Message}"
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
                    return JsonSerializer.Serialize(new
                    {
                        success = false,
                        error = $"Could not find source note matching '{sourceDescription}'"
                    });
                }

                // Find potential target notes
                var targetNotes = await _noteToolService.FindNotesByDescriptionAsync(targetDescription, userId);
                if (!targetNotes.Any())
                {
                    return JsonSerializer.Serialize(new
                    {
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
                return JsonSerializer.Serialize(new
                {
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

        private async Task EmitExecutionStep(string type, string content, Dictionary<string, object> metadata)
        {
            var step = new ModelUpdate(type, content, metadata);
            await _hubContext.Clients.All.SendAsync("ReceiveExecutionStep", step);
            _logger.LogInformation($"[SignalR] Emitted step: {type} - {content}");
        }
    }
}