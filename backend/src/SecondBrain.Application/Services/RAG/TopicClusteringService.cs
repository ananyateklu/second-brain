using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using System.Text.Json;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for clustering RAG queries to identify topic patterns and problem areas.
/// Uses embeddings and K-means clustering to group similar queries.
/// </summary>
public interface ITopicClusteringService
{
    /// <summary>
    /// Cluster recent queries and assign topic labels
    /// </summary>
    Task<TopicClusteringResult> ClusterQueriesAsync(
        string userId,
        int clusterCount = 5,
        DateTime? since = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get statistics for each topic cluster
    /// </summary>
    Task<List<TopicStats>> GetTopicStatsAsync(
        string userId,
        CancellationToken cancellationToken = default);
}

public class TopicClusteringResult
{
    public int TotalProcessed { get; set; }
    public int ClusterCount { get; set; }
    public List<string> TopicLabels { get; set; } = new();
    public string? Error { get; set; }
    public bool Success { get; set; }
}

public class TopicStats
{
    public int ClusterId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int QueryCount { get; set; }
    public int PositiveFeedback { get; set; }
    public int NegativeFeedback { get; set; }
    public double PositiveFeedbackRate { get; set; }
    public double AvgCosineScore { get; set; }
    public double AvgRerankScore { get; set; }
    public List<string> SampleQueries { get; set; } = new();
}

public class TopicClusteringService : ITopicClusteringService
{
    private readonly IRagQueryLogRepository _repository;
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly RagSettings _settings;
    private readonly ILogger<TopicClusteringService> _logger;

    private const int MIN_QUERIES_FOR_CLUSTERING = 10;
    private const int MAX_QUERIES_FOR_CLUSTERING = 1000;
    private const int SAMPLE_QUERIES_PER_CLUSTER = 5;

    public TopicClusteringService(
        IRagQueryLogRepository repository,
        IEmbeddingProviderFactory embeddingProviderFactory,
        IAIProviderFactory aiProviderFactory,
        IOptions<RagSettings> settings,
        ILogger<TopicClusteringService> logger)
    {
        _repository = repository;
        _embeddingProviderFactory = embeddingProviderFactory;
        _aiProviderFactory = aiProviderFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TopicClusteringResult> ClusterQueriesAsync(
        string userId,
        int clusterCount = 5,
        DateTime? since = null,
        CancellationToken cancellationToken = default)
    {
        var result = new TopicClusteringResult();

        try
        {
            _logger.LogInformation(
                "Starting topic clustering. UserId: {UserId}, ClusterCount: {Count}",
                userId, clusterCount);

            // Get recent queries
            var effectiveSince = since ?? DateTime.UtcNow.AddDays(-90);
            var logs = (await _repository.GetByUserIdAsync(userId, effectiveSince)).ToList();

            if (logs.Count < MIN_QUERIES_FOR_CLUSTERING)
            {
                result.Error = $"Not enough queries for clustering. Need at least {MIN_QUERIES_FOR_CLUSTERING}, found {logs.Count}";
                return result;
            }

            // Limit the number of queries to process
            if (logs.Count > MAX_QUERIES_FOR_CLUSTERING)
            {
                logs = logs.Take(MAX_QUERIES_FOR_CLUSTERING).ToList();
            }

            // Generate embeddings for queries that don't have them
            var embeddingProvider = _embeddingProviderFactory.GetDefaultProvider();
            var embeddings = new List<(RagQueryLog Log, List<double> Embedding)>();

            foreach (var log in logs)
            {
                List<double>? embedding = null;

                // Try to use cached embedding
                if (!string.IsNullOrEmpty(log.QueryEmbeddingJson))
                {
                    try
                    {
                        embedding = JsonSerializer.Deserialize<List<double>>(log.QueryEmbeddingJson);
                    }
                    catch
                    {
                        // Ignore parsing errors, will regenerate
                    }
                }

                // Generate new embedding if needed
                if (embedding == null || embedding.Count == 0)
                {
                    var embeddingResponse = await embeddingProvider.GenerateEmbeddingAsync(
                        log.Query, cancellationToken);
                    
                    if (embeddingResponse.Success)
                    {
                        embedding = embeddingResponse.Embedding;
                        
                        // Cache the embedding
                        log.QueryEmbeddingJson = JsonSerializer.Serialize(embedding);
                        await _repository.UpdateAsync(log.Id, log);
                    }
                }

                if (embedding != null && embedding.Any())
                {
                    embeddings.Add((log, embedding));
                }
            }

            if (embeddings.Count < MIN_QUERIES_FOR_CLUSTERING)
            {
                result.Error = $"Failed to generate enough embeddings. Got {embeddings.Count}";
                return result;
            }

            // Perform K-means clustering
            var clusters = KMeansClustering(
                embeddings.Select(e => e.Embedding.ToArray()).ToList(),
                Math.Min(clusterCount, embeddings.Count / 3));

            // Assign cluster IDs to logs
            for (int i = 0; i < embeddings.Count; i++)
            {
                var log = embeddings[i].Log;
                log.TopicCluster = clusters[i];
                await _repository.UpdateAsync(log.Id, log);
            }

            // Generate topic labels using LLM
            var topicLabels = await GenerateTopicLabelsAsync(
                embeddings, clusters, clusterCount, cancellationToken);

            // Update logs with topic labels
            for (int i = 0; i < embeddings.Count; i++)
            {
                var log = embeddings[i].Log;
                var clusterId = clusters[i];
                if (clusterId < topicLabels.Count)
                {
                    log.TopicLabel = topicLabels[clusterId];
                    await _repository.UpdateAsync(log.Id, log);
                }
            }

            result.TotalProcessed = embeddings.Count;
            result.ClusterCount = topicLabels.Count;
            result.TopicLabels = topicLabels;
            result.Success = true;

            _logger.LogInformation(
                "Topic clustering completed. Processed: {Count}, Clusters: {Clusters}",
                result.TotalProcessed, result.ClusterCount);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during topic clustering. UserId: {UserId}", userId);
            result.Error = ex.Message;
            return result;
        }
    }

    public async Task<List<TopicStats>> GetTopicStatsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var stats = new List<TopicStats>();

        try
        {
            var logs = (await _repository.GetByUserIdAsync(userId)).ToList();
            
            var clusteredLogs = logs
                .Where(l => l.TopicCluster.HasValue)
                .GroupBy(l => l.TopicCluster!.Value)
                .ToList();

            foreach (var cluster in clusteredLogs)
            {
                var clusterLogs = cluster.ToList();
                var logsWithFeedback = clusterLogs.Where(l => !string.IsNullOrEmpty(l.UserFeedback)).ToList();
                var positive = clusterLogs.Count(l => l.UserFeedback == "thumbs_up");
                var negative = clusterLogs.Count(l => l.UserFeedback == "thumbs_down");

                stats.Add(new TopicStats
                {
                    ClusterId = cluster.Key,
                    Label = clusterLogs.FirstOrDefault()?.TopicLabel ?? $"Topic {cluster.Key + 1}",
                    QueryCount = clusterLogs.Count,
                    PositiveFeedback = positive,
                    NegativeFeedback = negative,
                    PositiveFeedbackRate = logsWithFeedback.Count > 0 
                        ? (double)positive / logsWithFeedback.Count 
                        : 0,
                    AvgCosineScore = clusterLogs
                        .Where(l => l.TopCosineScore.HasValue)
                        .Select(l => (double)l.TopCosineScore!.Value)
                        .DefaultIfEmpty(0)
                        .Average(),
                    AvgRerankScore = clusterLogs
                        .Where(l => l.TopRerankScore.HasValue)
                        .Select(l => (double)l.TopRerankScore!.Value)
                        .DefaultIfEmpty(0)
                        .Average(),
                    SampleQueries = clusterLogs
                        .Take(SAMPLE_QUERIES_PER_CLUSTER)
                        .Select(l => l.Query.Length > 100 ? l.Query.Substring(0, 100) + "..." : l.Query)
                        .ToList()
                });
            }

            return stats.OrderByDescending(s => s.QueryCount).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting topic stats. UserId: {UserId}", userId);
            return stats;
        }
    }

    /// <summary>
    /// Simple K-means clustering implementation
    /// </summary>
    private List<int> KMeansClustering(List<double[]> embeddings, int k)
    {
        if (k <= 0 || embeddings.Count == 0)
            return Enumerable.Repeat(0, embeddings.Count).ToList();

        var random = new Random(42); // Fixed seed for reproducibility
        var dimensions = embeddings[0].Length;
        
        // Initialize centroids randomly
        var centroids = embeddings
            .OrderBy(_ => random.Next())
            .Take(k)
            .Select(e => e.ToArray())
            .ToList();

        var assignments = new int[embeddings.Count];
        var maxIterations = 100;
        var converged = false;

        for (int iteration = 0; iteration < maxIterations && !converged; iteration++)
        {
            // Assign points to nearest centroid
            var newAssignments = new int[embeddings.Count];
            for (int i = 0; i < embeddings.Count; i++)
            {
                var minDistance = double.MaxValue;
                var nearestCentroid = 0;

                for (int c = 0; c < centroids.Count; c++)
                {
                    var distance = EuclideanDistance(embeddings[i], centroids[c]);
                    if (distance < minDistance)
                    {
                        minDistance = distance;
                        nearestCentroid = c;
                    }
                }

                newAssignments[i] = nearestCentroid;
            }

            // Check for convergence
            converged = assignments.SequenceEqual(newAssignments);
            assignments = newAssignments;

            // Update centroids
            for (int c = 0; c < k; c++)
            {
                var clusterPoints = embeddings
                    .Where((_, i) => assignments[i] == c)
                    .ToList();

                if (clusterPoints.Any())
                {
                    for (int d = 0; d < dimensions; d++)
                    {
                        centroids[c][d] = clusterPoints.Average(p => p[d]);
                    }
                }
            }
        }

        return assignments.ToList();
    }

    private double EuclideanDistance(double[] a, double[] b)
    {
        return Math.Sqrt(a.Zip(b, (x, y) => (x - y) * (x - y)).Sum());
    }

    private async Task<List<string>> GenerateTopicLabelsAsync(
        List<(RagQueryLog Log, List<double> Embedding)> embeddings,
        List<int> clusters,
        int clusterCount,
        CancellationToken cancellationToken)
    {
        var labels = new List<string>();

        try
        {
            var provider = _aiProviderFactory.GetProvider(_settings.RerankingProvider);
            if (provider == null)
            {
                // Return default labels if no provider available
                return Enumerable.Range(0, clusterCount)
                    .Select(i => $"Topic {i + 1}")
                    .ToList();
            }

            // Group queries by cluster
            var clusterGroups = embeddings
                .Select((e, i) => new { Log = e.Log, Cluster = clusters[i] })
                .GroupBy(x => x.Cluster)
                .OrderBy(g => g.Key)
                .ToList();

            foreach (var group in clusterGroups)
            {
                var sampleQueries = group
                    .Take(5)
                    .Select(g => g.Log.Query)
                    .ToList();

                var prompt = $@"Given these similar queries from a user's knowledge base search:

{string.Join("\n", sampleQueries.Select((q, i) => $"{i + 1}. {q}"))}

Generate a SHORT topic label (2-4 words) that describes what these queries have in common.
Respond with ONLY the topic label, nothing else.";

                var request = new AIRequest
                {
                    Prompt = prompt,
                    MaxTokens = 20,
                    Temperature = 0.3f
                };

                var response = await provider.GenerateCompletionAsync(request, cancellationToken);
                var label = response.Content?.Trim() ?? $"Topic {group.Key + 1}";
                
                // Clean up the label
                label = label.Replace("\"", "").Replace(".", "").Trim();
                if (label.Length > 50) label = label.Substring(0, 50);
                if (string.IsNullOrWhiteSpace(label)) label = $"Topic {group.Key + 1}";

                labels.Add(label);
            }

            return labels;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to generate topic labels, using defaults");
            return Enumerable.Range(0, clusterCount)
                .Select(i => $"Topic {i + 1}")
                .ToList();
        }
    }
}

