namespace SecondBrain.Application.DTOs.Common;

/// <summary>
/// Sort direction for paginated queries.
/// </summary>
public enum SortDirection
{
    /// <summary>
    /// Sort in ascending order (A-Z, oldest first, lowest first)
    /// </summary>
    Ascending,

    /// <summary>
    /// Sort in descending order (Z-A, newest first, highest first)
    /// </summary>
    Descending
}

/// <summary>
/// Common sortable fields across entities.
/// </summary>
public static class SortableFields
{
    // Common fields
    public const string CreatedAt = "createdAt";
    public const string UpdatedAt = "updatedAt";

    // Note-specific fields
    public const string Title = "title";

    // Chat-specific fields
    public const string ConversationTitle = "title";

    /// <summary>
    /// Default sort field for most entities.
    /// </summary>
    public const string Default = UpdatedAt;

    /// <summary>
    /// Validates if a sort field is valid for notes.
    /// </summary>
    public static bool IsValidNoteField(string? field) =>
        string.IsNullOrEmpty(field) ||
        field.Equals(CreatedAt, StringComparison.OrdinalIgnoreCase) ||
        field.Equals(UpdatedAt, StringComparison.OrdinalIgnoreCase) ||
        field.Equals(Title, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Validates if a sort field is valid for conversations.
    /// </summary>
    public static bool IsValidConversationField(string? field) =>
        string.IsNullOrEmpty(field) ||
        field.Equals(CreatedAt, StringComparison.OrdinalIgnoreCase) ||
        field.Equals(UpdatedAt, StringComparison.OrdinalIgnoreCase) ||
        field.Equals(ConversationTitle, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Normalizes a sort field to lowercase.
    /// </summary>
    public static string Normalize(string? field) =>
        string.IsNullOrWhiteSpace(field) ? Default : field.ToLowerInvariant();
}

/// <summary>
/// Represents a paginated result set with metadata for cursor-based or offset-based pagination.
/// </summary>
/// <typeparam name="T">The type of items in the result set</typeparam>
public class PaginatedResult<T>
{
    /// <summary>
    /// The items in the current page
    /// </summary>
    public IReadOnlyList<T> Items { get; init; } = [];

    /// <summary>
    /// Total number of items across all pages (optional - may be null for performance)
    /// </summary>
    public int? TotalCount { get; init; }

    /// <summary>
    /// Current page number (1-based)
    /// </summary>
    public int Page { get; init; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; init; }

    /// <summary>
    /// Whether there are more items after this page
    /// </summary>
    public bool HasNextPage { get; init; }

    /// <summary>
    /// Whether there are items before this page
    /// </summary>
    public bool HasPreviousPage => Page > 1;

    /// <summary>
    /// Total number of pages (calculated if TotalCount is available)
    /// </summary>
    public int? TotalPages => TotalCount.HasValue && PageSize > 0
        ? (int)Math.Ceiling((double)TotalCount.Value / PageSize)
        : null;

    /// <summary>
    /// Cursor for the next page (for cursor-based pagination)
    /// </summary>
    public string? NextCursor { get; init; }

    /// <summary>
    /// Field used to sort the results
    /// </summary>
    public string? SortBy { get; init; }

    /// <summary>
    /// Sort direction used for the results
    /// </summary>
    public SortDirection SortDirection { get; init; } = SortDirection.Descending;

    /// <summary>
    /// Creates a paginated result from a list of items
    /// </summary>
    public static PaginatedResult<T> Create(
        IEnumerable<T> items,
        int page,
        int pageSize,
        int? totalCount = null,
        string? sortBy = null,
        SortDirection sortDirection = SortDirection.Descending)
    {
        var itemsList = items.ToList();
        return new PaginatedResult<T>
        {
            Items = itemsList,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            HasNextPage = totalCount.HasValue
                ? page * pageSize < totalCount.Value
                : itemsList.Count == pageSize,
            SortBy = sortBy,
            SortDirection = sortDirection
        };
    }
}

/// <summary>
/// Common pagination parameters for API requests
/// </summary>
public record PaginationRequest
{
    /// <summary>
    /// Page number (1-based, default: 1)
    /// </summary>
    public int Page { get; init; } = 1;

    /// <summary>
    /// Number of items per page (default: 20, max: 100)
    /// </summary>
    public int PageSize { get; init; } = 20;

    /// <summary>
    /// Optional cursor for cursor-based pagination
    /// </summary>
    public string? Cursor { get; init; }

    /// <summary>
    /// Field to sort by (default: updatedAt)
    /// </summary>
    public string? SortBy { get; init; }

    /// <summary>
    /// Sort direction (default: Descending for dates, Ascending for text)
    /// </summary>
    public SortDirection SortDirection { get; init; } = SortDirection.Descending;

    /// <summary>
    /// Validates and normalizes the pagination parameters
    /// </summary>
    public PaginationRequest Normalize()
    {
        return this with
        {
            Page = Math.Max(1, Page),
            PageSize = Math.Clamp(PageSize, 1, 100),
            SortBy = SortableFields.Normalize(SortBy)
        };
    }

    /// <summary>
    /// Calculates the number of items to skip for offset-based pagination
    /// </summary>
    public int Skip => (Page - 1) * PageSize;

    /// <summary>
    /// Gets the effective sort field (normalized and defaulted)
    /// </summary>
    public string EffectiveSortBy => SortableFields.Normalize(SortBy);
}
