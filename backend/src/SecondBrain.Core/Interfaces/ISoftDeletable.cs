namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Interface for entities that support soft deletion.
/// Implementing entities will be filtered by default using EF Core global query filters.
/// </summary>
public interface ISoftDeletable
{
    /// <summary>
    /// Indicates whether the entity has been soft-deleted.
    /// </summary>
    bool IsDeleted { get; set; }

    /// <summary>
    /// The timestamp when the entity was soft-deleted.
    /// </summary>
    DateTime? DeletedAt { get; set; }

    /// <summary>
    /// The user ID who performed the soft delete.
    /// </summary>
    string? DeletedBy { get; set; }
}
