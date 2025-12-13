using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetConversationById;

/// <summary>
/// Handler for GetConversationByIdQuery
/// </summary>
public class GetConversationByIdQueryHandler : IRequestHandler<GetConversationByIdQuery, Result<ChatConversation>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<GetConversationByIdQueryHandler> _logger;

    public GetConversationByIdQueryHandler(
        IChatConversationService chatService,
        ILogger<GetConversationByIdQueryHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<ChatConversation>> Handle(
        GetConversationByIdQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting conversation by ID. ConversationId: {ConversationId}, UserId: {UserId}",
            request.ConversationId, request.UserId);

        try
        {
            var conversation = await _chatService.GetConversationByIdAsync(
                request.ConversationId,
                request.UserId,
                cancellationToken);

            if (conversation == null)
            {
                return Result<ChatConversation>.Failure(
                    Error.Custom("Conversation.NotFound", $"Conversation '{request.ConversationId}' not found"));
            }

            return Result<ChatConversation>.Success(conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversation. ConversationId: {ConversationId}, UserId: {UserId}",
                request.ConversationId, request.UserId);
            return Result<ChatConversation>.Failure(
                Error.Internal("Failed to retrieve conversation"));
        }
    }
}
