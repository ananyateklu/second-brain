using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.AI;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using System.Text;
using System.Text.Json;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class AgentController : ControllerBase
{
    /// <summary>
    /// Maximum allowed response size in characters (512KB) to prevent memory exhaustion
    /// </summary>
    private const int MaxResponseSizeChars = 512 * 1024;

    private readonly IAgentService _agentService;
    private readonly IChatRepository _chatRepository;
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<AgentController> _logger;

    public AgentController(
        IAgentService agentService,
        IChatRepository chatRepository,
        IUserPreferencesService userPreferencesService,
        ILogger<AgentController> logger)
    {
        _agentService = agentService;
        _chatRepository = chatRepository;
        _userPreferencesService = userPreferencesService;
        _logger = logger;
    }

    /// <summary>
    /// Stream an agent message with tool execution capabilities
    /// </summary>
    [HttpPost("conversations/{id}/messages/stream")]
    [EnableRateLimiting("ai-requests")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task StreamAgentMessage(
        string id,
        [FromBody] AgentMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            await Response.WriteAsync("{\"error\":\"Not authenticated\"}");
            return;
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsync("{\"error\":\"Message content is required\"}");
            return;
        }

        try
        {
            // Set SSE headers
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");
            Response.Headers.Append("X-Accel-Buffering", "no");

            _logger.LogInformation("Starting agent streaming. ConversationId: {ConversationId}, UserId: {UserId}",
                id, userId);

            // Get the conversation
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                await Response.WriteAsync("event: error\ndata: {\"error\":\"Conversation not found\"}\n\n");
                await Response.Body.FlushAsync(cancellationToken);
                return;
            }

            // Verify conversation belongs to user
            if (conversation.UserId != userId)
            {
                _logger.LogWarning("User attempted to send agent message to conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}",
                    userId, id);
                await Response.WriteAsync("event: error\ndata: {\"error\":\"Access denied\"}\n\n");
                await Response.Body.FlushAsync(cancellationToken);
                return;
            }

            // Build agent request with tool call history for proper multi-turn context
            var agentRequest = new AgentRequest
            {
                Provider = conversation.Provider,
                Model = conversation.Model,
                Messages = conversation.Messages.Select(m => new Application.Services.Agents.Models.AgentMessage
                {
                    Role = m.Role,
                    Content = m.Content,
                    // Pass tool calls to the AgentService so it can build proper context
                    ToolCalls = m.ToolCalls?.Select(tc => new Application.Services.Agents.Models.ToolCallInfo
                    {
                        ToolName = tc.ToolName,
                        Arguments = tc.Arguments,
                        Result = tc.Result
                    }).ToList()
                }).ToList(),
                UserId = userId,
                Temperature = request.Temperature,
                MaxTokens = request.MaxTokens,
                Capabilities = request.Capabilities,
                AgentRagEnabled = conversation.AgentRagEnabled
            };

            // Set Ollama remote URL if configured for this user
            if (conversation.Provider.Equals("Ollama", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var userPrefs = await _userPreferencesService.GetPreferencesAsync(userId);
                    if (userPrefs.UseRemoteOllama && !string.IsNullOrWhiteSpace(userPrefs.OllamaRemoteUrl))
                    {
                        agentRequest.OllamaBaseUrl = userPrefs.OllamaRemoteUrl;
                        _logger.LogInformation("Using remote Ollama URL for agent. UserId: {UserId}, Url: {Url}", userId, userPrefs.OllamaRemoteUrl);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch user preferences for Ollama URL override");
                }
            }

            // Add the new user message
            agentRequest.Messages.Add(new Application.Services.Agents.Models.AgentMessage
            {
                Role = "user",
                Content = request.Content
            });

            // Mark conversation as agent-enabled if not already marked
            if (!conversation.AgentEnabled)
            {
                conversation.AgentEnabled = true;
            }

            // Calculate input tokens from the FULL context sent to the AI:
            // - All conversation messages (including the new user message)
            // - Per-message formatting overhead
            var inputTokens = 0;
            foreach (var msg in agentRequest.Messages)
            {
                inputTokens += TokenEstimator.EstimateTokenCount(msg.Content);
                // Add overhead for message role and formatting (~10 tokens per message)
                inputTokens += 10;
            }

            // Add user message to conversation with total input token count
            var userMessage = new ChatMessage
            {
                Role = "user",
                Content = request.Content,
                Timestamp = DateTime.UtcNow,
                InputTokens = inputTokens
            };
            conversation.Messages.Add(userMessage);

            // Send start event
            await Response.WriteAsync("event: start\ndata: {\"status\":\"streaming\"}\n\n");
            await Response.Body.FlushAsync(cancellationToken);

            // Stream the response
            var startTime = DateTime.UtcNow;
            var fullResponse = new StringBuilder();
            var toolCalls = new List<ToolCall>();
            // Track retrieved notes from automatic context injection
            var retrievedNotes = new List<RetrievedNote>();
            // Track RAG log ID for feedback submission
            string? ragLogId = null;
            // Track pending tool calls to capture arguments from ToolCallStart
            // since ToolCallEnd events don't include arguments
            var pendingToolArguments = new Dictionary<string, string>();
            // Track pre-tool text for interleaved timeline persistence
            // This captures text streamed before each tool call starts
            var pendingPreToolText = new Dictionary<string, string>();
            var lastToolEndPosition = 0;

            var responseTruncated = false;
            await foreach (var evt in _agentService.ProcessStreamAsync(agentRequest, cancellationToken))
            {
                // Skip further processing if response was truncated
                if (responseTruncated && evt.Type == AgentEventType.Token)
                    continue;

                switch (evt.Type)
                {
                    case AgentEventType.Token:
                        // Check max response size to prevent memory exhaustion
                        var tokenContent = evt.Content ?? "";
                        if (fullResponse.Length + tokenContent.Length > MaxResponseSizeChars)
                        {
                            responseTruncated = true;
                            _logger.LogWarning("Agent response truncated due to size limit. CurrentSize: {Size}, Limit: {Limit}",
                                fullResponse.Length, MaxResponseSizeChars);
                            fullResponse.Append("\n\n[Response truncated due to size limits]");
                            await Response.WriteAsync("data: \\n\\n[Response truncated due to size limits]\n\n");
                            await Response.Body.FlushAsync(cancellationToken);
                            continue;
                        }

                        fullResponse.Append(evt.Content);
                        var escapedToken = evt.Content?.Replace("\n", "\\n").Replace("\r", "") ?? "";
                        await Response.WriteAsync($"data: {escapedToken}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        break;

                    case AgentEventType.ToolCallStart:
                        // Store arguments for this tool call to use when ToolCallEnd arrives
                        var toolName = evt.ToolName ?? "";
                        if (!string.IsNullOrEmpty(toolName))
                        {
                            pendingToolArguments[toolName] = evt.ToolArguments ?? "";

                            // Capture text streamed since last tool ended (or start of response)
                            // This is the "pre-tool text" that should appear before this tool in the timeline
                            var currentText = fullResponse.ToString();
                            if (lastToolEndPosition < currentText.Length)
                            {
                                var capturedPreToolText = currentText.Substring(lastToolEndPosition).Trim();
                                if (!string.IsNullOrEmpty(capturedPreToolText))
                                {
                                    pendingPreToolText[toolName] = capturedPreToolText;
                                }
                            }
                        }

                        var toolStartJson = JsonSerializer.Serialize(new
                        {
                            id = evt.ToolId,
                            tool = evt.ToolName,
                            arguments = evt.ToolArguments,
                            status = "executing"
                        });
                        await Response.WriteAsync($"event: tool_start\ndata: {toolStartJson}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        break;

                    case AgentEventType.ToolCallEnd:
                        var endToolName = evt.ToolName ?? "";
                        // Retrieve the arguments that were captured during ToolCallStart
                        var toolArguments = pendingToolArguments.TryGetValue(endToolName, out var args) ? args : "";
                        // Retrieve the pre-tool text that was captured during ToolCallStart
                        var preToolText = pendingPreToolText.TryGetValue(endToolName, out var preText) ? preText : null;

                        var toolEndJson = JsonSerializer.Serialize(new
                        {
                            id = evt.ToolId,
                            tool = evt.ToolName,
                            result = evt.ToolResult,
                            status = "completed"
                        });
                        await Response.WriteAsync($"event: tool_end\ndata: {toolEndJson}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);

                        toolCalls.Add(new ToolCall
                        {
                            ToolName = endToolName,
                            Arguments = toolArguments,
                            Result = evt.ToolResult ?? "",
                            ExecutedAt = DateTime.UtcNow,
                            Success = true,
                            PreToolText = preToolText
                        });

                        // Update the position tracker for the next tool's pre-text calculation
                        lastToolEndPosition = fullResponse.Length;

                        // Remove from pending after processing
                        pendingToolArguments.Remove(endToolName);
                        pendingPreToolText.Remove(endToolName);
                        break;

                    case AgentEventType.Thinking:
                        var thinkingJson = JsonSerializer.Serialize(new
                        {
                            content = evt.Content
                        });
                        await Response.WriteAsync($"event: thinking\ndata: {thinkingJson}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        break;

                    case AgentEventType.Status:
                        var statusJson = JsonSerializer.Serialize(new
                        {
                            status = evt.Content
                        });
                        await Response.WriteAsync($"event: status\ndata: {statusJson}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        break;

                    case AgentEventType.ContextRetrieval:
                        // Store retrieved notes for persistence
                        if (evt.RetrievedNotes != null && evt.RetrievedNotes.Count > 0)
                        {
                            foreach (var note in evt.RetrievedNotes)
                            {
                                retrievedNotes.Add(new RetrievedNote
                                {
                                    NoteId = note.NoteId,
                                    Title = note.Title,
                                    Tags = note.Tags,
                                    RelevanceScore = note.SimilarityScore,
                                    ChunkContent = note.Preview,
                                    ChunkIndex = 0 // Context injection doesn't use chunk indexing
                                });
                            }
                        }

                        // Capture RAG log ID for feedback submission
                        if (!string.IsNullOrEmpty(evt.RagLogId))
                        {
                            ragLogId = evt.RagLogId;
                        }

                        var contextRetrievalJson = JsonSerializer.Serialize(new
                        {
                            message = evt.Content,
                            retrievedNotes = evt.RetrievedNotes?.Select(n => new
                            {
                                noteId = n.NoteId,
                                title = n.Title,
                                preview = n.Preview,
                                tags = n.Tags,
                                similarityScore = n.SimilarityScore
                            }).ToList(),
                            ragLogId = evt.RagLogId
                        });
                        await Response.WriteAsync($"event: context_retrieval\ndata: {contextRetrievalJson}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        _logger.LogDebug("Context retrieval event sent. NotesCount: {Count}, RagLogId: {RagLogId}",
                            evt.RetrievedNotes?.Count ?? 0, evt.RagLogId);
                        break;

                    case AgentEventType.Error:
                        await Response.WriteAsync($"event: error\ndata: {{\"error\":\"{evt.Content}\"}}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        return;

                    case AgentEventType.Grounding:
                        if (evt.GroundingSources != null && evt.GroundingSources.Count > 0)
                        {
                            var groundingJson = JsonSerializer.Serialize(new
                            {
                                sources = evt.GroundingSources.Select(s => new
                                {
                                    uri = s.Uri,
                                    title = s.Title,
                                    snippet = s.Snippet
                                }).ToList()
                            });
                            await Response.WriteAsync($"event: grounding\ndata: {groundingJson}\n\n");
                            await Response.Body.FlushAsync(cancellationToken);
                        }
                        break;

                    case AgentEventType.CodeExecution:
                        if (evt.CodeExecutionResult != null)
                        {
                            var codeExecJson = JsonSerializer.Serialize(new
                            {
                                code = evt.CodeExecutionResult.Code,
                                language = evt.CodeExecutionResult.Language,
                                output = evt.CodeExecutionResult.Output,
                                success = evt.CodeExecutionResult.Success,
                                errorMessage = evt.CodeExecutionResult.ErrorMessage
                            });
                            await Response.WriteAsync($"event: code_execution\ndata: {codeExecJson}\n\n");
                            await Response.Body.FlushAsync(cancellationToken);
                        }
                        break;
                }
            }

            var durationMs = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Estimate output token usage for the response
            var outputTokens = TokenEstimator.EstimateTokenCount(fullResponse.ToString());

            // Calculate tool usage tokens
            var toolDefinitionTokens = toolCalls.Count > 0 ? toolCalls.Count * 50 : (int?)null; // Rough estimate per tool definition
            var toolArgumentTokens = toolCalls.Sum(t => TokenEstimator.EstimateTokenCount(t.Arguments ?? ""));
            var toolResultTokens = toolCalls.Sum(t => TokenEstimator.EstimateTokenCount(t.Result ?? ""));

            // Calculate RAG context tokens if RAG was used
            var ragContextTokens = retrievedNotes.Sum(n => TokenEstimator.EstimateTokenCount(n.ChunkContent ?? n.Title ?? ""));

            // Add assistant message to conversation with tool calls, retrieved notes, and RAG log ID
            var assistantMessage = new ChatMessage
            {
                Role = "assistant",
                Content = fullResponse.ToString(),
                Timestamp = DateTime.UtcNow,
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                TokensActual = false, // Agent mode currently uses estimates
                DurationMs = durationMs,
                ToolCalls = toolCalls,
                RetrievedNotes = retrievedNotes,
                RagLogId = ragLogId,
                ToolDefinitionTokens = toolDefinitionTokens,
                ToolArgumentTokens = toolArgumentTokens > 0 ? toolArgumentTokens : null,
                ToolResultTokens = toolResultTokens > 0 ? toolResultTokens : null,
                RagContextTokens = ragContextTokens > 0 ? ragContextTokens : null,
                RagChunksCount = retrievedNotes.Count > 0 ? retrievedNotes.Count : null
            };
            conversation.Messages.Add(assistantMessage);
            conversation.UpdatedAt = DateTime.UtcNow;
            conversation.AgentEnabled = true; // Ensure it's marked as agent-enabled

            // Update conversation in database
            await _chatRepository.UpdateAsync(id, conversation);

            // Send end event with token usage, retrieved notes count, and RAG log ID for feedback
            var endData = JsonSerializer.Serialize(new
            {
                conversationId = id,
                messageId = conversation.Messages.Count - 1,
                inputTokens = inputTokens,
                outputTokens = outputTokens,
                tokensActual = false,
                durationMs = durationMs,
                toolCallsCount = toolCalls.Count,
                toolDefinitionTokens,
                toolArgumentTokens = toolArgumentTokens > 0 ? toolArgumentTokens : (int?)null,
                toolResultTokens = toolResultTokens > 0 ? toolResultTokens : (int?)null,
                retrievedNotesCount = retrievedNotes.Count,
                ragContextTokens = ragContextTokens > 0 ? ragContextTokens : (int?)null,
                ragLogId = ragLogId
            });
            await Response.WriteAsync($"event: end\ndata: {endData}\n\n");
            await Response.Body.FlushAsync(cancellationToken);

            _logger.LogInformation("Agent streaming completed. ConversationId: {ConversationId}, UserId: {UserId}, InputTokens: {InputTokens}, OutputTokens: {OutputTokens}, ToolCalls: {ToolCallsCount}, RetrievedNotes: {RetrievedNotesCount}",
                id, userId, inputTokens, outputTokens, toolCalls.Count, retrievedNotes.Count);
        }
        catch (NotSupportedException ex)
        {
            _logger.LogWarning(ex, "Provider not supported for agent mode. ConversationId: {ConversationId}", id);
            await Response.WriteAsync($"event: error\ndata: {{\"error\":\"{ex.Message}\"}}\n\n");
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming agent message. ConversationId: {ConversationId}", id);
            await Response.WriteAsync($"event: error\ndata: {{\"error\":\"{ex.Message}\"}}\n\n");
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Check which providers support agent mode
    /// </summary>
    [HttpGet("supported-providers")]
    [ProducesResponseType(typeof(SupportedProvidersResponse), StatusCodes.Status200OK)]
    public ActionResult<SupportedProvidersResponse> GetSupportedProviders()
    {
        return Ok(new SupportedProvidersResponse
        {
            Providers = new List<ProviderSupport>
            {
                new() { Name = "OpenAI", Supported = true, Reason = "Full support for function calling" },
                new() { Name = "Claude", Supported = true, Reason = "Full support via Anthropic.SDK" },
                new() { Name = "Gemini", Supported = true, Reason = "OpenAI-compatible API with function calling" },
                new() { Name = "Grok", Supported = true, Reason = "OpenAI-compatible API with function calling" },
                new() { Name = "Ollama", Supported = true, Reason = "OpenAI-compatible API (model dependent)" }
            }
        });
    }

    /// <summary>
    /// Get available agent capabilities
    /// </summary>
    [HttpGet("capabilities")]
    [ProducesResponseType(typeof(CapabilitiesResponse), StatusCodes.Status200OK)]
    public ActionResult<CapabilitiesResponse> GetCapabilities()
    {
        var capabilities = _agentService.GetAvailableCapabilities();
        return Ok(new CapabilitiesResponse
        {
            Capabilities = capabilities.Select(c => new CapabilityInfo
            {
                Id = c.Id,
                DisplayName = c.DisplayName,
                Description = c.Description
            }).ToList()
        });
    }
}

// Request/Response DTOs
public class AgentMessageRequest
{
    public string Content { get; set; } = string.Empty;
    public float? Temperature { get; set; }
    public int? MaxTokens { get; set; }
    /// <summary>
    /// List of capability IDs to enable for this request (e.g., ["notes"]).
    /// If empty or null, the agent runs as a general assistant without tools.
    /// </summary>
    public List<string>? Capabilities { get; set; }
}

public class SupportedProvidersResponse
{
    public List<ProviderSupport> Providers { get; set; } = new();
}

public class ProviderSupport
{
    public string Name { get; set; } = string.Empty;
    public bool Supported { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class CapabilitiesResponse
{
    public List<CapabilityInfo> Capabilities { get; set; } = new();
}

public class CapabilityInfo
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
