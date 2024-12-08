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
using System.Text;
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Services
{
    public class LlamaService : ILlamaService
    {
        private const string TimestampKey = "timestamp";
        private const string TitleField = "title";
        private const string IsPinnedField = "isPinned";
        private const string IsFavoriteField = "isFavorite";
        private const string IsArchivedField = "isArchived";
        private const string DefaultBoolValue = "false";
        private const string NoteIdPattern = @"\[NOTE:(.*?)\]";
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
            var ollamaUri = new Uri(configuration.GetValue<string>("Llama:OllamaUri") ?? throw new InvalidOperationException("Llama:OllamaUri configuration is required"));
            _ollamaClient = new OllamaApiClient(ollamaUri);
        }

        public async Task<string> GenerateTextAsync(string prompt, string modelName, int numPredict = 2048)
        {
            try
            {
                _ollamaClient.SelectedModel = modelName;
                var responseBuilder = new StringBuilder();

                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    if (stream?.Response != null)
                    {
                        responseBuilder.Append(stream.Response);
                    }
                }

                return responseBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating text with Llama model {ModelName}.", modelName);
                throw new LlamaException($"Failed to generate text with Llama model {modelName}", ex);
            }
        }

        public async Task<string> ExecuteDatabaseOperationAsync(string prompt, string messageId, int numPredict = 2048)
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

                // Extract user ID
                var userIdMatch = Regex.Match(prompt, @"\[USER:([^\]]+)\]");
                var userId = userIdMatch.Success ? userIdMatch.Groups[1].Value : "unknown";

                // Initial processing step
                await EmitExecutionStep(
                    ExecutionStepType.Processing,
                    $"Processing request with {modelId} for user: {userId}",
                    new Dictionary<string, object> {
                        { "messageId", messageId },
                        { "userId", userId },
                        { "modelId", modelId }
                    }
                );

                // Emit processing sub-steps
                await EmitProcessingSubSteps(messageId, userId, modelId);

                // Choose appropriate system prompt based on model
                var systemPromptToUse = modelId.StartsWith("qwen2.5-coder")
                    ? qwenSystemPrompt
                    : systemPrompt;

                var fullPrompt = $"{systemPromptToUse}\n\nUser Input: {prompt}";

                // Thinking step
                await EmitExecutionStep(
                    ExecutionStepType.Thinking,
                    $"Model {modelId} analyzing request and determining required operation...",
                    new Dictionary<string, object> {
                        { "messageId", messageId },
                        { "modelId", modelId }
                    }
                );

                // Emit thinking sub-steps
                await EmitThinkingSubSteps(messageId, modelId);

                string response = await GenerateTextAsync(fullPrompt, modelId, numPredict);
                _logger.LogInformation("Raw model response: {Response}", response);

                // Function call step
                await EmitExecutionStep(
                    ExecutionStepType.FunctionCall,
                    $"Extracted operation from model response: {response}",
                    new Dictionary<string, object> {
                        { "messageId", messageId },
                        { "rawResponse", response }
                    }
                );

                // Emit function call sub-steps
                await EmitFunctionCallSubSteps(messageId, response);

                // Try to parse as JSON first
                try
                {
                    var jsonStart = response.IndexOf('{');
                    var jsonEnd = response.LastIndexOf('}');

                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonPart = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                        var jsonOperation = JsonSerializer.Deserialize<DatabaseOperation>(jsonPart);
                        if (jsonOperation != null)
                        {
                            await EmitExecutionStep(
                                ExecutionStepType.DatabaseOperation,
                                "Executing database operation...",
                                new Dictionary<string, object> {
                                    { "messageId", messageId },
                                    { "operation", jsonOperation }
                                }
                            );

                            await EmitDatabaseOperationSubSteps(messageId, jsonOperation);

                            jsonOperation.OriginalPrompt = prompt;
                            var result = await ExecuteOperation(jsonOperation);

                            // Result step
                            await EmitExecutionStep(
                                ExecutionStepType.Result,
                                "Operation completed successfully",
                                new Dictionary<string, object> {
                                    { "messageId", messageId },
                                    { "result", result }
                                }
                            );

                            // Emit result sub-steps
                            await EmitResultSubSteps(messageId, result);

                            return result;
                        }
                    }

                    // If JSON parsing fails, try function call format
                    var operation = ParseFunctionCall(response);
                    if (operation != null)
                    {
                        // Database operation step
                        await EmitExecutionStep(
                            ExecutionStepType.DatabaseOperation,
                            "Executing database operation...",
                            new Dictionary<string, object> {
                                { "messageId", messageId },
                                { "operation", operation }
                            }
                        );

                        // Emit database operation sub-steps
                        await EmitDatabaseOperationSubSteps(messageId, operation);

                        operation.OriginalPrompt = prompt;
                        var result = await ExecuteOperation(operation);

                        // Result step
                        await EmitExecutionStep(
                            ExecutionStepType.Result,
                            "Operation completed successfully",
                            new Dictionary<string, object> {
                                { "messageId", messageId },
                                { "result", result }
                            }
                        );

                        // Emit result sub-steps
                        await EmitResultSubSteps(messageId, result);

                        return result;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing database operation");
                    throw new LlamaException("Failed to execute database operation", ex);
                }

                throw new LlamaException("Failed to parse model response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ExecuteDatabaseOperationAsync");
                throw new LlamaException("Failed to execute database operation", ex);
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

                var matches = argMatches.Select(m => m.Groups)
                    .Select(g => new
                    {
                        Key = g[1].Value,
                        Value = GetMatchValue(g)
                    })
                    .Where(x => x.Value != null);

                foreach (var match in matches)
                {
                    arguments[match.Key] = match.Value;
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

        private static string GetMatchValue(GroupCollection groups)
        {
            if (groups[2].Success) return groups[2].Value;
            if (groups[3].Success) return groups[3].Value;
            if (groups[4].Success) 
                return groups[4].Value.Replace("'", "").Replace("[", "").Replace("]", "").Replace(" ", "");
            if (groups[5].Success) return groups[5].Value;
            return string.Empty;
        }

        private async Task<string> ExecuteOperation(DatabaseOperation operation)
        {
            try
            {
                string userId = ValidateAndExtractUserId(operation);
                var modelId = ExtractModelId(operation);

                if (modelId.StartsWith("qwen2.5-coder"))
                {
                    return await HandleQwenOperation(operation, userId);
                }

                return await ExecuteStandardOperation(operation, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing operation {Function}", operation.Function);
                return JsonSerializer.Serialize(new { success = false, error = ex.Message });
            }
        }

        private async Task<string> ExecuteStandardOperation(DatabaseOperation operation, string userId)
        {
            switch (operation.Function.ToLower())
            {
                case "create_note":
                    return await HandleCreateNote(operation, userId);
                case "update_note":
                    return await HandleUpdateNote(operation, userId);
                case "link_notes":
                    return await HandleLinkNotes(operation, userId);
                case "unlink_notes":
                    return await HandleUnlinkNotes(operation, userId);
                case "search_notes":
                    return await HandleSearchNotes(operation, userId);
                case "archive_note":
                    return await HandleArchiveNote(operation, userId);
                case "delete_note":
                    return await HandleDeleteNote(operation, userId);
                case "get_item":
                    return await HandleGetItem(operation);
                default:
                    throw new LlamaException($"Unknown function: {operation.Function}");
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
                    throw new LlamaException("Could not parse Qwen function call format");
                }

                var function = functionMatch.Groups[1].Value;
                var argsString = functionMatch.Groups[2].Value;

                // Parse arguments from key=value pairs
                var args = new Dictionary<string, string>();
                var matches = Regex.Matches(argsString, @"(\w+)=""([^""]*)""|(\w+)='([^']*)'")
                    .Select(match => match.Groups)
                    .Select(g => new { Key = g[1].Value, Value = g[2].Value })
                    .Where(x => !string.IsNullOrEmpty(x.Value));

                foreach (var match in matches)
                {
                    args[match.Key] = match.Value;
                }

                // Now execute the parsed operation using existing logic
                switch (function.ToLower())
                {
                    case "create_note":
                        var createRequest = new NoteToolRequest
                        {
                            Title = args.GetValueOrDefault(TitleField, ""),
                            Content = args.GetValueOrDefault("content", ""),
                            IsPinned = bool.Parse(args.GetValueOrDefault("isPinned", DefaultBoolValue)),
                            IsFavorite = bool.Parse(args.GetValueOrDefault("isFavorite", DefaultBoolValue)),
                            IsArchived = bool.Parse(args.GetValueOrDefault("isArchived", DefaultBoolValue)),
                            IsIdea = bool.Parse(args.GetValueOrDefault("isIdea", DefaultBoolValue)),
                            Tags = args.GetValueOrDefault("tags", ""),
                            UserId = userId
                        };
                        var createResponse = await _noteToolService.CreateNoteAsync(createRequest);
                        return JsonSerializer.Serialize(createResponse);

                    // Add other cases as needed...

                    default:
                        throw new LlamaException($"Unknown function: {function}");
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

        private string ValidateAndExtractUserId(DatabaseOperation operation)
        {
            var userId = ExtractUserId(operation);
            if (string.IsNullOrEmpty(userId))
            {
                throw new LlamaException("User context not found in operation");
            }
            return userId;
        }

        private static string ExtractModelId(DatabaseOperation operation)
        {
            var prompt = operation.OriginalPrompt ?? "";
            var modelMatch = Regex.Match(prompt, @"\[MODEL:([^\]]+)\]");
            return modelMatch.Success ? modelMatch.Groups[1].Value : "nexusraven";
        }

        private async Task<string> HandleCreateNote(DatabaseOperation operation, string userId)
        {
            var request = new NoteToolRequest
            {
                Title = operation.Arguments.GetValueOrDefault(TitleField, ""),
                Content = operation.Arguments.GetValueOrDefault("content", ""),
                IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault(IsPinnedField, DefaultBoolValue)),
                IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault(IsFavoriteField, DefaultBoolValue)),
                IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault(IsArchivedField, DefaultBoolValue)),
                IsIdea = bool.Parse(operation.Arguments.GetValueOrDefault("isIdea", DefaultBoolValue)),
                Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                UserId = userId
            };
            var response = await _noteToolService.CreateNoteAsync(request);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleUpdateNote(DatabaseOperation operation, string userId)
        {
            var rawIdOrTitle = operation.Arguments.GetValueOrDefault("id", "");
            var cleanIdOrTitle = Regex.Replace(rawIdOrTitle, NoteIdPattern, "$1");

            if (string.IsNullOrEmpty(cleanIdOrTitle))
            {
                throw new LlamaException("Note ID or title is required for update operation");
            }

            var note = await _noteToolService.GetNoteByIdAsync(cleanIdOrTitle, userId);
            if (note == null)
            {
                var searchTitle = operation.Arguments.GetValueOrDefault(TitleField, cleanIdOrTitle);
                var matchingNotes = await _noteToolService.FindNotesByDescriptionAsync(searchTitle, userId);
                if (!matchingNotes.Any())
                {
                    throw new LlamaException($"Could not find note matching '{searchTitle}'");
                }
                note = ChooseBestNoteMatch(matchingNotes, searchTitle);
            }

            var request = new NoteToolRequest
            {
                Title = operation.Arguments.GetValueOrDefault(TitleField, note.Title),
                Content = operation.Arguments.GetValueOrDefault("content", note.Content),
                IsPinned = bool.Parse(operation.Arguments.GetValueOrDefault(IsPinnedField, note.IsPinned.ToString())),
                IsFavorite = bool.Parse(operation.Arguments.GetValueOrDefault(IsFavoriteField, note.IsFavorite.ToString())),
                IsArchived = bool.Parse(operation.Arguments.GetValueOrDefault(IsArchivedField, note.IsArchived.ToString())),
                Tags = operation.Arguments.GetValueOrDefault("tags", note.Tags ?? ""),
                UserId = userId
            };

            var response = await _noteToolService.UpdateNoteAsync(note.Id, request);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleLinkNotes(DatabaseOperation operation, string userId)
        {
            var sourceDesc = operation.Arguments.GetValueOrDefault("sourceDescription", "");
            var targetDesc = operation.Arguments.GetValueOrDefault("targetDescription", "");

            if (string.IsNullOrEmpty(sourceDesc) || string.IsNullOrEmpty(targetDesc))
            {
                throw new LlamaException("Source and target note descriptions are required for linking");
            }

            return await HandleNoteLinking(sourceDesc, targetDesc, userId);
        }

        private async Task<string> HandleUnlinkNotes(DatabaseOperation operation, string userId)
        {
            var rawSourceId = operation.Arguments.GetValueOrDefault("sourceId", "");
            var sourceId = Regex.Replace(rawSourceId, NoteIdPattern, "$1");

            var targetIdsStr = operation.Arguments.GetValueOrDefault("targetIds", "");
            var targetIds = targetIdsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                      .Select(id => Regex.Replace(id.Trim(), NoteIdPattern, "$1"))
                                      .ToArray();

            if (string.IsNullOrEmpty(sourceId) || !targetIds.Any())
            {
                throw new LlamaException("Source note ID and target note IDs are required for unlink operation");
            }

            var response = await _noteToolService.UnlinkNotesAsync(sourceId, targetIds, userId);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleSearchNotes(DatabaseOperation operation, string userId)
        {
            var searchCriteria = new NoteToolSearchCriteria
            {
                Query = operation.Arguments.GetValueOrDefault("query", ""),
                Tags = operation.Arguments.GetValueOrDefault("tags", ""),
                UserId = userId
            };

            if (operation.Arguments.TryGetValue(IsPinnedField, out var isPinnedStr) && isPinnedStr.ToLower() != "null")
            {
                searchCriteria.IsPinned = bool.Parse(isPinnedStr);
            }

            if (operation.Arguments.TryGetValue(IsFavoriteField, out var isFavoriteStr) && isFavoriteStr.ToLower() != "null")
            {
                searchCriteria.IsFavorite = bool.Parse(isFavoriteStr);
            }

            if (operation.Arguments.TryGetValue(IsArchivedField, out var isArchivedStr) && isArchivedStr.ToLower() != "null")
            {
                searchCriteria.IsArchived = bool.Parse(isArchivedStr);
            }

            var response = await _noteToolService.SearchNotesAsync(searchCriteria);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleArchiveNote(DatabaseOperation operation, string userId)
        {
            var rawArchiveId = operation.Arguments.GetValueOrDefault("id", "");
            var archiveNoteId = Regex.Replace(rawArchiveId, NoteIdPattern, "$1");

            if (string.IsNullOrEmpty(archiveNoteId))
            {
                throw new LlamaException("Note ID is required for archive operation");
            }

            var response = await _noteToolService.ArchiveNoteAsync(archiveNoteId, userId);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleDeleteNote(DatabaseOperation operation, string userId)
        {
            var rawDeleteId = operation.Arguments.GetValueOrDefault("id", "");
            var deleteNoteId = Regex.Replace(rawDeleteId, NoteIdPattern, "$1");

            if (string.IsNullOrEmpty(deleteNoteId))
            {
                throw new LlamaException("Note ID is required for delete operation");
            }

            var response = await _noteToolService.DeleteNoteAsync(deleteNoteId, userId);
            return JsonSerializer.Serialize(response);
        }

        private async Task<string> HandleGetItem(DatabaseOperation operation)
        {
            if (!operation.Arguments.ContainsKey("key"))
            {
                throw new LlamaException("Get operation requires a key");
            }

            var item = await _nexusStorage.GetItemAsync(operation.Arguments["key"]);
            return JsonSerializer.Serialize(new { success = true, item });
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

        private static double CalculateSimilarityScore(Note note, string description)
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

        private async Task EmitExecutionStep(
            ExecutionStepType type, 
            string content, 
            Dictionary<string, object> metadata, 
            ExecutionStepType? parentStep = null)
        {
            metadata[TimestampKey] = DateTime.UtcNow.ToString("o");
            if (parentStep.HasValue)
            {
                metadata["parentStep"] = parentStep.Value;
            }
            var step = new ModelUpdate(type, content, metadata);
            await _hubContext.Clients.All.SendAsync("ReceiveExecutionStep", step);
            _logger.LogInformation("[SignalR] Emitted step: {StepType} - {Content}", type, content);
        }

        private async Task EmitProcessingSubSteps(string messageId, string userId, string modelId)
        {
            // Model Initialization
            await EmitExecutionStep(
                ExecutionStepType.ModelInitialization,
                "Initializing model and loading parameters",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "modelId", modelId }
                },
                ExecutionStepType.Processing
            );

            // Context Preparation
            await EmitExecutionStep(
                ExecutionStepType.ContextPreparation,
                "Preparing context and user information",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "userId", userId }
                },
                ExecutionStepType.Processing
            );

            // Input Validation
            await EmitExecutionStep(
                ExecutionStepType.InputValidation,
                "Validating input parameters",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Processing
            );

            // Token Analysis
            await EmitExecutionStep(
                ExecutionStepType.TokenAnalysis,
                "Analyzing input tokens and limitations",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Processing
            );
        }

        private async Task EmitThinkingSubSteps(string messageId, string modelId)
        {
            // Prompt Analysis
            await EmitExecutionStep(
                ExecutionStepType.PromptAnalysis,
                "Analyzing prompt structure and intent",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "modelId", modelId }
                },
                ExecutionStepType.Thinking
            );

            // Parameter Extraction
            await EmitExecutionStep(
                ExecutionStepType.ParameterExtraction,
                "Extracting key parameters from input",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Thinking
            );

            // Operation Selection
            await EmitExecutionStep(
                ExecutionStepType.OperationSelection,
                "Determining appropriate operation",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Thinking
            );

            // Validation Check
            await EmitExecutionStep(
                ExecutionStepType.ValidationCheck,
                "Validating operation parameters",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Thinking
            );
        }

        private async Task EmitFunctionCallSubSteps(string messageId, string response)
        {
            // Argument Parsing
            await EmitExecutionStep(
                ExecutionStepType.ArgumentParsing,
                "Parsing function arguments",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "rawResponse", response }
                },
                ExecutionStepType.FunctionCall
            );

            // Parameter Validation
            await EmitExecutionStep(
                ExecutionStepType.ParameterValidation,
                "Validating parameter types and values",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.FunctionCall
            );

            // Function Preparation
            await EmitExecutionStep(
                ExecutionStepType.FunctionPreparation,
                "Preparing function call",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.FunctionCall
            );

            // Execution Plan
            await EmitExecutionStep(
                ExecutionStepType.ExecutionPlan,
                "Generating execution plan",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.FunctionCall
            );
        }

        private async Task EmitDatabaseOperationSubSteps(string messageId, DatabaseOperation operation)
        {
            // Connection Check
            await EmitExecutionStep(
                ExecutionStepType.ConnectionCheck,
                "Checking database connection",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.DatabaseOperation
            );

            // Transaction Start
            await EmitExecutionStep(
                ExecutionStepType.TransactionStart,
                "Starting database transaction",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.DatabaseOperation
            );

            // Query Preparation
            await EmitExecutionStep(
                ExecutionStepType.QueryPreparation,
                "Preparing database query",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "operation", operation }
                },
                ExecutionStepType.DatabaseOperation
            );

            // Execution Status
            await EmitExecutionStep(
                ExecutionStepType.ExecutionStatus,
                "Executing database operation",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.DatabaseOperation
            );

            // Transaction Commit
            await EmitExecutionStep(
                ExecutionStepType.TransactionCommit,
                "Committing transaction",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.DatabaseOperation
            );
        }

        private async Task EmitResultSubSteps(string messageId, string result)
        {
            // Result Processing
            await EmitExecutionStep(
                ExecutionStepType.ResultProcessing,
                "Processing operation result",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Result
            );

            // Response Formatting
            await EmitExecutionStep(
                ExecutionStepType.ResponseFormatting,
                "Formatting response data",
                new Dictionary<string, object> {
                    { "messageId", messageId },
                    { "result", result }
                },
                ExecutionStepType.Result
            );

            // Performance Metrics
            await EmitExecutionStep(
                ExecutionStepType.PerformanceMetrics,
                "Calculating operation metrics",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Result
            );

            // Completion Status
            await EmitExecutionStep(
                ExecutionStepType.CompletionStatus,
                "Finalizing operation",
                new Dictionary<string, object> {
                    { "messageId", messageId }
                },
                ExecutionStepType.Result
            );
        }
    }
}