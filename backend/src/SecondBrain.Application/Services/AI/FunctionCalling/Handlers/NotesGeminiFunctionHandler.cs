using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.AI.FunctionCalling.Handlers;

/// <summary>
/// Gemini native function handler for Notes management.
/// Dynamically creates FunctionDeclarations from NotesPlugin methods
/// and handles execution using the same plugin infrastructure as Semantic Kernel.
/// </summary>
public class NotesGeminiFunctionHandler : IGeminiFunctionHandler
{
    private readonly IParallelNoteRepository _noteRepository;
    private readonly IRagService? _ragService;
    private readonly RagSettings? _ragSettings;
    private readonly IStructuredOutputService? _structuredOutputService;
    private readonly ILogger<NotesGeminiFunctionHandler> _logger;
    private readonly NotesPlugin _plugin;
    private readonly Dictionary<string, MethodInfo> _methods;
    private readonly FunctionDeclaration _declaration;

    // Maps Gemini function calls to NotesPlugin methods
    // Each function is exposed individually for better control
    private static readonly string[] ExposedFunctions = new[]
    {
        "CreateNote",
        "GetNote",
        "UpdateNote",
        "DeleteNote",
        "SearchNotes",
        "SemanticSearch",
        "ListRecentNotes",
        "ListAllNotes",
        "AppendToNote",
        "SearchByTags",
        "ListAllTags",
        "MoveToFolder",
        "ListFolders",
        "GetNoteStats",
        "GetNotesByDateRange",
        "FindRelatedNotes",
        "DuplicateNote",
        "ArchiveNote",
        "UnarchiveNote",
        "ListArchivedNotes",
        "SummarizeNote",
        "CompareNotes"
    };

    public string FunctionName => "notes_management";

    public NotesGeminiFunctionHandler(
        IParallelNoteRepository noteRepository,
        IRagService? ragService,
        ILogger<NotesGeminiFunctionHandler> logger,
        Microsoft.Extensions.Options.IOptions<RagSettings>? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null)
    {
        _noteRepository = noteRepository;
        _ragService = ragService;
        _ragSettings = ragSettings?.Value;
        _structuredOutputService = structuredOutputService;
        _logger = logger;
        _plugin = new NotesPlugin(noteRepository, ragService, _ragSettings, structuredOutputService);
        _methods = new Dictionary<string, MethodInfo>(StringComparer.OrdinalIgnoreCase);

        // Build method lookup from NotesPlugin
        foreach (var method in typeof(NotesPlugin).GetMethods())
        {
            var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
            if (funcAttr != null)
            {
                var funcName = funcAttr.Name ?? method.Name;
                _methods[funcName] = method;
            }
        }

        // Build the combined function declaration
        // We use a dispatcher pattern with an "action" parameter
        _declaration = BuildCombinedDeclaration();
    }

    /// <summary>
    /// Builds a combined FunctionDeclaration that acts as a dispatcher for all note operations.
    /// This approach is simpler than registering 20+ separate functions.
    /// </summary>
    private FunctionDeclaration BuildCombinedDeclaration()
    {
        return new FunctionDeclaration
        {
            Name = FunctionName,
            Description = "Manages user notes - create, read, update, delete, search, and organize notes. " +
                         "Use 'action' parameter to specify the operation: " +
                         string.Join(", ", ExposedFunctions),
            Parameters = new Schema
            {
                Type = Google.GenAI.Types.Type.OBJECT,
                Properties = new Dictionary<string, Schema>
                {
                    ["action"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "The note operation to perform. One of: " + string.Join(", ", ExposedFunctions),
                        Enum = ExposedFunctions.ToList()
                    },
                    // Common parameters for various operations
                    ["noteId"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "The ID of the note (for GetNote, UpdateNote, DeleteNote, AppendToNote, etc.)"
                    },
                    ["title"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Title for the note (required for CreateNote, optional for UpdateNote)"
                    },
                    ["content"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Content for the note (required for CreateNote, optional for UpdateNote)"
                    },
                    ["contentToAppend"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Content to append to an existing note (for AppendToNote)"
                    },
                    ["query"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Search query (for SearchNotes, SemanticSearch)"
                    },
                    ["tags"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Comma-separated tags (for CreateNote, UpdateNote, SearchByTags)"
                    },
                    ["folder"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Folder name (for MoveToFolder)"
                    },
                    ["maxResults"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.INTEGER,
                        Description = "Maximum number of results to return (default: 10)"
                    },
                    ["includeArchived"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.BOOLEAN,
                        Description = "Whether to include archived notes (default: false)"
                    },
                    ["requireAll"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.BOOLEAN,
                        Description = "For SearchByTags: require all tags vs any tag (default: false)"
                    },
                    ["startDate"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Start date for date range queries (for GetNotesByDateRange)"
                    },
                    ["endDate"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "End date for date range queries (for GetNotesByDateRange)"
                    },
                    ["dateField"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "Date field to filter on: 'created' or 'updated' (default: 'created')"
                    },
                    ["newTitle"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.STRING,
                        Description = "New title for duplicated note (for DuplicateNote)"
                    },
                    ["addNewline"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.BOOLEAN,
                        Description = "Whether to add a newline before appended content (default: true)"
                    },
                    ["skip"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.INTEGER,
                        Description = "Number of notes to skip for pagination (for ListAllNotes)"
                    },
                    ["limit"] = new Schema
                    {
                        Type = Google.GenAI.Types.Type.INTEGER,
                        Description = "Maximum notes to return for pagination (for ListAllNotes)"
                    }
                },
                Required = new List<string> { "action" }
            }
        };
    }

    public FunctionDeclaration GetDeclaration() => _declaration;

    public async Task<FunctionExecutionResult> ExecuteAsync(
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Set user context for the plugin
            _plugin.SetCurrentUserId(userId);
            _plugin.SetAgentRagEnabled(true);

            // Extract the action
            if (!arguments.TryGetProperty("action", out var actionElement))
            {
                return FunctionExecutionResult.Fail("Missing required 'action' parameter");
            }

            var action = actionElement.GetString();
            if (string.IsNullOrEmpty(action))
            {
                return FunctionExecutionResult.Fail("Action parameter cannot be empty");
            }

            _logger.LogDebug("Executing Gemini function '{Action}' for user '{UserId}'", action, userId);

            // Find the method to invoke
            if (!_methods.TryGetValue(action, out var method))
            {
                return FunctionExecutionResult.Fail($"Unknown action: {action}. Valid actions: {string.Join(", ", ExposedFunctions)}");
            }

            // Invoke the method with arguments
            var result = await InvokeMethodAsync(method, arguments);

            _logger.LogDebug("Function '{Action}' completed successfully", action);

            return FunctionExecutionResult.Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Gemini function");
            return FunctionExecutionResult.Fail($"Error: {ex.Message}");
        }
    }

    private async Task<object?> InvokeMethodAsync(MethodInfo method, JsonElement arguments)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramName = param.Name!;

            // Try to get value from arguments
            if (arguments.TryGetProperty(paramName, out var value))
            {
                args[i] = ConvertJsonElementToType(value, param.ParameterType);
            }
            else if (TryGetValueWithAliases(arguments, paramName, out var aliasValue))
            {
                args[i] = ConvertJsonElementToType(aliasValue, param.ParameterType);
            }
            else if (param.HasDefaultValue)
            {
                args[i] = param.DefaultValue;
            }
            else
            {
                args[i] = GetDefaultForType(param.ParameterType);
            }
        }

        var result = method.Invoke(_plugin, args);

        if (result is Task task)
        {
            await task;
            var resultProperty = task.GetType().GetProperty("Result");
            return resultProperty?.GetValue(task);
        }

        return result;
    }

    // Parameter aliases for common name variations
    private static readonly Dictionary<string, string[]> ParameterAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        { "content", new[] { "body", "text", "note_content", "noteContent" } },
        { "title", new[] { "name", "heading", "subject" } },
        { "query", new[] { "search", "searchQuery", "search_query", "q" } },
        { "tags", new[] { "labels", "categories", "tag" } },
        { "noteId", new[] { "note_id", "id", "noteID" } },
        { "contentToAppend", new[] { "content_to_append", "appendContent", "append_content" } },
        { "newTitle", new[] { "new_title", "duplicateTitle" } }
    };

    private static bool TryGetValueWithAliases(JsonElement obj, string paramName, out JsonElement value)
    {
        value = default;

        if (ParameterAliases.TryGetValue(paramName, out var aliases))
        {
            foreach (var alias in aliases)
            {
                if (obj.TryGetProperty(alias, out value))
                {
                    return true;
                }
            }
        }

        // Case-insensitive fallback
        foreach (var prop in obj.EnumerateObject())
        {
            if (prop.Name.Equals(paramName, StringComparison.OrdinalIgnoreCase) && prop.Name != paramName)
            {
                value = prop.Value;
                return true;
            }
        }

        return false;
    }

    private static object? ConvertJsonElementToType(JsonElement element, System.Type targetType)
    {
        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        if (element.ValueKind == JsonValueKind.Null)
            return null;

        try
        {
            if (underlyingType == typeof(string))
                return element.GetString();
            if (underlyingType == typeof(int))
                return element.GetInt32();
            if (underlyingType == typeof(long))
                return element.GetInt64();
            if (underlyingType == typeof(float))
                return element.GetSingle();
            if (underlyingType == typeof(double))
                return element.GetDouble();
            if (underlyingType == typeof(bool))
                return element.GetBoolean();

            return element.ToString();
        }
        catch
        {
            return element.ToString();
        }
    }

    private static object? GetDefaultForType(System.Type type)
    {
        if (type == typeof(string))
            return null;
        if (type.IsValueType)
            return Activator.CreateInstance(type);
        return null;
    }
}
