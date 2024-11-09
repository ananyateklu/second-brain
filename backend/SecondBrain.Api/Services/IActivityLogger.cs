public interface IActivityLogger
{
    Task LogActivityAsync(
        string userId,
        string actionType,
        string itemType,
        string itemId,
        string itemTitle,
        string description,
        object? metadata = null
    );
} 