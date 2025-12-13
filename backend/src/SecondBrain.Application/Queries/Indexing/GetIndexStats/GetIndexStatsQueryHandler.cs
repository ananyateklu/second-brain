using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Indexing.GetIndexStats;

/// <summary>
/// Service key constants for vector stores
/// </summary>
internal static class VectorStoreKeys
{
    public const string PostgreSQL = "PostgreSQL";
    public const string Pinecone = "Pinecone";
}

/// <summary>
/// Handler for GetIndexStatsQuery
/// </summary>
public class GetIndexStatsQueryHandler : IRequestHandler<GetIndexStatsQuery, Result<IndexStatsResponse>>
{
    private readonly IVectorStore _postgresStore;
    private readonly IVectorStore _pineconeStore;
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<GetIndexStatsQueryHandler> _logger;

    public GetIndexStatsQueryHandler(
        [FromKeyedServices(VectorStoreKeys.PostgreSQL)] IVectorStore postgresStore,
        [FromKeyedServices(VectorStoreKeys.Pinecone)] IVectorStore pineconeStore,
        INoteRepository noteRepository,
        ILogger<GetIndexStatsQueryHandler> logger)
    {
        _postgresStore = postgresStore;
        _pineconeStore = pineconeStore;
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<IndexStatsResponse>> Handle(
        GetIndexStatsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting index stats. UserId: {UserId}", request.UserId);

        try
        {
            var response = new IndexStatsResponse();

            // Get all notes for the user to calculate not indexed and stale counts
            var allNotes = (await _noteRepository.GetByUserIdAsync(request.UserId)).ToList();
            var totalNotesCount = allNotes.Count;

            // Get PostgreSQL stats
            try
            {
                var postgresStats = await _postgresStore.GetIndexStatsAsync(request.UserId, cancellationToken);
                var postgresIndexedWithTimestamps = await _postgresStore.GetIndexedNotesWithTimestampsAsync(request.UserId, cancellationToken);

                // Calculate not indexed count
                var postgresIndexedIds = postgresIndexedWithTimestamps.Keys.ToHashSet();
                var postgresNotIndexedCount = allNotes.Count(n => !postgresIndexedIds.Contains(n.Id));

                // Calculate stale notes count (notes where UpdatedAt > NoteUpdatedAt in embedding)
                var postgresStaleCount = 0;
                foreach (var note in allNotes)
                {
                    if (postgresIndexedWithTimestamps.TryGetValue(note.Id, out var indexedUpdatedAt))
                    {
                        if (indexedUpdatedAt.HasValue && note.UpdatedAt > indexedUpdatedAt.Value)
                        {
                            postgresStaleCount++;
                        }
                    }
                }

                response.PostgreSQL = new IndexStatsData
                {
                    TotalEmbeddings = postgresStats.TotalEmbeddings,
                    UniqueNotes = postgresStats.UniqueNotes,
                    LastIndexedAt = postgresStats.LastIndexedAt,
                    EmbeddingProvider = postgresStats.EmbeddingProvider,
                    VectorStoreProvider = postgresStats.VectorStoreProvider,
                    TotalNotesInSystem = totalNotesCount,
                    NotIndexedCount = postgresNotIndexedCount,
                    StaleNotesCount = postgresStaleCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting PostgreSQL stats. UserId: {UserId}", request.UserId);
                // Continue to try Pinecone even if PostgreSQL fails
            }

            // Get Pinecone stats
            try
            {
                var pineconeStats = await _pineconeStore.GetIndexStatsAsync(request.UserId, cancellationToken);
                var pineconeIndexedWithTimestamps = await _pineconeStore.GetIndexedNotesWithTimestampsAsync(request.UserId, cancellationToken);

                // Calculate not indexed count
                var pineconeIndexedIds = pineconeIndexedWithTimestamps.Keys.ToHashSet();
                var pineconeNotIndexedCount = allNotes.Count(n => !pineconeIndexedIds.Contains(n.Id));

                // Calculate stale notes count (notes where UpdatedAt > NoteUpdatedAt in embedding)
                var pineconeStaleCount = 0;
                foreach (var note in allNotes)
                {
                    if (pineconeIndexedWithTimestamps.TryGetValue(note.Id, out var indexedUpdatedAt))
                    {
                        if (indexedUpdatedAt.HasValue && note.UpdatedAt > indexedUpdatedAt.Value)
                        {
                            pineconeStaleCount++;
                        }
                    }
                }

                response.Pinecone = new IndexStatsData
                {
                    TotalEmbeddings = pineconeStats.TotalEmbeddings,
                    UniqueNotes = pineconeStats.UniqueNotes,
                    LastIndexedAt = pineconeStats.LastIndexedAt,
                    EmbeddingProvider = pineconeStats.EmbeddingProvider,
                    VectorStoreProvider = pineconeStats.VectorStoreProvider,
                    TotalNotesInSystem = totalNotesCount,
                    NotIndexedCount = pineconeNotIndexedCount,
                    StaleNotesCount = pineconeStaleCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting Pinecone stats. UserId: {UserId}", request.UserId);
                // Continue even if Pinecone fails
            }

            return Result<IndexStatsResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting index stats. UserId: {UserId}", request.UserId);
            return Result<IndexStatsResponse>.Failure(Error.Internal("Failed to get index stats"));
        }
    }
}
