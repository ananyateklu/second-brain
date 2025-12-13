using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Commands.Chat.UpdateConversationSettings;

/// <summary>
/// Handler for UpdateConversationSettingsCommand
/// </summary>
public class UpdateConversationSettingsCommandHandler : IRequestHandler<UpdateConversationSettingsCommand, Result<ChatConversation>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<UpdateConversationSettingsCommandHandler> _logger;

    public UpdateConversationSettingsCommandHandler(
        IChatConversationService chatService,
        ILogger<UpdateConversationSettingsCommandHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<ChatConversation>> Handle(
        UpdateConversationSettingsCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Updating conversation settings. ConversationId: {ConversationId}, UserId: {UserId}",
            request.ConversationId, request.UserId);

        try
        {
            var updated = await _chatService.UpdateConversationSettingsAsync(
                request.ConversationId,
                request.UserId,
                request.RagEnabled,
                request.VectorStoreProvider,
                request.AgentEnabled,
                request.AgentRagEnabled,
                request.AgentCapabilities,
                cancellationToken);

            if (updated == null)
            {
                return Result<ChatConversation>.Failure(
                    Error.Custom("Conversation.NotFound", $"Conversation '{request.ConversationId}' not found"));
            }

            _logger.LogInformation("Conversation settings updated. ConversationId: {ConversationId}, UserId: {UserId}",
                request.ConversationId, request.UserId);

            return Result<ChatConversation>.Success(updated);
        }
        catch (UnauthorizedException)
        {
            return Result<ChatConversation>.Failure(
                Error.Custom("Conversation.AccessDenied", "Access denied"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating conversation settings. ConversationId: {ConversationId}, UserId: {UserId}",
                request.ConversationId, request.UserId);
            return Result<ChatConversation>.Failure(
                Error.Internal("Failed to update conversation settings"));
        }
    }
}
