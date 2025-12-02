using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.VectorStore;

public class CompositeVectorStore : IVectorStore
{
    private readonly IVectorStore _postgresStore;
    private readonly PineconeVectorStore _pineconeStore;
    private readonly RagSettings _settings;
    private readonly ILogger<CompositeVectorStore> _logger;
    private string? _providerOverride;

    public CompositeVectorStore(
        IVectorStore postgresStore,
        PineconeVectorStore pineconeStore,
        IOptions<RagSettings> settings,
        ILogger<CompositeVectorStore> logger)
    {
        _postgresStore = postgresStore;
        _pineconeStore = pineconeStore;
        _settings = settings.Value;
        _logger = logger;
    }

    public void SetProviderOverride(string provider)
    {
        _providerOverride = provider;
    }

    private string CurrentProvider => !string.IsNullOrEmpty(_providerOverride) 
        ? _providerOverride 
        : _settings.VectorStoreProvider;

    private bool UsePostgres => CurrentProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase) || 
                                CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase);

    private bool UsePinecone => CurrentProvider.Equals("Pinecone", StringComparison.OrdinalIgnoreCase) || 
                                CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase);

    // When "Both" is selected, we prefer Pinecone for search as it's a specialized vector DB
    private bool PreferPineconeForRead => CurrentProvider.Equals("Pinecone", StringComparison.OrdinalIgnoreCase) || 
                                          CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase);

    public async Task<bool> UpsertAsync(NoteEmbedding embedding, CancellationToken cancellationToken = default)
    {
        var success = true;
        
        if (UsePostgres)
        {
            var result = await _postgresStore.UpsertAsync(embedding, cancellationToken);
            if (!result) success = false;
        }

        if (UsePinecone)
        {
            var result = await _pineconeStore.UpsertAsync(embedding, cancellationToken);
            if (!result) success = false;
        }

        return success;
    }

    public async Task<bool> UpsertBatchAsync(IEnumerable<NoteEmbedding> embeddings, CancellationToken cancellationToken = default)
    {
        var success = true;
        // Materialize to avoid multiple enumerations
        var embeddingList = embeddings.ToList();

        if (UsePostgres)
        {
            var result = await _postgresStore.UpsertBatchAsync(embeddingList, cancellationToken);
            if (!result) success = false;
        }

        if (UsePinecone)
        {
            var result = await _pineconeStore.UpsertBatchAsync(embeddingList, cancellationToken);
            if (!result) success = false;
        }

        return success;
    }

    public async Task<List<VectorSearchResult>> SearchAsync(
        List<double> queryEmbedding, 
        string userId, 
        int topK, 
        float similarityThreshold = 0.7f, 
        CancellationToken cancellationToken = default)
    {
        if (PreferPineconeForRead)
        {
            try 
            {
                return await _pineconeStore.SearchAsync(queryEmbedding, userId, topK, similarityThreshold, cancellationToken);
            }
            catch (Exception ex)
            {
                // Fallback to PostgreSQL if Pinecone fails and we are in "Both" mode
                if (CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogError(ex, "Pinecone search failed, falling back to PostgreSQL.");
                    return await _postgresStore.SearchAsync(queryEmbedding, userId, topK, similarityThreshold, cancellationToken);
                }
                throw;
            }
        }
        
        return await _postgresStore.SearchAsync(queryEmbedding, userId, topK, similarityThreshold, cancellationToken);
    }

    public async Task<bool> DeleteByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var success = true;

        if (UsePostgres)
        {
            var result = await _postgresStore.DeleteByNoteIdAsync(noteId, cancellationToken);
            if (!result) success = false;
        }

        if (UsePinecone)
        {
            var result = await _pineconeStore.DeleteByNoteIdAsync(noteId, cancellationToken);
            if (!result) success = false;
        }

        return success;
    }

    public async Task<bool> DeleteByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var success = true;

        if (UsePostgres)
        {
            var result = await _postgresStore.DeleteByUserIdAsync(userId, cancellationToken);
            if (!result) success = false;
        }

        if (UsePinecone)
        {
            var result = await _pineconeStore.DeleteByUserIdAsync(userId, cancellationToken);
            if (!result) success = false;
        }

        return success;
    }

    public async Task<IndexStats> GetIndexStatsAsync(string userId, CancellationToken cancellationToken = default)
    {
        IndexStats stats;
        
        if (PreferPineconeForRead)
        {
            stats = await _pineconeStore.GetIndexStatsAsync(userId, cancellationToken);
        }
        else
        {
            stats = await _postgresStore.GetIndexStatsAsync(userId, cancellationToken);
        }

        // Ensure the provider reflects the actual setting (especially for "Both")
        stats.VectorStoreProvider = CurrentProvider;
        return stats;
    }

    public async Task<DateTime?> GetNoteUpdatedAtAsync(string noteId, CancellationToken cancellationToken = default)
    {
        // For reading, prefer the primary store based on configuration
        if (PreferPineconeForRead)
        {
            try
            {
                return await _pineconeStore.GetNoteUpdatedAtAsync(noteId, cancellationToken);
            }
            catch (Exception ex)
            {
                // Fallback to PostgreSQL if Pinecone fails and we are in "Both" mode
                if (CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(ex, "Pinecone GetNoteUpdatedAtAsync failed, falling back to PostgreSQL.");
                    return await _postgresStore.GetNoteUpdatedAtAsync(noteId, cancellationToken);
                }
                throw;
            }
        }

        return await _postgresStore.GetNoteUpdatedAtAsync(noteId, cancellationToken);
    }

    public async Task<HashSet<string>> GetIndexedNoteIdsAsync(string userId, CancellationToken cancellationToken = default)
    {
        // For reading, prefer the primary store based on configuration
        if (PreferPineconeForRead)
        {
            try
            {
                return await _pineconeStore.GetIndexedNoteIdsAsync(userId, cancellationToken);
            }
            catch (Exception ex)
            {
                // Fallback to PostgreSQL if Pinecone fails and we are in "Both" mode
                if (CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(ex, "Pinecone GetIndexedNoteIdsAsync failed, falling back to PostgreSQL.");
                    return await _postgresStore.GetIndexedNoteIdsAsync(userId, cancellationToken);
                }
                throw;
            }
        }

        return await _postgresStore.GetIndexedNoteIdsAsync(userId, cancellationToken);
    }

    public async Task<Dictionary<string, DateTime?>> GetIndexedNotesWithTimestampsAsync(string userId, CancellationToken cancellationToken = default)
    {
        // For reading, prefer the primary store based on configuration
        if (PreferPineconeForRead)
        {
            try
            {
                return await _pineconeStore.GetIndexedNotesWithTimestampsAsync(userId, cancellationToken);
            }
            catch (Exception ex)
            {
                // Fallback to PostgreSQL if Pinecone fails and we are in "Both" mode
                if (CurrentProvider.Equals("Both", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(ex, "Pinecone GetIndexedNotesWithTimestampsAsync failed, falling back to PostgreSQL.");
                    return await _postgresStore.GetIndexedNotesWithTimestampsAsync(userId, cancellationToken);
                }
                throw;
            }
        }

        return await _postgresStore.GetIndexedNotesWithTimestampsAsync(userId, cancellationToken);
    }
}
