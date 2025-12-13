using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Commands.Chat.CreateConversation;

/// <summary>
/// Handler for CreateConversationCommand
/// </summary>
public class CreateConversationCommandHandler : IRequestHandler<CreateConversationCommand, Result<ChatConversation>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<CreateConversationCommandHandler> _logger;

    public CreateConversationCommandHandler(
        IChatConversationService chatService,
        ILogger<CreateConversationCommandHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<ChatConversation>> Handle(
        CreateConversationCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Creating conversation. Provider: {Provider}, Model: {Model}, UserId: {UserId}",
            request.Provider, request.Model, request.UserId);

        try
        {
            var conversation = await _chatService.CreateConversationAsync(
                request.Title,
                request.Provider,
                request.Model,
                request.UserId,
                request.RagEnabled,
                request.AgentEnabled,
                request.AgentRagEnabled,
                request.ImageGenerationEnabled,
                request.AgentCapabilities,
                request.VectorStoreProvider,
                cancellationToken);

            _logger.LogInformation("Conversation created. ConversationId: {ConversationId}, UserId: {UserId}",
                conversation.Id, request.UserId);

            return Result<ChatConversation>.Success(conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation. Provider: {Provider}, UserId: {UserId}",
                request.Provider, request.UserId);
            return Result<ChatConversation>.Failure(
                Error.Internal("Failed to create conversation"));
        }
    }
}
