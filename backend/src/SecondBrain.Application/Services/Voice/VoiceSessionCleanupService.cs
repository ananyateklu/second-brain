using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Background service that periodically cleans up expired voice sessions to prevent memory leaks.
/// Sessions are marked as ended after being idle beyond the configured timeout.
/// Very old ended sessions are removed from memory entirely.
/// </summary>
public class VoiceSessionCleanupService : BackgroundService
{
    private readonly IVoiceSessionManager _sessionManager;
    private readonly ILogger<VoiceSessionCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval;
    private readonly int _idleTimeoutMinutes;

    public VoiceSessionCleanupService(
        IVoiceSessionManager sessionManager,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<VoiceSessionCleanupService> logger)
    {
        _sessionManager = sessionManager;
        _logger = logger;

        // Use configured values or defaults
        var features = voiceSettings.Value.Features;
        _cleanupInterval = TimeSpan.FromMinutes(features.CleanupIntervalMinutes > 0 ? features.CleanupIntervalMinutes : 5);
        _idleTimeoutMinutes = features.SessionIdleTimeoutMinutes > 0 ? features.SessionIdleTimeoutMinutes : 30;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Voice session cleanup service started. Cleanup interval: {Interval}, Idle timeout: {Timeout} minutes",
            _cleanupInterval, _idleTimeoutMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_cleanupInterval, stoppingToken);

                var cleaned = await _sessionManager.CleanupExpiredSessionsAsync(_idleTimeoutMinutes, stoppingToken);

                if (cleaned > 0)
                {
                    _logger.LogInformation("Cleaned up {Count} expired voice sessions", cleaned);
                }
                else
                {
                    _logger.LogDebug("Voice session cleanup completed, no expired sessions found");
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Expected when stopping
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during voice session cleanup");
                // Continue running despite errors
            }
        }

        _logger.LogInformation("Voice session cleanup service stopped");
    }
}
