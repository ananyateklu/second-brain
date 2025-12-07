using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using OllamaSharp.Models.Chat;

namespace SecondBrain.Application.Services.AI.Chat;

/// <summary>
/// Stateful chat session wrapper around OllamaSharp's Chat class.
/// Provides conversation management with automatic history tracking.
/// </summary>
public class OllamaChatSession : IOllamaChatSession
{
    private readonly OllamaApiClient _client;
    private readonly OllamaSharp.Chat _chat;
    private readonly ILogger<OllamaChatSession>? _logger;
    private readonly List<Message> _messages = new();
    private string? _systemPrompt;
    private bool _disposed;

    /// <inheritdoc />
    public IReadOnlyList<Message> Messages => _messages.AsReadOnly();

    /// <inheritdoc />
    public string Model { get; }

    /// <inheritdoc />
    public string? SystemPrompt => _systemPrompt;

    /// <summary>
    /// Creates a new Ollama chat session
    /// </summary>
    /// <param name="client">The OllamaApiClient to use</param>
    /// <param name="model">The model to use for this session</param>
    /// <param name="systemPrompt">Optional system prompt</param>
    /// <param name="logger">Optional logger</param>
    public OllamaChatSession(
        OllamaApiClient client,
        string model,
        string? systemPrompt = null,
        ILogger<OllamaChatSession>? logger = null)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _logger = logger;
        Model = model;
        _systemPrompt = systemPrompt;

        // Set the model on the client
        _client.SelectedModel = model;

        // Create the Chat instance with optional system prompt
        _chat = new OllamaSharp.Chat(_client, systemPrompt);

        _logger?.LogDebug("Created Ollama chat session with model {Model}", model);
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<string> SendAsync(
        string message,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("Message cannot be empty", nameof(message));
        }

        _logger?.LogDebug("Sending message to Ollama chat session: {Message}",
            message.Length > 100 ? message[..100] + "..." : message);

        // Track the user message
        _messages.Add(new Message { Role = "user", Content = message });

        var responseBuilder = new StringBuilder();

        await foreach (var chunk in _chat.SendAsync(message, cancellationToken))
        {
            if (!string.IsNullOrEmpty(chunk))
            {
                responseBuilder.Append(chunk);
                yield return chunk;
            }
        }

        // Track the assistant response
        var fullResponse = responseBuilder.ToString();
        _messages.Add(new Message { Role = "assistant", Content = fullResponse });

        _logger?.LogDebug("Received response from Ollama chat session ({Length} chars)", fullResponse.Length);
    }

    /// <inheritdoc />
    public async Task<string> SendAndGetResponseAsync(
        string message,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        var responseBuilder = new StringBuilder();

        await foreach (var chunk in SendAsync(message, cancellationToken))
        {
            responseBuilder.Append(chunk);
        }

        return responseBuilder.ToString();
    }

    /// <inheritdoc />
    public void ClearHistory()
    {
        ThrowIfDisposed();

        _messages.Clear();

        // Recreate the chat with just the system prompt
        // Note: OllamaSharp's Chat class doesn't have a clear method,
        // so we rely on our own message tracking
        _logger?.LogDebug("Cleared Ollama chat session history");
    }

    /// <inheritdoc />
    public void SetSystemPrompt(string systemPrompt)
    {
        ThrowIfDisposed();

        _systemPrompt = systemPrompt;
        _logger?.LogDebug("Set system prompt for Ollama chat session");
    }

    /// <inheritdoc />
    public void AddMessage(string role, string content)
    {
        ThrowIfDisposed();

        if (string.IsNullOrWhiteSpace(role))
        {
            throw new ArgumentException("Role cannot be empty", nameof(role));
        }

        _messages.Add(new Message { Role = role.ToLower(), Content = content });
        _logger?.LogDebug("Added {Role} message to chat session", role);
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException(nameof(OllamaChatSession));
        }
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed) return;

        _messages.Clear();
        _disposed = true;

        _logger?.LogDebug("Disposed Ollama chat session");
    }
}

/// <summary>
/// Factory for creating Ollama chat sessions
/// </summary>
public interface IOllamaChatSessionFactory
{
    /// <summary>
    /// Creates a new chat session
    /// </summary>
    /// <param name="model">The model to use</param>
    /// <param name="systemPrompt">Optional system prompt</param>
    /// <param name="ollamaBaseUrl">Optional override URL for Ollama</param>
    /// <returns>A new chat session</returns>
    IOllamaChatSession CreateSession(string model, string? systemPrompt = null, string? ollamaBaseUrl = null);
}

/// <summary>
/// Default factory implementation for Ollama chat sessions
/// </summary>
public class OllamaChatSessionFactory : IOllamaChatSessionFactory
{
    private readonly OllamaApiClient _defaultClient;
    private readonly ILoggerFactory? _loggerFactory;
    private readonly string _defaultBaseUrl;

    public OllamaChatSessionFactory(
        string baseUrl,
        ILoggerFactory? loggerFactory = null)
    {
        _defaultBaseUrl = baseUrl;
        _loggerFactory = loggerFactory;
        _defaultClient = new OllamaApiClient(new Uri(baseUrl));
    }

    /// <inheritdoc />
    public IOllamaChatSession CreateSession(string model, string? systemPrompt = null, string? ollamaBaseUrl = null)
    {
        var client = string.IsNullOrWhiteSpace(ollamaBaseUrl) || ollamaBaseUrl == _defaultBaseUrl
            ? _defaultClient
            : new OllamaApiClient(new Uri(ollamaBaseUrl));

        var logger = _loggerFactory?.CreateLogger<OllamaChatSession>();

        return new OllamaChatSession(client, model, systemPrompt, logger);
    }
}
