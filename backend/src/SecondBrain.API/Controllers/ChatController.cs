using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
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
    private readonly IChatRepository _chatRepository;
    private readonly IAIProviderFactory _providerFactory;
    private readonly IRagService _ragService;
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        IChatRepository chatRepository,
        IAIProviderFactory providerFactory,
        IRagService ragService,
        IUserPreferencesService userPreferencesService,
        ILogger<ChatController> logger)
    {
        _chatRepository = chatRepository;
        _providerFactory = providerFactory;
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
            var conversations = await _chatRepository.GetAllAsync(userId);
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
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            // Verify conversation belongs to user
            if (conversation.UserId != userId)
            {
                _logger.LogWarning("User attempted to access conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}, ConversationUserId: {ConversationUserId}",
                    userId, id, conversation.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            return Ok(conversation);
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
            var conversation = new ChatConversation
            {
                Title = request.Title ?? "New Conversation",
                Provider = request.Provider,
                Model = request.Model,
                RagEnabled = request.RagEnabled,
                AgentEnabled = request.AgentEnabled,
                AgentCapabilities = request.AgentCapabilities,
                VectorStoreProvider = request.VectorStoreProvider,
                UserId = userId,
                Messages = new List<Core.Entities.ChatMessage>()
            };

            var created = await _chatRepository.CreateAsync(conversation);
            return CreatedAtAction(nameof(GetConversation), new { id = created.Id }, created);
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

            if (request.UseRag)
            {
                _logger.LogInformation("RAG enabled for streaming message. ConversationId: {ConversationId}, UserId: {UserId}",
                    id, userId);

                var ragContext = await _ragService.RetrieveContextAsync(
                    request.Content,
                    userId,
                    vectorStoreProvider: request.VectorStoreProvider,
                    cancellationToken: cancellationToken);

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

            // Add user message
            var inputTokens = TokenEstimator.EstimateTokenCount(request.Content);
            var userMessage = new Core.Entities.ChatMessage
            {
                Role = "user",
                Content = request.Content,
                Timestamp = DateTime.UtcNow,
                InputTokens = inputTokens
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

            // Add assistant message with retrieved notes
            var outputTokens = TokenEstimator.EstimateTokenCount(fullResponse.ToString());
            var assistantMessage = new Core.Entities.ChatMessage
            {
                Role = "assistant",
                Content = fullResponse.ToString(),
                Timestamp = DateTime.UtcNow,
                OutputTokens = outputTokens,
                DurationMs = durationMs,
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

            // Send end event with conversation ID and token usage
            var endData = System.Text.Json.JsonSerializer.Serialize(new
            {
                conversationId = id,
                messageId = conversation.Messages.Count - 1,
                inputTokens = inputTokens,
                outputTokens = outputTokens
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

            if (request.UseRag)
            {
                _logger.LogInformation(
                    "RAG enabled for message. ConversationId: {ConversationId}, UserId: {UserId}, VectorStore: {VectorStore}",
                    id, userId, request.VectorStoreProvider ?? "default");

                var ragContext = await _ragService.RetrieveContextAsync(
                    request.Content,
                    userId,
                    vectorStoreProvider: request.VectorStoreProvider,
                    cancellationToken: cancellationToken);

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

            // Add assistant message with retrieved notes if RAG was used
            var assistantMessage = new Core.Entities.ChatMessage
            {
                Role = "assistant",
                Content = aiResponse.Content,
                Timestamp = DateTime.UtcNow,
                OutputTokens = aiResponse.TokensUsed,
                DurationMs = durationMs,
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

            // Return conversation with retrieved notes
            var response = new ChatResponseWithRag
            {
                Conversation = updated,
                RetrievedNotes = retrievedNotes
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
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            // Verify conversation belongs to user
            if (conversation.UserId != userId)
            {
                _logger.LogWarning("User attempted to update conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}, ConversationUserId: {ConversationUserId}",
                    userId, id, conversation.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            // Update settings
            if (request.RagEnabled.HasValue)
            {
                conversation.RagEnabled = request.RagEnabled.Value;
            }

            if (request.VectorStoreProvider != null)
            {
                conversation.VectorStoreProvider = request.VectorStoreProvider;
            }

            if (request.AgentEnabled.HasValue)
            {
                conversation.AgentEnabled = request.AgentEnabled.Value;
            }

            if (request.AgentCapabilities != null)
            {
                conversation.AgentCapabilities = request.AgentCapabilities;
            }

            conversation.UpdatedAt = DateTime.UtcNow;

            var updated = await _chatRepository.UpdateAsync(id, conversation);
            if (updated == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            return Ok(updated);
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
            // First get the conversation to verify ownership
            var conversation = await _chatRepository.GetByIdAsync(id);
            if (conversation == null)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            // Verify conversation belongs to user
            if (conversation.UserId != userId)
            {
                _logger.LogWarning("User attempted to delete conversation belonging to another user. UserId: {UserId}, ConversationId: {ConversationId}, ConversationUserId: {ConversationUserId}",
                    userId, id, conversation.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            var deleted = await _chatRepository.DeleteAsync(id);
            if (!deleted)
            {
                return NotFound(new { error = $"Conversation '{id}' not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting conversation. ConversationId: {ConversationId}, UserId: {UserId}", id, userId);
            return StatusCode(500, new { error = "Failed to delete conversation" });
        }
    }
}

// DTOs for API requests
public class CreateConversationRequest
{
    public string? Title { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public bool RagEnabled { get; set; } = false;
    public bool AgentEnabled { get; set; } = false;
    public string? AgentCapabilities { get; set; }
    public string? VectorStoreProvider { get; set; }
}

public class SendMessageRequest
{
    public string Content { get; set; } = string.Empty;
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
    public bool UseRag { get; set; }
    public string? VectorStoreProvider { get; set; }
    /// <summary>
    /// Attached images for multimodal messages
    /// </summary>
    public List<Application.Services.AI.Models.MessageImage>? Images { get; set; }
}

public class UpdateConversationSettingsRequest
{
    public bool? RagEnabled { get; set; }
    public string? VectorStoreProvider { get; set; }
    public bool? AgentEnabled { get; set; }
    public string? AgentCapabilities { get; set; }
}

public class ChatResponseWithRag
{
    public ChatConversation Conversation { get; set; } = null!;
    public List<RagContextResponse> RetrievedNotes { get; set; } = new();
}

