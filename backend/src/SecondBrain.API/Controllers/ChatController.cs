using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Utilities;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ChatController : ControllerBase
{
    private readonly IChatConversationService _chatService;
    private readonly IChatRepository _chatRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IAIProviderFactory _providerFactory;
    private readonly IImageGenerationProviderFactory _imageGenerationFactory;
    private readonly IRagService _ragService;
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        IChatConversationService chatService,
        IChatRepository chatRepository,
        INoteRepository noteRepository,
        IAIProviderFactory providerFactory,
        IImageGenerationProviderFactory imageGenerationFactory,
        IRagService ragService,
        IUserPreferencesService userPreferencesService,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _chatRepository = chatRepository;
        _noteRepository = noteRepository;
        _providerFactory = providerFactory;
        _imageGenerationFactory = imageGenerationFactory;
        _ragService = ragService;
        _userPreferencesService = userPreferencesService;
        _logger = logger;
    }

    /// <summary>
    /// Get all conversations for authenticated user
    /// </summary>
    [HttpGet("conversations")]
    [ProducesResponseType(typeof(IEnumerable<ChatConversation>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<ChatConversation>>> GetConversations(
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var conversations = await _chatService.GetAllConversationsAsync(userId, cancellationToken);
            return Ok(conversations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversations. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to retrieve conversations" });
        }
    }

    /// <summary>
    /// Get a specific conversation by ID (must belong to authenticated user)
    /// </summary>
    [HttpGet("conversations/{id}")]
    [ProducesResponseType(typeof(ChatConversation), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChatConversation>> GetConversation(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var conversation = await _chatService.GetConversationByIdAsync(id, userId, cancellationToken);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            return Ok(conversation);
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversation. ConversationId: {ConversationId}, UserId: {UserId}", id, userId);
            return StatusCode(500, new { error = "Failed to retrieve conversation" });
        }
    }

    /// <summary>
    /// Create a new conversation
    /// </summary>
    [HttpPost("conversations")]
    [ProducesResponseType(typeof(ChatConversation), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ChatConversation>> CreateConversation(
        [FromBody] CreateConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (string.IsNullOrWhiteSpace(request.Provider))
        {
            return BadRequest(new { error = "Provider is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Model))
        {
            return BadRequest(new { error = "Model is required" });
        }

        try
        {
            var conversation = await _chatService.CreateConversationAsync(
                request.Title ?? "New Conversation",
                request.Provider,
                request.Model,
                userId,
                request.RagEnabled,
                request.AgentEnabled,
                request.AgentRagEnabled,
                request.ImageGenerationEnabled,
                request.AgentCapabilities,
                request.VectorStoreProvider,
                cancellationToken);

            return CreatedAtAction(nameof(GetConversation), new { id = conversation.Id }, conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation. Provider: {Provider}, UserId: {UserId}", request.Provider, userId);
            return StatusCode(500, new { error = "Failed to create conversation" });
        }
    }

    /// <summary>
    /// Stream a message in a conversation and get AI response in real-time via SSE
    /// </summary>
    [HttpPost("conversations/{id}/messages/stream")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task StreamMessage(
        string id,
        [FromBody] SendMessageRequest request,
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
            Response.Headers.Append("X-Accel-Buffering", "no"); // Disable nginx buffering

            _logger.LogInformation("Starting streaming message. ConversationId: {ConversationId}, UserId: {UserId}, UseRag: {UseRag}",
                id, userId, request.UseRag);

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
                _logger.LogWarning("User attempted to send message to conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}",
                    userId, id);
                await Response.WriteAsync("event: error\ndata: {\"error\":\"Access denied\"}\n\n");
                await Response.Body.FlushAsync(cancellationToken);
                return;
            }

            // Retrieve RAG context if enabled
            List<RagContextResponse> retrievedNotes = new();
            var messageContent = request.Content;
            Guid? ragLogId = null;

            if (request.UseRag)
            {
                _logger.LogInformation("RAG enabled for streaming message. ConversationId: {ConversationId}, UserId: {UserId}",
                    id, userId);

                var ragContext = await _ragService.RetrieveContextAsync(
                    request.Content,
                    userId,
                    vectorStoreProvider: request.VectorStoreProvider,
                    conversationId: id,
                    cancellationToken: cancellationToken);

                // Capture RAG log ID for feedback association
                ragLogId = ragContext.RagLogId;

                messageContent = _ragService.EnhancePromptWithContext(request.Content, ragContext);

                if (ragContext.RetrievedNotes.Any())
                {
                    retrievedNotes = ragContext.RetrievedNotes.Select(n =>
                    {
                        var parsed = NoteContentParser.Parse(n.Content);
                        return new RagContextResponse
                        {
                            NoteId = n.NoteId,
                            Title = parsed.Title ?? n.NoteTitle,
                            Tags = parsed.Tags ?? n.NoteTags,
                            RelevanceScore = n.SimilarityScore,
                            ChunkContent = n.Content,
                            Content = parsed.Content,
                            CreatedOn = parsed.CreatedDate,
                            ModifiedOn = parsed.UpdatedDate,
                            ChunkIndex = n.ChunkIndex
                        };
                    }).ToList();

                    // Send RAG context as a special event
                    // Use camelCase for JavaScript/TypeScript compatibility
                    var jsonOptions = new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never
                    };
                    var ragJson = System.Text.Json.JsonSerializer.Serialize(new { retrievedNotes }, jsonOptions);
                    await Response.WriteAsync($"event: rag\ndata: {ragJson}\n\n");
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }

            // Get AI provider
            var aiProvider = _providerFactory.GetProvider(conversation.Provider);
            if (!aiProvider.IsEnabled)
            {
                await Response.WriteAsync("event: error\ndata: {\"error\":\"Provider not enabled\"}\n\n");
                await Response.Body.FlushAsync(cancellationToken);
                return;
            }

            // Check if the model supports vision and we have images
            var hasImages = request.Images != null && request.Images.Count > 0;
            var isVisionModel = Application.Services.AI.Models.MultimodalConfig.IsMultimodalModel(conversation.Provider, conversation.Model);

            if (hasImages && !isVisionModel)
            {
                await Response.WriteAsync($"event: error\ndata: {{\"error\":\"Model {conversation.Model} does not support image inputs\"}}\n\n");
                await Response.Body.FlushAsync(cancellationToken);
                return;
            }

            // Validate image formats if present
            if (hasImages)
            {
                foreach (var image in request.Images!)
                {
                    if (!Application.Services.AI.Models.MultimodalConfig.IsImageFormatSupported(conversation.Provider, image.MediaType))
                    {
                        await Response.WriteAsync($"event: error\ndata: {{\"error\":\"Image format {image.MediaType} is not supported by {conversation.Provider}\"}}\n\n");
                        await Response.Body.FlushAsync(cancellationToken);
                        return;
                    }
                }
            }

            // Add user message (store original content for history)
            var userMessage = new Core.Entities.ChatMessage
            {
                Role = "user",
                Content = request.Content,
                Timestamp = DateTime.UtcNow,
                // InputTokens will be set below after calculating full context tokens
            };

            // Map images to domain entity if present
            if (hasImages)
            {
                userMessage.Images = request.Images!.Select(img => new Core.Entities.MessageImage
                {
                    Base64Data = img.Base64Data,
                    MediaType = img.MediaType,
                    FileName = img.FileName
                }).ToList();
            }

            conversation.Messages.Add(userMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            // Convert conversation messages to AI provider format
            var aiMessages = conversation.Messages.Select(m => new Application.Services.AI.Models.ChatMessage
            {
                Role = m.Role,
                Content = m.Content
            }).ToList();

            // For the last user message, add images and use enhanced content if RAG is enabled
            if (aiMessages.Any())
            {
                var lastMessage = aiMessages[aiMessages.Count - 1];

                // Add images to the last message
                if (hasImages)
                {
                    lastMessage.Images = request.Images;
                }

                // Use enhanced content if RAG is enabled
                if (request.UseRag)
                {
                    lastMessage.Content = messageContent;
                }
            }

            // Calculate input tokens from the FULL context sent to the AI:
            // - All conversation messages (including enhanced RAG content for last message)
            // - Per-message formatting overhead
            var inputTokens = 0;
            foreach (var msg in aiMessages)
            {
                inputTokens += TokenEstimator.EstimateTokenCount(msg.Content);
                // Add overhead for message role and formatting (~10 tokens per message)
                inputTokens += 10;
            }
            userMessage.InputTokens = inputTokens;

            // Generate AI streaming response
            var aiRequest = new AIRequest
            {
                Model = conversation.Model,
                Temperature = request.Temperature.HasValue ? (float?)request.Temperature.Value : null,
                MaxTokens = request.MaxTokens
            };

            // Set Ollama remote URL if configured for this user
            if (conversation.Provider.Equals("Ollama", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var userPrefs = await _userPreferencesService.GetPreferencesAsync(userId);
                    if (userPrefs.UseRemoteOllama && !string.IsNullOrWhiteSpace(userPrefs.OllamaRemoteUrl))
                    {
                        aiRequest.OllamaBaseUrl = userPrefs.OllamaRemoteUrl;
                        _logger.LogInformation("Using remote Ollama URL for user {UserId}: {Url}", userId, userPrefs.OllamaRemoteUrl);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch user preferences for Ollama URL override");
                }
            }

            // Send start event
            await Response.WriteAsync("event: start\ndata: {\"status\":\"streaming\"}\n\n");
            await Response.Body.FlushAsync(cancellationToken);

            // Stream the response
            var startTime = DateTime.UtcNow;
            var streamTask = await aiProvider.StreamChatCompletionAsync(aiMessages, aiRequest, cancellationToken);
            var fullResponse = new System.Text.StringBuilder();

            await foreach (var token in streamTask.WithCancellation(cancellationToken))
            {
                if (!string.IsNullOrEmpty(token))
                {
                    fullResponse.Append(token);
                    // Send token as SSE data event
                    // Use JSON serialization to properly escape all special characters
                    var escapedToken = System.Text.Json.JsonSerializer.Serialize(token);
                    // Remove surrounding quotes added by JSON serialization since we want raw escaped string
                    escapedToken = escapedToken.Substring(1, escapedToken.Length - 2);
                    await Response.WriteAsync($"data: {escapedToken}\n\n");
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }
            var durationMs = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Add assistant message with retrieved notes and RAG log ID
            var outputTokens = TokenEstimator.EstimateTokenCount(fullResponse.ToString());
            var assistantMessage = new Core.Entities.ChatMessage
            {
                Role = "assistant",
                Content = fullResponse.ToString(),
                Timestamp = DateTime.UtcNow,
                OutputTokens = outputTokens,
                DurationMs = durationMs,
                RagLogId = ragLogId?.ToString(),
                RetrievedNotes = retrievedNotes.Select(n => new Core.Entities.RetrievedNote
                {
                    NoteId = n.NoteId,
                    Title = n.Title,
                    Tags = n.Tags,
                    RelevanceScore = n.RelevanceScore,
                    ChunkContent = n.ChunkContent,
                    ChunkIndex = n.ChunkIndex
                }).ToList()
            };
            conversation.Messages.Add(assistantMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            // Update conversation in database
            await _chatRepository.UpdateAsync(id, conversation);

            // Send end event with conversation ID, token usage, and RAG log ID for feedback
            var endData = System.Text.Json.JsonSerializer.Serialize(new
            {
                conversationId = id,
                messageId = conversation.Messages.Count - 1,
                inputTokens = inputTokens,
                outputTokens = outputTokens,
                ragLogId = ragLogId?.ToString()
            });
            await Response.WriteAsync($"event: end\ndata: {endData}\n\n");
            await Response.Body.FlushAsync(cancellationToken);

            _logger.LogInformation("Streaming message completed. ConversationId: {ConversationId}, UserId: {UserId}",
                id, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming message. ConversationId: {ConversationId}", id);
            var errorJson = System.Text.Json.JsonSerializer.Serialize(new { error = ex.Message });
            await Response.WriteAsync($"event: error\ndata: {errorJson}\n\n");
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Send a message in a conversation and get AI response
    /// </summary>
    [HttpPost("conversations/{id}/messages")]
    [ProducesResponseType(typeof(ChatResponseWithRag), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChatResponseWithRag>> SendMessage(
        string id,
        [FromBody] SendMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Message content is required" });
        }

        try
        {
            _logger.LogInformation(
                "Processing chat message. ConversationId: {ConversationId}, UserId: {UserId}, UseRag: {UseRag}, MessageLength: {Length}",
                id, userId, request.UseRag, request.Content.Length);

            // Get the conversation
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            // Verify conversation belongs to user
            if (conversation.UserId != userId)
            {
                _logger.LogWarning("User attempted to send message to conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}, ConversationUserId: {ConversationUserId}",
                    userId, id, conversation.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            // Retrieve RAG context if enabled
            List<RagContextResponse> retrievedNotes = new();
            var messageContent = request.Content;
            Guid? ragLogId = null;

            if (request.UseRag)
            {
                _logger.LogInformation(
                    "RAG enabled for message. ConversationId: {ConversationId}, UserId: {UserId}, VectorStore: {VectorStore}",
                    id, userId, request.VectorStoreProvider ?? "default");

                var ragContext = await _ragService.RetrieveContextAsync(
                    request.Content,
                    userId,
                    vectorStoreProvider: request.VectorStoreProvider,
                    conversationId: id,
                    cancellationToken: cancellationToken);

                // Capture RAG log ID for feedback association
                ragLogId = ragContext.RagLogId;

                // Enhance the message with RAG context (or lack thereof)
                // We do this regardless of whether notes were found, so the model knows we looked.
                messageContent = _ragService.EnhancePromptWithContext(request.Content, ragContext);

                if (ragContext.RetrievedNotes.Any())
                {
                    // Map retrieved notes to response DTO
                    retrievedNotes = ragContext.RetrievedNotes.Select(n =>
                    {
                        var parsed = NoteContentParser.Parse(n.Content);
                        return new RagContextResponse
                        {
                            NoteId = n.NoteId,
                            Title = parsed.Title ?? n.NoteTitle,
                            Tags = parsed.Tags ?? n.NoteTags,
                            RelevanceScore = n.SimilarityScore,
                            ChunkContent = n.Content,
                            Content = parsed.Content,
                            CreatedOn = parsed.CreatedDate,
                            ModifiedOn = parsed.UpdatedDate,
                            ChunkIndex = n.ChunkIndex
                        };
                    }).ToList();

                    _logger.LogInformation(
                        "RAG context successfully retrieved. ConversationId: {ConversationId}, UserId: {UserId}, NotesCount: {Count}, EnhancedPromptLength: {Length}",
                        id, userId, retrievedNotes.Count, messageContent.Length);
                }
                else
                {
                    _logger.LogWarning(
                        "RAG enabled but no notes retrieved. ConversationId: {ConversationId}, UserId: {UserId}, Query: {Query}",
                        id, userId, request.Content);
                }
            }
            else
            {
                _logger.LogInformation(
                    "RAG disabled for message. ConversationId: {ConversationId}, UserId: {UserId}",
                    id, userId);
            }

            // Check if the model supports vision and we have images
            var hasImages = request.Images != null && request.Images.Count > 0;
            var isVisionModel = Application.Services.AI.Models.MultimodalConfig.IsMultimodalModel(conversation.Provider, conversation.Model);

            if (hasImages && !isVisionModel)
            {
                return BadRequest(new { error = $"Model {conversation.Model} does not support image inputs" });
            }

            // Validate image formats if present
            if (hasImages)
            {
                foreach (var image in request.Images!)
                {
                    if (!Application.Services.AI.Models.MultimodalConfig.IsImageFormatSupported(conversation.Provider, image.MediaType))
                    {
                        return BadRequest(new { error = $"Image format {image.MediaType} is not supported by {conversation.Provider}" });
                    }
                }
            }

            // Add user message (original content, not enhanced)
            var userMessage = new Core.Entities.ChatMessage
            {
                Role = "user",
                Content = request.Content,
                Timestamp = DateTime.UtcNow
            };

            // Map images to domain entity if present
            if (hasImages)
            {
                userMessage.Images = request.Images!.Select(img => new Core.Entities.MessageImage
                {
                    Base64Data = img.Base64Data,
                    MediaType = img.MediaType,
                    FileName = img.FileName
                }).ToList();
            }

            conversation.Messages.Add(userMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            // Get AI provider
            var aiProvider = _providerFactory.GetProvider(conversation.Provider);
            if (!aiProvider.IsEnabled)
            {
                return BadRequest(new { error = $"Provider '{conversation.Provider}' is not enabled" });
            }

            // Convert conversation messages to AI provider format
            var aiMessages = conversation.Messages.Select(m => new Application.Services.AI.Models.ChatMessage
            {
                Role = m.Role,
                Content = m.Content
            }).ToList();

            // Add images to the last user message
            if (hasImages)
            {
                aiMessages[aiMessages.Count - 1].Images = request.Images;
            }

            // For the last message, use the enhanced content if RAG is enabled
            if (request.UseRag && aiMessages.Any())
            {
                // Ensure we're using the enhanced message content regardless of retrieval success
                // RagService now handles both "found" and "not found" cases in EnhancePromptWithContext
                aiMessages[aiMessages.Count - 1].Content = messageContent;
            }

            // Generate AI response
            var aiRequest = new AIRequest
            {
                Model = conversation.Model,
                Temperature = request.Temperature.HasValue ? (float?)request.Temperature.Value : null,
                MaxTokens = request.MaxTokens
            };

            var startTime = DateTime.UtcNow;
            var aiResponse = await aiProvider.GenerateChatCompletionAsync(aiMessages, aiRequest, cancellationToken);
            var durationMs = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Add assistant message with retrieved notes and RAG log ID if RAG was used
            var assistantMessage = new Core.Entities.ChatMessage
            {
                Role = "assistant",
                Content = aiResponse.Content,
                Timestamp = DateTime.UtcNow,
                OutputTokens = aiResponse.TokensUsed,
                DurationMs = durationMs,
                RagLogId = ragLogId?.ToString(),
                RetrievedNotes = retrievedNotes.Select(n => new Core.Entities.RetrievedNote
                {
                    NoteId = n.NoteId,
                    Title = n.Title,
                    Tags = n.Tags,
                    RelevanceScore = n.RelevanceScore,
                    ChunkContent = n.ChunkContent,
                    ChunkIndex = n.ChunkIndex
                }).ToList()
            };
            conversation.Messages.Add(assistantMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            // Update conversation in database
            var updated = await _chatRepository.UpdateAsync(id, conversation);
            if (updated == null)
            {
                return NotFound(new { error = $"Failed to update conversation '{id}'" });
            }

            // Return conversation with retrieved notes and RAG log ID for feedback
            var response = new ChatResponseWithRag
            {
                Conversation = updated,
                RetrievedNotes = retrievedNotes,
                RagLogId = ragLogId?.ToString()
            };

            return Ok(response);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { error = $"Invalid provider" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message. ConversationId: {ConversationId}", id);
            return StatusCode(500, new { error = "Failed to send message" });
        }
    }

    /// <summary>
    /// Update conversation settings (RAG and vector store)
    /// </summary>
    [HttpPatch("conversations/{id}/settings")]
    [ProducesResponseType(typeof(ChatConversation), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChatConversation>> UpdateConversationSettings(
        string id,
        [FromBody] UpdateConversationSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var updated = await _chatService.UpdateConversationSettingsAsync(
                id,
                userId,
                request.RagEnabled,
                request.VectorStoreProvider,
                request.AgentEnabled,
                request.AgentRagEnabled,
                request.AgentCapabilities,
                cancellationToken);

            if (updated == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            return Ok(updated);
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating conversation settings. ConversationId: {ConversationId}, UserId: {UserId}", id, userId);
            return StatusCode(500, new { error = "Failed to update conversation settings" });
        }
    }

    /// <summary>
    /// Delete a conversation (must belong to authenticated user)
    /// </summary>
    [HttpDelete("conversations/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> DeleteConversation(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var deleted = await _chatService.DeleteConversationAsync(id, userId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            return NoContent();
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting conversation. ConversationId: {ConversationId}, UserId: {UserId}", id, userId);
            return StatusCode(500, new { error = "Failed to delete conversation" });
        }
    }

    /// <summary>
    /// Bulk delete multiple conversations (must belong to authenticated user)
    /// </summary>
    [HttpPost("conversations/bulk-delete")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> BulkDeleteConversations(
        [FromBody] BulkDeleteConversationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (request.ConversationIds == null || request.ConversationIds.Count == 0)
        {
            return BadRequest(new { error = "At least one conversation ID is required" });
        }

        try
        {
            _logger.LogInformation("Bulk deleting {Count} conversations for user {UserId}",
                request.ConversationIds.Count, userId);

            var deletedCount = await _chatService.BulkDeleteConversationsAsync(
                request.ConversationIds, userId, cancellationToken);

            return Ok(new { deletedCount, message = $"Successfully deleted {deletedCount} conversation(s)" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting conversations. Count: {Count}, UserId: {UserId}",
                request.ConversationIds.Count, userId);
            return StatusCode(500, new { error = "Failed to delete conversations" });
        }
    }

    /// <summary>
    /// Generate an image in a conversation
    /// </summary>
    [HttpPost("conversations/{id}/generate-image")]
    [ProducesResponseType(typeof(ImageGenerationApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ImageGenerationApiResponse>> GenerateImage(
        string id,
        [FromBody] GenerateImageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest(new { error = "Prompt is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Provider))
        {
            return BadRequest(new { error = "Provider is required" });
        }

        try
        {
            _logger.LogInformation(
                "Generating image. ConversationId: {ConversationId}, Provider: {Provider}, Model: {Model}, UserId: {UserId}",
                id, request.Provider, request.Model, userId);

            // Verify conversation exists and belongs to user
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            if (conversation.UserId != userId)
            {
                _logger.LogWarning(
                    "User attempted to generate image in conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}",
                    userId, id);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            // Get the image generation provider
            if (!_imageGenerationFactory.HasProvider(request.Provider))
            {
                return BadRequest(new { error = $"Provider '{request.Provider}' not found or does not support image generation" });
            }

            var imageProvider = _imageGenerationFactory.GetProvider(request.Provider);
            if (!imageProvider.IsEnabled)
            {
                return BadRequest(new { error = $"Provider '{request.Provider}' is not enabled" });
            }

            // Create the image generation request
            var imageRequest = new ImageGenerationRequest
            {
                Prompt = request.Prompt,
                Model = request.Model,
                Size = request.Size ?? "1024x1024",
                Quality = request.Quality ?? "standard",
                Style = request.Style ?? "vivid",
                Count = request.Count ?? 1,
                ResponseFormat = "b64_json" // Always use base64 for consistent handling
            };

            // Generate the image
            var result = await imageProvider.GenerateImageAsync(imageRequest, cancellationToken);

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Image generation failed. ConversationId: {ConversationId}, Provider: {Provider}, Error: {Error}",
                    id, request.Provider, result.Error);
                return BadRequest(new { error = result.Error });
            }

            // Add user message for the prompt
            var userMessage = new Core.Entities.ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                Role = "user",
                Content = $"[Image Generation Request]\n{request.Prompt}",
                Timestamp = DateTime.UtcNow,
                ConversationId = id
            };
            conversation.Messages.Add(userMessage);

            // Add assistant message with the generated images
            var assistantContent = result.Images.Any(i => !string.IsNullOrEmpty(i.RevisedPrompt))
                ? $"[Generated Image]\nRevised prompt: {result.Images.First().RevisedPrompt}"
                : "[Generated Image]";

            var assistantMessageId = Guid.NewGuid().ToString();
            var assistantMessage = new Core.Entities.ChatMessage
            {
                Id = assistantMessageId,
                Role = "assistant",
                Content = assistantContent,
                Timestamp = DateTime.UtcNow,
                ConversationId = id,
                GeneratedImages = result.Images.Select(img => new Core.Entities.GeneratedImageData
                {
                    Id = Guid.NewGuid().ToString(),
                    MessageId = assistantMessageId,
                    Base64Data = img.Base64Data,
                    Url = img.Url,
                    RevisedPrompt = img.RevisedPrompt,
                    MediaType = img.MediaType,
                    Width = img.Width,
                    Height = img.Height
                }).ToList()
            };
            conversation.Messages.Add(assistantMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            // Update conversation in database
            await _chatRepository.UpdateAsync(id, conversation);

            _logger.LogInformation(
                "Successfully generated {Count} image(s). ConversationId: {ConversationId}, Provider: {Provider}",
                result.Images.Count, id, request.Provider);

            // Return the response
            return Ok(new ImageGenerationApiResponse
            {
                Success = true,
                Images = result.Images.Select(img => new GeneratedImageDto
                {
                    Base64Data = img.Base64Data,
                    Url = img.Url,
                    RevisedPrompt = img.RevisedPrompt,
                    MediaType = img.MediaType,
                    Width = img.Width,
                    Height = img.Height
                }).ToList(),
                Model = result.Model,
                Provider = result.Provider,
                ConversationId = id
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image. ConversationId: {ConversationId}", id);
            return StatusCode(500, new { error = "Failed to generate image" });
        }
    }

    /// <summary>
    /// Get available image generation providers and their models
    /// </summary>
    [HttpGet("image-generation/providers")]
    [ProducesResponseType(typeof(IEnumerable<ImageProviderInfo>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<ImageProviderInfo>> GetImageGenerationProviders()
    {
        var providers = _imageGenerationFactory.GetEnabledProviders()
            .Select(p => new ImageProviderInfo
            {
                Provider = p.ProviderName,
                Models = p.GetSupportedModels().ToList(),
                IsEnabled = p.IsEnabled
            })
            .ToList();

        return Ok(providers);
    }

    /// <summary>
    /// Get supported sizes for a specific provider and model
    /// </summary>
    [HttpGet("image-generation/providers/{provider}/sizes")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<IEnumerable<string>> GetImageGenerationSizes(string provider, [FromQuery] string? model = null)
    {
        if (!_imageGenerationFactory.HasProvider(provider))
        {
            return NotFound(new { error = $"Provider '{provider}' not found" });
        }

        var imageProvider = _imageGenerationFactory.GetProvider(provider);
        var sizes = imageProvider.GetSupportedSizes(model ?? string.Empty);

        return Ok(sizes);
    }

    /// <summary>
    /// Generate AI-powered suggested prompts based on user's notes
    /// </summary>
    [HttpPost("suggested-prompts")]
    [ProducesResponseType(typeof(SuggestedPromptsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SuggestedPromptsResponse>> GenerateSuggestedPrompts(
        [FromBody] GenerateSuggestedPromptsRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            _logger.LogInformation(
                "Generating suggested prompts. UserId: {UserId}, Provider: {Provider}, Model: {Model}",
                userId, request.Provider, request.Model);

            // Get user's notes to analyze
            var notes = await _noteRepository.GetByUserIdAsync(userId);
            var notesList = notes.Where(n => !n.IsArchived).ToList();

            if (!notesList.Any())
            {
                return Ok(new SuggestedPromptsResponse
                {
                    Success = true,
                    Prompts = GetDefaultPrompts(),
                    Provider = request.Provider ?? "default",
                    Model = request.Model ?? "default"
                });
            }

            // Sample notes for analysis (take recent and diverse notes)
            var sampledNotes = SampleNotesForAnalysis(notesList, maxNotes: 10);

            // Build context from notes
            var notesContext = BuildNotesContext(sampledNotes);

            // Get AI provider
            var providerName = request.Provider;
            var modelName = request.Model;

            // If no provider specified, try to get user preferences or use defaults
            if (string.IsNullOrWhiteSpace(providerName))
            {
                try
                {
                    var userPrefs = await _userPreferencesService.GetPreferencesAsync(userId);
                    providerName = userPrefs.ChatProvider ?? "OpenAI";
                    modelName = userPrefs.ChatModel ?? "gpt-4o-mini";
                }
                catch
                {
                    providerName = "OpenAI";
                    modelName = "gpt-4o-mini";
                }
            }

            var aiProvider = _providerFactory.GetProvider(providerName);
            if (!aiProvider.IsEnabled)
            {
                // Fall back to default prompts if provider not available
                return Ok(new SuggestedPromptsResponse
                {
                    Success = true,
                    Prompts = GetDefaultPrompts(),
                    Provider = providerName,
                    Model = modelName ?? "unknown",
                    Error = $"Provider '{providerName}' is not enabled, returning default prompts"
                });
            }

            // Generate prompts using AI
            var systemPrompt = @"You are a helpful assistant that generates contextual prompt suggestions for a note-taking AI assistant. Based on the user's notes, generate exactly 4 useful prompt suggestions that would help them explore their knowledge base.

Each prompt should be:
1. Specific to topics found in their notes
2. Actionable and useful
3. Varied in type (e.g., summarize, analyze, compare, explore connections, generate ideas)

Respond ONLY with a JSON array of objects in this exact format (no markdown, no explanation):
[
  {""id"": ""unique-id-1"", ""label"": ""Short Label (3-5 words)"", ""promptTemplate"": ""Full prompt text that will be sent to the AI..."", ""category"": ""summarize|analyze|create|explore""},
  {""id"": ""unique-id-2"", ""label"": ""Short Label"", ""promptTemplate"": ""Full prompt..."", ""category"": ""category""},
  {""id"": ""unique-id-3"", ""label"": ""Short Label"", ""promptTemplate"": ""Full prompt..."", ""category"": ""category""},
  {""id"": ""unique-id-4"", ""label"": ""Short Label"", ""promptTemplate"": ""Full prompt..."", ""category"": ""category""}
]

Categories:
- summarize: For summarization tasks
- analyze: For analysis and insights
- create: For generating new content or ideas
- explore: For finding connections or exploring topics";

            var userPrompt = $@"Based on these notes from the user's knowledge base, generate 4 contextual prompt suggestions:

{notesContext}

Generate prompts that would be genuinely useful for exploring this content.";

            var messages = new List<Application.Services.AI.Models.ChatMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userPrompt }
            };

            var aiRequest = new AIRequest
            {
                Model = modelName ?? "gpt-4o-mini",
                Temperature = 0.7f,
                MaxTokens = 1000
            };

            // Set Ollama remote URL if configured
            if (providerName.Equals("Ollama", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var userPrefs = await _userPreferencesService.GetPreferencesAsync(userId);
                    if (userPrefs.UseRemoteOllama && !string.IsNullOrWhiteSpace(userPrefs.OllamaRemoteUrl))
                    {
                        aiRequest.OllamaBaseUrl = userPrefs.OllamaRemoteUrl;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch user preferences for Ollama URL override");
                }
            }

            var aiResponse = await aiProvider.GenerateChatCompletionAsync(messages, aiRequest, cancellationToken);

            // Parse the AI response
            var prompts = ParsePromptsFromResponse(aiResponse.Content);

            if (prompts.Count == 0)
            {
                _logger.LogWarning("Failed to parse AI response for suggested prompts. Response: {Response}", aiResponse.Content);
                prompts = GetDefaultPrompts();
            }

            return Ok(new SuggestedPromptsResponse
            {
                Success = true,
                Prompts = prompts,
                Provider = providerName,
                Model = modelName ?? aiRequest.Model
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating suggested prompts. UserId: {UserId}", userId);
            return Ok(new SuggestedPromptsResponse
            {
                Success = false,
                Prompts = GetDefaultPrompts(),
                Error = "Failed to generate custom prompts, returning defaults"
            });
        }
    }

    private static List<Note> SampleNotesForAnalysis(List<Note> notes, int maxNotes)
    {
        if (notes.Count <= maxNotes)
            return notes;

        // Take a mix of recent and random notes for diversity
        var recentNotes = notes
            .OrderByDescending(n => n.UpdatedAt)
            .Take(maxNotes / 2)
            .ToList();

        var remainingNotes = notes.Except(recentNotes).ToList();
        var random = new Random();
        var randomNotes = remainingNotes
            .OrderBy(_ => random.Next())
            .Take(maxNotes - recentNotes.Count)
            .ToList();

        return recentNotes.Concat(randomNotes).ToList();
    }

    private static string BuildNotesContext(List<Note> notes)
    {
        var sb = new System.Text.StringBuilder();

        foreach (var note in notes)
        {
            sb.AppendLine($"--- Note: {note.Title} ---");
            if (note.Tags?.Any() == true)
            {
                sb.AppendLine($"Tags: {string.Join(", ", note.Tags)}");
            }
            // Truncate content to avoid too much context
            var content = note.Content.Length > 500
                ? note.Content.Substring(0, 500) + "..."
                : note.Content;
            sb.AppendLine(content);
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static List<SuggestedPromptDto> ParsePromptsFromResponse(string response)
    {
        try
        {
            // Try to extract JSON from the response (in case there's extra text)
            var jsonStart = response.IndexOf('[');
            var jsonEnd = response.LastIndexOf(']');

            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonString = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var options = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                var prompts = System.Text.Json.JsonSerializer.Deserialize<List<SuggestedPromptDto>>(jsonString, options);
                return prompts ?? new List<SuggestedPromptDto>();
            }
        }
        catch
        {
            // Fall through to return empty list
        }

        return new List<SuggestedPromptDto>();
    }

    private static List<SuggestedPromptDto> GetDefaultPrompts()
    {
        return new List<SuggestedPromptDto>
        {
            new()
            {
                Id = "summarize",
                Label = "Summarize my notes",
                PromptTemplate = "Please summarize my notes on ",
                Category = "summarize"
            },
            new()
            {
                Id = "connections",
                Label = "Find connections",
                PromptTemplate = "What connections can you find between my notes about ",
                Category = "explore"
            },
            new()
            {
                Id = "ideas",
                Label = "Generate ideas",
                PromptTemplate = "Based on my notes, can you generate some ideas for ",
                Category = "create"
            },
            new()
            {
                Id = "questions",
                Label = "Ask questions",
                PromptTemplate = "What questions should I explore based on my notes about ",
                Category = "explore"
            }
        };
    }
}

