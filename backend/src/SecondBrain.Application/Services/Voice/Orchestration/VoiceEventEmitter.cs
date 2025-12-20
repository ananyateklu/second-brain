using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice.Orchestration;

/// <summary>
/// Handles emitting voice events to WebSocket clients
/// </summary>
public class VoiceEventEmitter : IVoiceEventEmitter
{
    private readonly ILogger<VoiceEventEmitter> _logger;
    private WebSocket? _webSocket;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public VoiceEventEmitter(ILogger<VoiceEventEmitter> logger)
    {
        _logger = logger;
    }

    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    public void Initialize(WebSocket webSocket)
    {
        _webSocket = webSocket;
    }

    public async Task SendStateAsync(VoiceSessionState state, string? reason = null, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new StateMessage
        {
            State = state,
            Reason = reason
        }, cancellationToken);
    }

    public async Task SendSessionStartedAsync(VoiceSession session, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.SessionStarted,
            Data = new Dictionary<string, object>
            {
                ["sessionId"] = session.Id,
                ["provider"] = session.Provider,
                ["model"] = session.Model,
                ["voiceId"] = session.VoiceId
            }
        }, cancellationToken);
    }

    public async Task SendTranscriptAsync(TranscriptionResult result, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new TranscriptMessage
        {
            Text = result.Text,
            IsFinal = result.IsFinal,
            Confidence = result.Confidence,
            Start = result.Start,
            End = result.End
        }, cancellationToken);
    }

    public async Task SendAudioAsync(byte[] audioData, string format, int sampleRate, int sequence, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new AudioMessage
        {
            Data = Convert.ToBase64String(audioData),
            Format = format,
            SampleRate = sampleRate,
            Sequence = sequence
        }, cancellationToken);
    }

    public async Task SendAiResponseStartAsync(CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.AiResponseStart
        }, cancellationToken);
    }

    public async Task SendAiResponseChunkAsync(string token, string fullText, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.AiResponseChunk,
            Data = new Dictionary<string, object>
            {
                ["text"] = token,
                ["fullText"] = fullText
            }
        }, cancellationToken);
    }

    public async Task SendAiResponseEndAsync(string content, int inputTokens, int outputTokens, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.AiResponseEnd,
            Data = new Dictionary<string, object>
            {
                ["content"] = content,
                ["responseLength"] = content.Length,
                ["inputTokens"] = inputTokens,
                ["outputTokens"] = outputTokens
            }
        }, cancellationToken);
    }

    public async Task SendAgentStatusAsync(string message, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.AgentStatus,
            Data = new Dictionary<string, object> { ["message"] = message }
        }, cancellationToken);
    }

    public async Task SendThinkingStepAsync(string content, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.ThinkingStep,
            Data = new Dictionary<string, object> { ["content"] = content }
        }, cancellationToken);
    }

    public async Task SendContextRetrievalAsync(AgentStreamEvent evt, CancellationToken cancellationToken = default)
    {
        var notes = evt.RetrievedNotes?.Select(n => new Dictionary<string, object>
        {
            ["noteId"] = n.NoteId,
            ["title"] = n.Title,
            ["preview"] = n.Preview,
            ["tags"] = n.Tags,
            ["relevanceScore"] = n.SimilarityScore
        }).ToList() ?? new List<Dictionary<string, object>>();

        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.ContextRetrieval,
            Data = new Dictionary<string, object>
            {
                ["noteCount"] = evt.RetrievedNotes?.Count ?? 0,
                ["ragLogId"] = evt.RagLogId ?? "",
                ["notes"] = notes
            }
        }, cancellationToken);
    }

    public async Task SendToolCallStartAsync(string? toolId, string? toolName, string? arguments, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.ToolCallStart,
            Data = new Dictionary<string, object>
            {
                ["toolId"] = toolId ?? "",
                ["toolName"] = toolName ?? "",
                ["arguments"] = arguments ?? ""
            }
        }, cancellationToken);
    }

    public async Task SendToolCallEndAsync(string? toolId, string? toolName, string? result, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new MetadataMessage
        {
            Event = MetadataEvents.ToolCallEnd,
            Data = new Dictionary<string, object>
            {
                ["toolId"] = toolId ?? "",
                ["toolName"] = toolName ?? "",
                ["result"] = result ?? "",
                ["success"] = true
            }
        }, cancellationToken);
    }

    public async Task SendGroundingSourcesAsync(AgentStreamEvent evt, CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>();

        if (evt.GroundingSources != null && evt.GroundingSources.Count > 0)
        {
            data["sources"] = evt.GroundingSources.Select(s => new Dictionary<string, object>
            {
                ["title"] = s.Title,
                ["uri"] = s.Uri,
                ["snippet"] = s.Snippet ?? ""
            }).ToList();
        }
        else if (evt.GrokSearchSources != null && evt.GrokSearchSources.Count > 0)
        {
            data["grokSearchSources"] = evt.GrokSearchSources.Select(s => new Dictionary<string, object>
            {
                ["title"] = s.Title,
                ["url"] = s.Url,
                ["snippet"] = s.Snippet ?? ""
            }).ToList();
        }

        if (data.Count > 0)
        {
            await SendMessageAsync(new MetadataMessage
            {
                Event = MetadataEvents.GroundingSources,
                Data = data
            }, cancellationToken);
        }
    }

    public async Task SendErrorAsync(string code, string message, bool recoverable, CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new ErrorMessage
        {
            Code = code,
            Message = message,
            Recoverable = recoverable
        }, cancellationToken);
    }

    public async Task SendPongAsync(CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new PongMessage(), cancellationToken);
    }

    private async Task SendMessageAsync(ServerVoiceMessage message, CancellationToken cancellationToken)
    {
        if (_webSocket == null || _webSocket.State != WebSocketState.Open)
            return;

        try
        {
            var json = JsonSerializer.Serialize(message, message.GetType(), JsonOptions);
            var bytes = Encoding.UTF8.GetBytes(json);

            await _webSocket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                cancellationToken);
        }
        catch (WebSocketException ex)
        {
            _logger.LogWarning(ex, "Failed to send WebSocket message");
        }
        catch (ObjectDisposedException)
        {
            // WebSocket was disposed, ignore
        }
    }
}
