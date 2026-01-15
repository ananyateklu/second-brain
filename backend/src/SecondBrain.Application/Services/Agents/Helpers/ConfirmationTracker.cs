using System.Collections.Concurrent;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Tracks pending tool confirmations and manages the async wait/response pattern.
/// Used to pause tool execution until user confirms destructive operations.
/// </summary>
public interface IConfirmationTracker
{
    /// <summary>
    /// Creates a new confirmation request and returns its unique ID.
    /// </summary>
    string CreateConfirmation(
        string conversationId,
        string toolName,
        string toolId,
        ToolConfirmationDetails details);

    /// <summary>
    /// Waits for user response to a confirmation request.
    /// Returns null if timeout occurs or confirmation is cancelled.
    /// </summary>
    Task<ConfirmationResult?> WaitForConfirmationAsync(
        string confirmationId,
        TimeSpan timeout,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Responds to a pending confirmation request.
    /// </summary>
    void RespondToConfirmation(string confirmationId, bool confirmed);

    /// <summary>
    /// Cleans up expired confirmations (called periodically).
    /// </summary>
    void CleanupExpired();
}

/// <summary>
/// Result of a confirmation response
/// </summary>
public class ConfirmationResult
{
    public bool Confirmed { get; init; }
    public DateTime RespondedAt { get; init; }
}

/// <summary>
/// Represents a pending confirmation awaiting user response
/// </summary>
public class PendingConfirmation
{
    public required string Id { get; init; }
    public required string ConversationId { get; init; }
    public required string ToolName { get; init; }
    public required string ToolId { get; init; }
    public required ToolConfirmationDetails Details { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public required TaskCompletionSource<ConfirmationResult> CompletionSource { get; init; }
}

/// <summary>
/// Implementation of IConfirmationTracker using ConcurrentDictionary and TaskCompletionSource
/// </summary>
public class ConfirmationTracker : IConfirmationTracker
{
    private readonly ConcurrentDictionary<string, PendingConfirmation> _pending = new();
    private readonly TimeSpan _expirationTime = TimeSpan.FromMinutes(5);

    public string CreateConfirmation(
        string conversationId,
        string toolName,
        string toolId,
        ToolConfirmationDetails details)
    {
        var id = $"conf_{Guid.NewGuid():N}";
        var pending = new PendingConfirmation
        {
            Id = id,
            ConversationId = conversationId,
            ToolName = toolName,
            ToolId = toolId,
            Details = details,
            CreatedAt = DateTime.UtcNow,
            CompletionSource = new TaskCompletionSource<ConfirmationResult>(
                TaskCreationOptions.RunContinuationsAsynchronously)
        };

        _pending[id] = pending;
        return id;
    }

    public async Task<ConfirmationResult?> WaitForConfirmationAsync(
        string confirmationId,
        TimeSpan timeout,
        CancellationToken cancellationToken = default)
    {
        if (!_pending.TryGetValue(confirmationId, out var pending))
        {
            return null;
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(timeout);

        try
        {
            return await pending.CompletionSource.Task.WaitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            // Timeout or external cancellation - clean up and return null
            _pending.TryRemove(confirmationId, out _);
            return null;
        }
    }

    public void RespondToConfirmation(string confirmationId, bool confirmed)
    {
        if (_pending.TryRemove(confirmationId, out var pending))
        {
            pending.CompletionSource.TrySetResult(new ConfirmationResult
            {
                Confirmed = confirmed,
                RespondedAt = DateTime.UtcNow
            });
        }
    }

    public void CleanupExpired()
    {
        var cutoff = DateTime.UtcNow - _expirationTime;
        var expiredIds = _pending
            .Where(kvp => kvp.Value.CreatedAt < cutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var id in expiredIds)
        {
            if (_pending.TryRemove(id, out var pending))
            {
                // Cancel the waiting task
                pending.CompletionSource.TrySetCanceled();
            }
        }
    }
}
