using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs.Voice;
using SecondBrain.Application.Services.Auth;
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
    private readonly IJwtService _jwtService;
    private readonly IUserRepository _userRepository;
    private readonly VoiceSettings _voiceSettings;
    private readonly AIProvidersSettings _aiSettings;
    private readonly ILogger<VoiceController> _logger;

    public VoiceController(
        IVoiceSessionManager sessionManager,
        IVoiceSessionRepository sessionRepository,
        IVoiceSynthesisServiceFactory synthesisFactory,
        IVoiceTranscriptionServiceFactory transcriptionFactory,
        IServiceProvider serviceProvider,
        IJwtService jwtService,
        IUserRepository userRepository,
        IOptions<VoiceSettings> voiceSettings,
        IOptions<AIProvidersSettings> aiSettings,
        ILogger<VoiceController> logger)
    {
        _sessionManager = sessionManager;
        _sessionRepository = sessionRepository;
        _synthesisFactory = synthesisFactory;
        _transcriptionFactory = transcriptionFactory;
        _serviceProvider = serviceProvider;
        _jwtService = jwtService;
        _userRepository = userRepository;
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
        _logger.LogInformation(
            "[VoiceSession] CreateSession called. Provider: {Provider}, Model: {Model}, VoiceProviderType: {VoiceProviderType}, AgentEnabled: {AgentEnabled}",
            options.Provider, options.Model, options.VoiceProviderType, options.AgentEnabled);

        var userId = GetUserId();

        if (!_voiceSettings.Features.EnableVoiceAgent)
        {
            _logger.LogWarning("[VoiceSession] Voice agent feature is disabled");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Voice agent feature is disabled" });
        }

        try
        {
            var session = await _sessionManager.CreateSessionAsync(userId, options, cancellationToken);

            var host = Request.Host.Value;
            var scheme = Request.Scheme == "https" ? "wss" : "ws";
            var webSocketUrl = $"{scheme}://{host}/api/voice/session?sessionId={session.Id}";

            _logger.LogInformation("[VoiceSession] Session created successfully. SessionId: {SessionId}", session.Id);

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
            _logger.LogWarning(ex, "[VoiceSession] CreateSession failed with InvalidOperationException: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[VoiceSession] CreateSession failed with unexpected exception: {Message}", ex.Message);
            throw; // Re-throw to let global exception handler deal with it
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
    /// WebSocket endpoint for voice streaming.
    /// Security: Authentication is handled via first message after connection,
    /// not via URL query parameter, to prevent token exposure in logs/history.
    /// </summary>
    [HttpGet("session")]
    [AllowAnonymous] // Auth handled in-band via first message for security
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
            await HttpContext.Response.WriteAsync("WebSocket connection required", cancellationToken);
            return;
        }

        using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

        // Wait for authentication message (first message must be authenticate)
        var authResult = await WaitForAuthenticationAsync(webSocket, cancellationToken);
        if (!authResult.Success)
        {
            _logger.LogWarning("[VoiceWS] Authentication failed for session {SessionId}: {Error}",
                sessionId, authResult.Error);

            // Send error and close
            var errorMsg = new ErrorMessage
            {
                Code = VoiceErrorCodes.Unauthorized,
                Message = authResult.Error ?? "Authentication failed",
                Recoverable = false
            };
            await SendMessageAsync(webSocket, errorMsg, cancellationToken);
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation,
                "Authentication failed", cancellationToken);
            return;
        }

        _logger.LogInformation("[VoiceWS] WebSocket authenticated for user {UserId}", authResult.UserId);

        // Now verify session ownership
        var session = await _sessionManager.GetSessionForUserAsync(sessionId, authResult.UserId!);
        if (session == null)
        {
            var errorMsg = new ErrorMessage
            {
                Code = VoiceErrorCodes.SessionNotFound,
                Message = "Session not found or access denied",
                Recoverable = false
            };
            await SendMessageAsync(webSocket, errorMsg, cancellationToken);
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation,
                "Session not found", cancellationToken);
            return;
        }

        if (!session.IsActive)
        {
            var errorMsg = new ErrorMessage
            {
                Code = VoiceErrorCodes.SessionExpired,
                Message = "Session is not active",
                Recoverable = false
            };
            await SendMessageAsync(webSocket, errorMsg, cancellationToken);
            await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation,
                "Session not active", cancellationToken);
            return;
        }

        // Send authenticated confirmation
        await SendMessageAsync(webSocket, new AuthenticatedMessage(), cancellationToken);

        _logger.LogInformation("[VoiceWS] WebSocket connected for voice session {SessionId}", sessionId);

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

    /// <summary>
    /// Result of WebSocket authentication attempt
    /// </summary>
    private sealed record AuthenticationResult(bool Success, string? UserId, string? Error);

    /// <summary>
    /// Waits for and validates the authentication message from the client.
    /// Security: This allows token to be sent via WebSocket message instead of URL.
    /// </summary>
    private async Task<AuthenticationResult> WaitForAuthenticationAsync(
        WebSocket webSocket,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10)); // 10 second auth timeout

        try
        {
            var result = await webSocket.ReceiveAsync(buffer, cts.Token);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                return new AuthenticationResult(false, null, "Connection closed before authentication");
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                return new AuthenticationResult(false, null, "First message must be text (authenticate)");
            }

            var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
            var message = JsonSerializer.Deserialize<AuthenticateMessage>(json);

            if (message?.Type != "authenticate" || string.IsNullOrEmpty(message.Payload?.Token))
            {
                return new AuthenticationResult(false, null, "First message must be authenticate with token");
            }

            // Validate JWT token
            var principal = _jwtService.ValidateToken(message.Payload.Token);
            if (principal == null)
            {
                return new AuthenticationResult(false, null, "Invalid or expired token");
            }

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? principal.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return new AuthenticationResult(false, null, "Token missing user ID");
            }

            // Verify user exists and is active
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || !user.IsActive)
            {
                return new AuthenticationResult(false, null, "User not found or inactive");
            }

            return new AuthenticationResult(true, userId, null);
        }
        catch (OperationCanceledException)
        {
            return new AuthenticationResult(false, null, "Authentication timeout");
        }
        catch (JsonException)
        {
            return new AuthenticationResult(false, null, "Invalid authenticate message format");
        }
    }

    /// <summary>
    /// Sends a message to the WebSocket client
    /// </summary>
    private static async Task SendMessageAsync<T>(WebSocket webSocket, T message, CancellationToken ct)
        where T : ServerVoiceMessage
    {
        var json = JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(json);
        await webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }

    private string GetUserId()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? HttpContext.Items["UserId"]?.ToString()
            ?? throw new UnauthorizedAccessException("User ID not found in claims");
    }
}
