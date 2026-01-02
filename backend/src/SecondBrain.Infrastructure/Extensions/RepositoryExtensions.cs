using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Infrastructure.Extensions;

/// <summary>
/// Extension methods for repository operations using EF Core bulk operations.
/// These methods use ExecuteUpdateAsync/ExecuteDeleteAsync for 10-30x performance improvement
/// over traditional load-then-update patterns.
/// </summary>
public static class RepositoryExtensions
{
    /// <summary>
    /// Performs a bulk soft delete on entities matching the predicate.
    /// Uses ExecuteUpdateAsync to update directly in the database without loading entities.
    /// </summary>
    /// <typeparam name="T">Entity type implementing ISoftDeletable</typeparam>
    /// <param name="dbSet">The DbSet to operate on</param>
    /// <param name="predicate">Filter expression for entities to soft delete</param>
    /// <param name="deletedBy">User ID performing the soft delete</param>
    /// <returns>Number of entities updated</returns>
    public static async Task<int> BatchSoftDeleteAsync<T>(
        this DbSet<T> dbSet,
        Expression<Func<T, bool>> predicate,
        string deletedBy)
        where T : class, ISoftDeletable
    {
        var now = DateTime.UtcNow;
        return await dbSet
            .Where(predicate)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(e => e.IsDeleted, true)
                .SetProperty(e => e.DeletedAt, now)
                .SetProperty(e => e.DeletedBy, deletedBy));
    }

    /// <summary>
    /// Performs a bulk restore on soft-deleted entities matching the predicate.
    /// Uses ExecuteUpdateAsync to update directly in the database without loading entities.
    /// Automatically ignores query filters to find soft-deleted entities.
    /// </summary>
    /// <typeparam name="T">Entity type implementing ISoftDeletable</typeparam>
    /// <param name="dbSet">The DbSet to operate on</param>
    /// <param name="predicate">Filter expression for entities to restore</param>
    /// <returns>Number of entities updated</returns>
    public static async Task<int> BatchRestoreAsync<T>(
        this DbSet<T> dbSet,
        Expression<Func<T, bool>> predicate)
        where T : class, ISoftDeletable
    {
        return await dbSet
            .IgnoreQueryFilters()
            .Where(predicate)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(e => e.IsDeleted, false)
                .SetProperty(e => e.DeletedAt, (DateTime?)null)
                .SetProperty(e => e.DeletedBy, (string?)null));
    }

    /// <summary>
    /// Performs a bulk hard delete on entities matching the predicate.
    /// Uses ExecuteDeleteAsync to delete directly in the database without loading entities.
    /// </summary>
    /// <typeparam name="T">Entity type</typeparam>
    /// <param name="dbSet">The DbSet to operate on</param>
    /// <param name="predicate">Filter expression for entities to delete</param>
    /// <returns>Number of entities deleted</returns>
    public static async Task<int> BatchHardDeleteAsync<T>(
        this DbSet<T> dbSet,
        Expression<Func<T, bool>> predicate)
        where T : class
    {
        return await dbSet
            .Where(predicate)
            .ExecuteDeleteAsync();
    }
}
