using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Infrastructure.Data;

/// <summary>
/// Ensures performance indexes exist in the database.
/// This is particularly useful for desktop mode where EnsureCreated doesn't
/// update existing databases with new indexes.
/// </summary>
public class DatabaseIndexInitializer
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseIndexInitializer> _logger;

    public DatabaseIndexInitializer(
        ApplicationDbContext context,
        ILogger<DatabaseIndexInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Ensures all performance indexes exist, creating them if missing.
    /// Safe to call on existing databases - uses IF NOT EXISTS.
    /// </summary>
    public async Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Checking for missing performance indexes...");

        var indexDefinitions = new[]
        {
            // Notes performance indexes
            new IndexDefinition("notes", "ix_notes_user_updated", "CREATE INDEX IF NOT EXISTS ix_notes_user_updated ON notes(user_id, updated_at DESC)"),
            new IndexDefinition("notes", "ix_notes_user_folder", "CREATE INDEX IF NOT EXISTS ix_notes_user_folder ON notes(user_id, folder) WHERE folder IS NOT NULL"),
            new IndexDefinition("notes", "ix_notes_user_archived", "CREATE INDEX IF NOT EXISTS ix_notes_user_archived ON notes(user_id, is_archived)"),

            // Conversations performance index
            new IndexDefinition("chat_conversations", "ix_conversations_user_updated", "CREATE INDEX IF NOT EXISTS ix_conversations_user_updated ON chat_conversations(user_id, updated_at DESC)"),

            // Embeddings performance index
            new IndexDefinition("note_embeddings", "ix_embeddings_user_note", "CREATE INDEX IF NOT EXISTS ix_embeddings_user_note ON note_embeddings(user_id, note_id)"),

            // RAG logs performance index
            new IndexDefinition("rag_query_logs", "ix_rag_logs_user_created", "CREATE INDEX IF NOT EXISTS ix_rag_logs_user_created ON rag_query_logs(user_id, created_at DESC)"),
        };

        var createdCount = 0;
        var skippedCount = 0;

        foreach (var index in indexDefinitions)
        {
            try
            {
                // Check if table exists first
                var tableExists = await TableExistsAsync(index.TableName, cancellationToken);
                if (!tableExists)
                {
                    _logger.LogDebug("Table {TableName} does not exist, skipping index {IndexName}", index.TableName, index.IndexName);
                    skippedCount++;
                    continue;
                }

                // Check if index already exists
                var indexExists = await IndexExistsAsync(index.IndexName, cancellationToken);
                if (indexExists)
                {
                    _logger.LogDebug("Index {IndexName} already exists", index.IndexName);
                    skippedCount++;
                    continue;
                }

                // Create the index
                await _context.Database.ExecuteSqlRawAsync(index.CreateSql, cancellationToken);
                _logger.LogInformation("Created index {IndexName} on {TableName}", index.IndexName, index.TableName);
                createdCount++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create index {IndexName}: {Message}", index.IndexName, ex.Message);
            }
        }

        _logger.LogInformation("Index check complete. Created: {Created}, Skipped: {Skipped}", createdCount, skippedCount);
    }

    private async Task<bool> TableExistsAsync(string tableName, CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        var needsClose = connection.State != System.Data.ConnectionState.Open;

        if (needsClose)
        {
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = @tableName
                )";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@tableName";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is true;
        }
        finally
        {
            if (needsClose && connection.State == System.Data.ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    private async Task<bool> IndexExistsAsync(string indexName, CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        var needsClose = connection.State != System.Data.ConnectionState.Open;

        if (needsClose)
        {
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT EXISTS (
                    SELECT FROM pg_indexes 
                    WHERE schemaname = 'public' 
                    AND indexname = @indexName
                )";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@indexName";
            parameter.Value = indexName;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is true;
        }
        finally
        {
            if (needsClose && connection.State == System.Data.ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    private record IndexDefinition(string TableName, string IndexName, string CreateSql);
}
