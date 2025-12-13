using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Indexing.DeleteIndexedNotes;

/// <summary>
/// Service key constants for vector stores
/// </summary>
internal static class VectorStoreKeys
{
    public const string PostgreSQL = "PostgreSQL";
    public const string Pinecone = "Pinecone";
}

/// <summary>
/// Handler for DeleteIndexedNotesCommand
/// </summary>
public class DeleteIndexedNotesCommandHandler : IRequestHandler<DeleteIndexedNotesCommand, Result<bool>>
{
    private readonly IVectorStore _postgresStore;
    private readonly IVectorStore _pineconeStore;
    private readonly ILogger<DeleteIndexedNotesCommandHandler> _logger;

    public DeleteIndexedNotesCommandHandler(
        [FromKeyedServices(VectorStoreKeys.PostgreSQL)] IVectorStore postgresStore,
        [FromKeyedServices(VectorStoreKeys.Pinecone)] IVectorStore pineconeStore,
        ILogger<DeleteIndexedNotesCommandHandler> logger)
    {
        _postgresStore = postgresStore;
        _pineconeStore = pineconeStore;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        DeleteIndexedNotesCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Deleting indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}",
            request.UserId, request.VectorStoreProvider);

        try
        {
            bool success;
            string storeName = request.VectorStoreProvider;

            if (request.VectorStoreProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                success = await _postgresStore.DeleteByUserIdAsync(request.UserId, cancellationToken);
            }
            else if (request.VectorStoreProvider.Equals("Pinecone", StringComparison.OrdinalIgnoreCase))
            {
                success = await _pineconeStore.DeleteByUserIdAsync(request.UserId, cancellationToken);
            }
            else
            {
                return Result<bool>.Failure(Error.Validation("Invalid vectorStoreProvider. Must be 'PostgreSQL' or 'Pinecone'"));
            }

            if (!success)
            {
                _logger.LogWarning("Failed to delete indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}",
                    request.UserId, request.VectorStoreProvider);
                return Result<bool>.Failure(Error.Internal($"Failed to delete indexed notes from {storeName}"));
            }

            _logger.LogInformation("Successfully deleted indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}",
                request.UserId, request.VectorStoreProvider);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}",
                request.UserId, request.VectorStoreProvider);
            return Result<bool>.Failure(Error.Internal("Failed to delete indexed notes"));
        }
    }
}
