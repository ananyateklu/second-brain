using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.CancelIndexing;

/// <summary>
/// Command to cancel an active indexing job
/// </summary>
public record CancelIndexingCommand(
    string JobId
) : IRequest<Result<bool>>;
