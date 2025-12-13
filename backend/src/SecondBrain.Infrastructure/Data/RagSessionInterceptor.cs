using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Infrastructure.Data;

/// <summary>
/// EF Core connection interceptor that initializes PostgreSQL session settings
/// optimized for RAG workloads when a connection is opened.
///
/// This configures:
/// - hnsw.ef_search: Controls recall/speed tradeoff for vector search (higher = better recall)
/// - hnsw.iterative_scan: Enables iterative scan for filtered vector queries (pgvector 0.8+)
/// - hnsw.max_scan_tuples: Maximum tuples to scan in iterative mode
/// - work_mem: Memory for sorting operations (per operation)
/// - jit: JIT compilation for complex queries
/// </summary>
public class RagSessionInterceptor : DbConnectionInterceptor
{
    private readonly ILogger<RagSessionInterceptor>? _logger;
    private readonly int _efSearch;
    private readonly bool _enableIterativeScan;
    private readonly int _maxScanTuples;
    private readonly string _workMem;
    private readonly bool _enableJit;

    public RagSessionInterceptor(
        ILogger<RagSessionInterceptor>? logger = null,
        int efSearch = 100,
        bool enableIterativeScan = true,
        int maxScanTuples = 20000,
        string workMem = "128MB",
        bool enableJit = true)
    {
        _logger = logger;
        _efSearch = efSearch;
        _enableIterativeScan = enableIterativeScan;
        _maxScanTuples = maxScanTuples;
        _workMem = workMem;
        _enableJit = enableJit;
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        InitializeSession(connection);
        base.ConnectionOpened(connection, eventData);
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await InitializeSessionAsync(connection, cancellationToken);
        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }

    private void InitializeSession(DbConnection connection)
    {
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = BuildSessionInitSql();
            command.ExecuteNonQuery();

            _logger?.LogDebug(
                "RAG session initialized. ef_search={EfSearch}, iterative_scan={IterativeScan}, work_mem={WorkMem}",
                _efSearch, _enableIterativeScan, _workMem);
        }
        catch (Exception ex)
        {
            // Don't fail the connection if session init fails - these are optimizations
            _logger?.LogWarning(ex, "Failed to initialize RAG session settings. Continuing with defaults.");
        }
    }

    private async Task InitializeSessionAsync(DbConnection connection, CancellationToken cancellationToken)
    {
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = BuildSessionInitSql();
            await command.ExecuteNonQueryAsync(cancellationToken);

            _logger?.LogDebug(
                "RAG session initialized async. ef_search={EfSearch}, iterative_scan={IterativeScan}, work_mem={WorkMem}",
                _efSearch, _enableIterativeScan, _workMem);
        }
        catch (Exception ex)
        {
            // Don't fail the connection if session init fails - these are optimizations
            _logger?.LogWarning(ex, "Failed to initialize RAG session settings async. Continuing with defaults.");
        }
    }

    private string BuildSessionInitSql()
    {
        var statements = new List<string>
        {
            // HNSW search-time parameter (higher = better recall, slower)
            $"SET hnsw.ef_search = {_efSearch}",

            // Work memory for sorting/hashing operations
            $"SET work_mem = '{_workMem}'"
        };

        // pgvector 0.8+ iterative scan for filtered queries
        if (_enableIterativeScan)
        {
            statements.Add("SET hnsw.iterative_scan = 'relaxed_order'");
            statements.Add($"SET hnsw.max_scan_tuples = {_maxScanTuples}");
            // Also configure IVFFlat if used
            statements.Add("SET ivfflat.iterative_scan = 'on'");
            statements.Add("SET ivfflat.max_probes = 20");
        }

        // JIT compilation for complex queries
        if (_enableJit)
        {
            statements.Add("SET jit = 'on'");
            statements.Add("SET jit_above_cost = 50000");
        }

        return string.Join("; ", statements);
    }
}
