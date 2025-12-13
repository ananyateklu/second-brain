using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.DeleteIndexedNotes;

/// <summary>
/// Command to delete all indexed notes for a user from a specific vector store
/// </summary>
public record DeleteIndexedNotesCommand(
    string UserId,
    string VectorStoreProvider
) : IRequest<Result<bool>>;
