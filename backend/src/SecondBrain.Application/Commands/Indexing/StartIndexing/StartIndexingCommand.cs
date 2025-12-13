using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.StartIndexing;

/// <summary>
/// Command to start indexing all notes for a user
/// </summary>
public record StartIndexingCommand(
    string UserId,
    string? EmbeddingProvider = null,
    string? VectorStoreProvider = null,
    string? EmbeddingModel = null
) : IRequest<Result<IndexingJobResponse>>;
