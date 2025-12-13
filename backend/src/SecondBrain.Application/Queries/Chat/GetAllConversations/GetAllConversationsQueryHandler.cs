using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetAllConversations;

/// <summary>
/// Handler for GetAllConversationsQuery
/// </summary>
public class GetAllConversationsQueryHandler : IRequestHandler<GetAllConversationsQuery, Result<IEnumerable<ChatConversation>>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<GetAllConversationsQueryHandler> _logger;

    public GetAllConversationsQueryHandler(
        IChatConversationService chatService,
        ILogger<GetAllConversationsQueryHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<IEnumerable<ChatConversation>>> Handle(
        GetAllConversationsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting all conversations for user. UserId: {UserId}", request.UserId);

        try
        {
            var conversations = await _chatService.GetAllConversationsAsync(request.UserId, cancellationToken);
            return Result<IEnumerable<ChatConversation>>.Success(conversations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversations. UserId: {UserId}", request.UserId);
            return Result<IEnumerable<ChatConversation>>.Failure(
                Error.Internal("Failed to retrieve conversations"));
        }
    }
}
