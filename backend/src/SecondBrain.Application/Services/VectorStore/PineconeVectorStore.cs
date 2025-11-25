using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pinecone;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.VectorStore.Models;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.VectorStore;

public class PineconeVectorStore : IVectorStore
{
    private readonly PineconeClient _client;
    private readonly PineconeSettings _settings;
    private readonly ILogger<PineconeVectorStore> _logger;
    private IndexClient? _indexClient;

    public PineconeVectorStore(
        IOptions<PineconeSettings> settings,
        ILogger<PineconeVectorStore> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        _client = new PineconeClient(_settings.ApiKey);
    }

    private async Task<IndexClient> GetIndexClientAsync()
    {
        if (_indexClient != null)
            return _indexClient;

        try
        {
            await _client.ListIndexesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not list indexes to verify existence, proceeding anyway.");
        }

        _indexClient = _client.Index(_settings.IndexName);
        return _indexClient;
    }

    private string ExtractMetadataString(object? metadataValue)
    {
        if (metadataValue == null) return string.Empty;
        
        var stringValue = metadataValue.ToString() ?? string.Empty;
        
        // Check if it's JSON-escaped (starts and ends with quotes)
        if (stringValue.StartsWith("\"") && stringValue.EndsWith("\""))
        {
            try
            {
                // Deserialize the JSON string to get the actual value
                return System.Text.Json.JsonSerializer.Deserialize<string>(stringValue) ?? string.Empty;
            }
            catch
            {
                // If deserialization fails, strip quotes manually
                return stringValue.Trim('"');
            }
        }
        
        return stringValue;
    }

    public async Task<bool> UpsertAsync(
        NoteEmbedding embedding,
        CancellationToken cancellationToken = default)
    {
        return await UpsertBatchAsync(new[] { embedding }, cancellationToken);
    }

    public async Task<bool> UpsertBatchAsync(
        IEnumerable<NoteEmbedding> embeddings,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var index = await GetIndexClientAsync();
            var vectors = new List<Vector>();

            foreach (var item in embeddings)
            {
                var metadata = new Metadata
                {
                    ["noteId"] = item.NoteId,
                    ["userId"] = item.UserId,
                    ["content"] = item.Content,
                    ["noteTitle"] = item.NoteTitle,
                    ["chunkIndex"] = item.ChunkIndex,
                    ["embeddingProvider"] = item.EmbeddingProvider,
                    ["embeddingModel"] = item.EmbeddingModel,
                    ["createdAt"] = item.CreatedAt.ToString("o")
                };

                if (item.NoteTags != null && item.NoteTags.Any())
                {
                    metadata["noteTags"] = string.Join(",", item.NoteTags);
                }

                var vector = new Vector
                {
                    Id = item.Id,
                    Values = item.Embedding?.ToArray() ?? Array.Empty<float>(),
                    Metadata = metadata
                };
                vectors.Add(vector);
            }

            var request = new UpsertRequest { Vectors = vectors };
            await index.UpsertAsync(request);

            _logger.LogInformation("Successfully upserted {Count} embeddings to Pinecone", vectors.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting batch to Pinecone");
            return false;
        }
    }

    public async Task<List<VectorSearchResult>> SearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.7f,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var index = await GetIndexClientAsync();

            // No userId filter for single-user system
            var query = new QueryRequest
            {
                Vector = queryEmbedding.Select(d => (float)d).ToArray(),
                TopK = (uint)topK,
                IncludeMetadata = true,
                IncludeValues = false
            };

            var response = await index.QueryAsync(query);
            var results = new List<VectorSearchResult>();

            if (response.Matches != null)
            {
                foreach (var match in response.Matches)
                {
                    if ((match.Score ?? 0f) < similarityThreshold)
                        continue;

                    var result = new VectorSearchResult
                    {
                        Id = match.Id,
                        SimilarityScore = match.Score ?? 0f,
                        Metadata = match.Metadata != null
                            ? match.Metadata.ToDictionary(
                                k => k.Key,
                                v => (object)(v.Value?.ToString() ?? ""))
                            : new Dictionary<string, object>()
                    };

                    if (match.Metadata != null)
                    {
                        if (match.Metadata.TryGetValue("noteId", out var noteId)) 
                            result.NoteId = ExtractMetadataString(noteId);
                        if (match.Metadata.TryGetValue("content", out var content)) 
                            result.Content = ExtractMetadataString(content);
                        if (match.Metadata.TryGetValue("noteTitle", out var title)) 
                            result.NoteTitle = ExtractMetadataString(title);
                        if (match.Metadata.TryGetValue("noteTags", out var tags))
                        {
                            var tagsStr = ExtractMetadataString(tags);
                            if (!string.IsNullOrEmpty(tagsStr))
                            {
                                result.NoteTags = tagsStr.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                                    .Select(t => t.Trim()).ToList();
                            }
                        }
                        if (match.Metadata.TryGetValue("chunkIndex", out var chunkIdx) && chunkIdx != null)
                        {
                            if (int.TryParse(chunkIdx.ToString(), out int idx)) result.ChunkIndex = idx;
                        }
                    }

                    results.Add(result);
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching Pinecone. UserId: {UserId}", userId);
            return new List<VectorSearchResult>();
        }
    }

    public async Task<bool> DeleteByNoteIdAsync(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var index = await GetIndexClientAsync();
            var filter = new Metadata
            {
                ["noteId"] = noteId
            };

            var request = new DeleteRequest { Filter = filter };
            await index.DeleteAsync(request);

            _logger.LogInformation("Deleted embeddings for note {NoteId} from Pinecone", noteId);
            return true;
        }
        catch (Pinecone.PineconeApiException ex) when (ex.Message.Contains("status code 5"))
        {
            // gRPC status code 5 = NOT_FOUND - this is not an error, just means nothing to delete
            _logger.LogDebug("No existing embeddings found for note {NoteId} (this is expected for new notes)", noteId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting by NoteId {NoteId}", noteId);
            return false;
        }
    }

    public async Task<bool> DeleteByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var index = await GetIndexClientAsync();
            var filter = new Metadata
            {
                ["userId"] = userId
            };

            var request = new DeleteRequest { Filter = filter };
            await index.DeleteAsync(request);

            _logger.LogInformation("Deleted embeddings for user {UserId} from Pinecone", userId);
            return true;
        }
        catch (Pinecone.PineconeApiException ex) when (ex.Message.Contains("status code 5"))
        {
            // gRPC status code 5 = NOT_FOUND - this is not an error, just means nothing to delete
            _logger.LogDebug("No existing embeddings found for user {UserId} (this is expected for new users)", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting by UserId {UserId}", userId);
            return false;
        }
    }

    public async Task<IndexStats> GetIndexStatsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var index = await GetIndexClientAsync();

            // Get index dimension from stats (we need it for the dummy vector)
            var indexStats = await index.DescribeIndexStatsAsync(new DescribeIndexStatsRequest());
            var dimension = indexStats.Dimension ?? 1536; // Default to 1536 if not available

            // Create a dummy vector (all zeros) for counting all embeddings (single-user system)
            var dummyVector = new float[dimension];

            // Query with a very high TopK to get all vectors (no userId filter for single-user system)
            var query = new QueryRequest
            {
                Vector = dummyVector,
                TopK = 10000, // Maximum TopK to get as many matches as possible
                IncludeMetadata = true,
                IncludeValues = false
            };

            var response = await index.QueryAsync(query);

            // Extract unique note IDs and other stats from metadata
            var uniqueNotes = new HashSet<string>();
            var lastIndexed = (DateTime?)null;
            var embeddingProvider = string.Empty;
            var matchingVectors = 0;

            if (response.Matches != null)
            {
                matchingVectors = response.Matches.Count();
                foreach (var match in response.Matches)
                {
                    if (match.Metadata != null)
                    {
                        if (match.Metadata.TryGetValue("noteId", out var noteId))
                        {
                            var noteIdStr = ExtractMetadataString(noteId);
                            if (!string.IsNullOrEmpty(noteIdStr))
                            {
                                uniqueNotes.Add(noteIdStr);
                            }
                        }

                        // Parse createdAt date - handle both string and direct date formats
                        if (match.Metadata.TryGetValue("createdAt", out var createdAt))
                        {
                            var createdAtStr = ExtractMetadataString(createdAt);
                            if (!string.IsNullOrEmpty(createdAtStr))
                            {
                                // Try parsing ISO 8601 format (stored as "o" format: 2025-11-18T20:09:09.864913Z)
                                if (DateTime.TryParse(createdAtStr, null, System.Globalization.DateTimeStyles.RoundtripKind, out var date))
                                {
                                    if (lastIndexed == null || date > lastIndexed.Value)
                                    {
                                        lastIndexed = date;
                                    }
                                }
                                else
                                {
                                    // Try alternative parsing methods
                                    if (DateTime.TryParse(createdAtStr, out var dateAlt))
                                    {
                                        if (lastIndexed == null || dateAlt > lastIndexed.Value)
                                        {
                                            lastIndexed = dateAlt;
                                        }
                                    }
                                    else
                                    {
                                        _logger.LogWarning("Failed to parse createdAt date: {CreatedAt}", createdAtStr);
                                    }
                                }
                            }
                        }

                        // Extract embedding provider - check all matches to find a valid provider
                        if (match.Metadata.TryGetValue("embeddingProvider", out var provider))
                        {
                            var providerStr = ExtractMetadataString(provider);
                            if (!string.IsNullOrEmpty(providerStr) &&
                                !providerStr.Equals("Pinecone", StringComparison.OrdinalIgnoreCase) &&
                                string.IsNullOrEmpty(embeddingProvider))
                            {
                                embeddingProvider = providerStr;
                            }
                        }
                    }
                }
            }

            return new IndexStats
            {
                UserId = userId,
                TotalEmbeddings = matchingVectors,
                UniqueNotes = uniqueNotes.Count,
                LastIndexedAt = lastIndexed,
                EmbeddingProvider = embeddingProvider,
                VectorStoreProvider = "Pinecone"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stats for UserId {UserId}", userId);
            return new IndexStats { UserId = userId, VectorStoreProvider = "Pinecone" };
        }
    }
}
