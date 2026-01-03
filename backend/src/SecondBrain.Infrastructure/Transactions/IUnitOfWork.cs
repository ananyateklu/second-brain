using Microsoft.EntityFrameworkCore.Storage;

namespace SecondBrain.Infrastructure.Transactions;

/// <summary>
/// Provides explicit transaction management for multi-repository operations.
/// Use when operations across multiple repositories must be atomic.
/// </summary>
/// <remarks>
/// For single-repository operations, implicit transactions via SaveChangesAsync are sufficient.
/// Use IUnitOfWork when:
/// - Updating multiple aggregates that must succeed or fail together
/// - Performing operations that span multiple repositories
/// - Needing explicit control over transaction boundaries
/// </remarks>
public interface IUnitOfWork : IAsyncDisposable
{
    /// <summary>
    /// Begins a new database transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The transaction scope</returns>
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Commits the current transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task CommitAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Rolls back the current transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RollbackAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves all changes made in this context to the database.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The number of state entries written to the database</returns>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets whether a transaction is currently active.
    /// </summary>
    bool HasActiveTransaction { get; }
}
