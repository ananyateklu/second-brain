using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.RagAnalytics.SubmitFeedback;

/// <summary>
/// Command to submit feedback for a RAG query response
/// </summary>
public record SubmitFeedbackCommand(
    string UserId,
    Guid LogId,
    string Feedback,
    string? Category = null,
    string? Comment = null
) : IRequest<Result<bool>>;
