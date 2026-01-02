using System.Net.WebSockets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs.Voice;
using SecondBrain.Application.Services.Voice;
using SecondBrain.Application.Services.Voice.GrokRealtime;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for voice agent WebSocket endpoints.
/// Handles session management and delegates WebSocket communication to IVoiceOrchestrator.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VoiceController : ControllerBase
{
    private readonly IVoiceSessionManager _sessionManager;
    private readonly IVoiceSessionRepository _sessionRepository;
    private readonly IVoiceSynthesisServiceFactory _synthesisFactory;
    private readonly IVoiceTranscriptionServiceFactory _transcriptionFactory;
    private readonly IServiceProvider _serviceProvider;
    private readonly VoiceSettings _voiceSettings;
    private readonly AIProvidersSettings _aiSettings;
    private readonly ILogger<VoiceController> _logger;

    public VoiceController(
        IVoiceSessionManager sessionManager,
        IVoiceSessionRepository sessionRepository,
        IVoiceSynthesisServiceFactory synthesisFactory,
        IVoiceTranscriptionServiceFactory transcriptionFactory,
        IServiceProvider serviceProvider,
        IOptions<VoiceSettings> voiceSettings,
        IOptions<AIProvidersSettings> aiSettings,
        ILogger<VoiceController> logger)
    {
        _sessionManager = sessionManager;
        _sessionRepository = sessionRepository;
        _synthesisFactory = synthesisFactory;
        _transcriptionFactory = transcriptionFactory;
        _serviceProvider = serviceProvider;
        _voiceSettings = voiceSettings.Value;
        _aiSettings = aiSettings.Value;
        _logger = logger;
    }

    /// <summary>
    /// Create a new voice session
    /// </summary>
    [HttpPost("sessions")]
    [ProducesResponseType(typeof(CreateVoiceSessionResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CreateSession(
        [FromBody] VoiceSessionOptions options,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (!_voiceSettings.Features.EnableVoiceAgent)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Voice agent feature is disabled" });
        }

        try
        {
            var session = await _sessionManager.CreateSessionAsync(userId, options, cancellationToken);

            var host = Request.Host.Value;
            var scheme = Request.Scheme == "https" ? "wss" : "ws";
            var webSocketUrl = $"{scheme}://{host}/api/voice/session?sessionId={session.Id}";

            return Ok(new CreateVoiceSessionResult
            {
                SessionId = session.Id,
                WebSocketUrl = webSocketUrl,
                State = session.State,
                CreatedAt = session.StartedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get session details
    /// </summary>
    [HttpGet("sessions/{sessionId}")]
    [ProducesResponseType(typeof(VoiceSession), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSession(string sessionId)
    {
        var userId = GetUserId();
        var session = await _sessionManager.GetSessionForUserAsync(sessionId, userId);

        if (session == null)
        {
            return NotFound(new { error = "Session not found" });
        }

        return Ok(session);
    }

    /// <summary>
    /// End a voice session
    /// </summary>
    [HttpDelete("sessions/{sessionId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EndSession(string sessionId)
    {
        var userId = GetUserId();
        var session = await _sessionManager.GetSessionForUserAsync(sessionId, userId);

        if (session == null)
        {
            return NotFound(new { error = "Session not found" });
        }

        await _sessionManager.EndSessionAsync(sessionId);
        return NoContent();
    }

    /// <summary>
    /// Get available TTS voices for a specific provider or the default
    /// </summary>
    [HttpGet("voices")]
    [ProducesResponseType(typeof(IReadOnlyList<VoiceInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetVoices(
        [FromQuery] string? provider,
        CancellationToken cancellationToken)
    {
        try
        {
            var synthesisService = string.IsNullOrEmpty(provider)
                ? _synthesisFactory.GetDefaultProvider()
                : _synthesisFactory.GetProvider(provider);

            var voices = await synthesisService.GetAvailableVoicesAsync(cancellationToken);
            return Ok(voices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available voices");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to get voices" });
        }
    }

    /// <summary>
    /// Get available Grok Voice voices (xAI Realtime API)
    /// </summary>
    [HttpGet("voices/grok")]
    [ProducesResponseType(typeof(IReadOnlyList<GrokVoiceInfo>), StatusCodes.Status200OK)]
    public IActionResult GetGrokVoices()
    {
        if (!_voiceSettings.GrokVoice.Enabled)
        {
            return Ok(new List<GrokVoiceInfo>());
        }

        // Return configured Grok voices
        var voices = _voiceSettings.GrokVoice.AvailableVoices;
        return Ok(voices);
    }

    /// <summary>
    /// Check voice service status for all providers
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(VoiceServiceStatus), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        // Check all TTS providers
        var ttsProviders = new Dictionary<string, ProviderHealth>();
        foreach (var provider in _synthesisFactory.GetAllProviders())
        {
            var (isHealthy, error) = await provider.CheckHealthAsync(cancellationToken);
            ttsProviders[provider.ProviderName] = new ProviderHealth
            {
                Available = isHealthy,
                Enabled = provider.IsAvailable,
                Error = error
            };
        }

        // Check all STT providers
        var sttProviders = new Dictionary<string, ProviderHealth>();
        foreach (var provider in _transcriptionFactory.GetAllProviders())
        {
            var (isHealthy, error) = await provider.CheckHealthAsync(cancellationToken);
            sttProviders[provider.ProviderName] = new ProviderHealth
            {
                Available = isHealthy,
                Enabled = provider.IsAvailable,
                Error = error
            };
        }

        // Check Grok Voice availability
        var grokVoiceAvailable = false;
        string? grokVoiceError = null;

        if (!_voiceSettings.GrokVoice.Enabled)
        {
            grokVoiceError = "Grok Voice is disabled in configuration";
        }
        else if (string.IsNullOrEmpty(_aiSettings.XAI?.ApiKey))
        {
            grokVoiceError = "xAI API key is not configured";
        }
        else
        {
            grokVoiceAvailable = true;
        }

        var status = new VoiceServiceStatus
        {
            VoiceAgentEnabled = _voiceSettings.Features.EnableVoiceAgent,
            DefaultTTSProvider = _voiceSettings.DefaultTTSProvider,
            DefaultSTTProvider = _voiceSettings.DefaultSTTProvider,
            TTSProviders = ttsProviders,
            STTProviders = sttProviders,
            // Backward compatibility
            DeepgramAvailable = sttProviders.TryGetValue("Deepgram", out var dg) && dg.Available,
            ElevenLabsAvailable = ttsProviders.TryGetValue("ElevenLabs", out var el) && el.Available,
            DeepgramError = sttProviders.TryGetValue("Deepgram", out var dgErr) ? dgErr.Error : null,
            ElevenLabsError = ttsProviders.TryGetValue("ElevenLabs", out var elErr) ? elErr.Error : null,
            // Grok Voice
            GrokVoiceAvailable = grokVoiceAvailable,
            GrokVoiceError = grokVoiceError
        };

        return Ok(status);
    }

    // ============================================
    // Session History Endpoints
    // ============================================

    /// <summary>
    /// Get paginated voice session history for the current user.
    /// Returns sessions without turns for list display.
    /// </summary>
    [HttpGet("sessions")]
    [ProducesResponseType(typeof(VoiceSessionHistoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();

        // Validate pagination
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (sessions, totalCount) = await _sessionRepository.GetSessionsPagedAsync(
            userId, page, pageSize, status, cancellationToken);

        // Map to DTOs with first user message for preview
        var summaries = new List<VoiceSessionSummary>();
        foreach (var session in sessions)
        {
            var firstMessage = await _sessionRepository.GetFirstUserMessageAsync(session.Id, cancellationToken);
            summaries.Add(new VoiceSessionSummary(
                session.Id,
                session.Provider,
                session.Model,
                session.StartedAt,
                session.EndedAt,
                session.Status,
                session.Turns.Count,
                session.TotalAudioDurationMs,
                session.TotalInputTokens,
                session.TotalOutputTokens,
                firstMessage?.Length > 100 ? firstMessage[..100] + "..." : firstMessage
            ));
        }

        var response = new VoiceSessionHistoryResponse(
            summaries,
            totalCount,
            page,
            pageSize
        );

        return Ok(response);
    }

    /// <summary>
    /// Get a specific session with full transcript.
    /// Returns all turns ordered by timestamp.
    /// </summary>
    [HttpGet("sessions/{sessionId:guid}/transcript")]
    [ProducesResponseType(typeof(VoiceSessionDetail), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSessionTranscript(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();

        var session = await _sessionRepository.GetSessionWithTurnsAsync(sessionId, userId, cancellationToken);

        if (session == null)
        {
            return NotFound(new { error = "Session not found" });
        }

        var turns = session.Turns.Select(t => new VoiceTurnDto(
            t.Id,
            t.Role,
            t.Content,
            t.TranscriptText,
            t.Timestamp,
            t.InputTokens,
            t.OutputTokens,
            t.AudioDurationMs,
            t.ToolCallsJson
        )).ToList();

        var response = new VoiceSessionDetail(
            session.Id,
            session.UserId,
            session.Provider,
            session.Model,
            session.StartedAt,
            session.EndedAt,
            session.Status,
            session.TotalInputTokens,
            session.TotalOutputTokens,
            session.TotalAudioDurationMs,
            session.OptionsJson,
            turns
        );

        return Ok(response);
    }

    /// <summary>
    /// Delete a voice session and its transcript.
    /// </summary>
    [HttpDelete("sessions/{sessionId:guid}/history")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSessionHistory(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();

        var deleted = await _sessionRepository.DeleteAsync(sessionId, userId, cancellationToken);

        if (!deleted)
        {
            return NotFound(new { error = "Session not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// WebSocket endpoint for voice streaming
    /// </summary>
    [HttpGet("session")]
    public async Task HandleVoiceSession(
        [FromQuery] string sessionId,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "[VoiceWS] Voice session endpoint hit - SessionId: {SessionId}, IsWebSocket: {IsWebSocket}",
            sessionId,
            HttpContext.WebSockets.IsWebSocketRequest);

        if (!HttpContext.WebSockets.IsWebSocketRequest)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsync("WebSocket connection required");
            return;
        }

        var userId = GetUserId();
        var session = await _sessionManager.GetSessionForUserAsync(sessionId, userId);

        if (session == null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await HttpContext.Response.WriteAsync("Session not found");
            return;
        }

        if (!session.IsActive)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsync("Session is not active");
            return;
        }

        using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

        _logger.LogInformation(
            "[VoiceWS] WebSocket connected for voice session {SessionId}",
            sessionId);

        // Create a new scope for the scoped orchestrator services
        await using var scope = _serviceProvider.CreateAsyncScope();
        var orchestrator = scope.ServiceProvider.GetRequiredService<IVoiceOrchestrator>();

        try
        {
            await orchestrator.RunAsync(webSocket, session, cancellationToken);
        }
        catch (WebSocketException ex) when (ex.WebSocketErrorCode == WebSocketError.ConnectionClosedPrematurely)
        {
            _logger.LogInformation("[VoiceWS] Voice WebSocket closed prematurely for session {SessionId}", sessionId);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("[VoiceWS] Voice WebSocket cancelled for session {SessionId}", sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[VoiceWS] Error in voice WebSocket for session {SessionId}", sessionId);
        }
        finally
        {
            await _sessionManager.EndSessionAsync(sessionId);
            _logger.LogInformation("[VoiceWS] Voice WebSocket disconnected for session {SessionId}", sessionId);
        }
    }

    private string GetUserId()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? HttpContext.Items["UserId"]?.ToString()
            ?? throw new UnauthorizedAccessException("User ID not found in claims");
    }
}
