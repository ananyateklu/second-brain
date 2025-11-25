# Agents Mode Implementation Guide

## Overview

This document outlines the implementation plan for adding an "Agents Mode" feature to the Second Brain chat UI. When enabled, this mode allows the AI to perform multi-step reasoning and execute tools/actions beyond simple chat responses.

---

## Current Architecture

### Existing Providers
- **OpenAI** - GPT models
- **Claude** - Anthropic models
- **Gemini** - Google models
- **Grok** - xAI models
- **Ollama** - Local models

### Existing Features
- Chat with streaming responses
- RAG (Retrieval-Augmented Generation)
- Notes management (CRUD operations)
- Multi-provider support
- Conversation history

---

## Recommended Framework: Microsoft Semantic Kernel

### Why Semantic Kernel?

Based on 2025 best practices, **Semantic Kernel** is the recommended framework for building production AI agents in C#:

1. **Enterprise-Ready**: Production-grade with Microsoft support
2. **Multi-Model Support**: Works with OpenAI, Azure OpenAI, Gemini, and custom providers
3. **Plugin Architecture**: Easy to add tools/functions the agent can call
4. **Memory & Planning**: Built-in capabilities for context management
5. **Streaming Support**: Native streaming with tool call handling

### Installation

```bash
dotnet add package Microsoft.SemanticKernel
dotnet add package Microsoft.SemanticKernel.Plugins.Core
```

---

## Architecture Design

### Backend Structure

```
backend/src/SecondBrain.Application/
├── Services/
│   └── Agents/
│       ├── IAgentService.cs                 # Main agent interface
│       ├── AgentService.cs                  # Semantic Kernel orchestration
│       ├── AgentOrchestrator.cs             # Multi-step task coordination
│       ├── Plugins/
│       │   ├── NotesPlugin.cs               # Note operations (create, search, update)
│       │   ├── TasksPlugin.cs               # Future: task management
│       │   └── WebSearchPlugin.cs           # Future: web search capability
│       └── Models/
│           ├── AgentRequest.cs              # Agent-specific request model
│           ├── AgentResponse.cs             # Response with tool calls
│           └── ToolExecutionResult.cs       # Tool execution tracking

backend/src/SecondBrain.API/
├── Controllers/
│   └── AgentController.cs                   # Agent-specific endpoints
```

### Frontend Structure

```
frontend/src/
├── components/ui/
│   └── AgentModeToggle.tsx                  # Toggle component
├── features/agents/
│   ├── hooks/
│   │   └── use-agent-stream.ts              # Agent streaming with tool events
│   ├── components/
│   │   ├── ToolExecutionCard.tsx            # Display tool execution
│   │   └── AgentThinkingIndicator.tsx       # Show reasoning state
│   └── types/
│       └── agent-types.ts                   # TypeScript interfaces
```

---

## Implementation Phases

### Phase 1: Core Agent Infrastructure

#### 1.1 Create Agent Service Interface

```csharp
// IAgentService.cs
public interface IAgentService
{
    Task<AgentResponse> ProcessAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default);

    IAsyncEnumerable<AgentStreamEvent> ProcessStreamAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default);
}
```

#### 1.2 Implement Agent Service with Semantic Kernel

```csharp
// AgentService.cs
public class AgentService : IAgentService
{
    private readonly Kernel _kernel;
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<AgentService> _logger;

    public AgentService(
        IAIProviderFactory providerFactory,
        INoteRepository noteRepository,
        ILogger<AgentService> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;

        // Initialize Semantic Kernel
        var builder = Kernel.CreateBuilder();

        // Register plugins
        builder.Plugins.AddFromObject(new NotesPlugin(noteRepository));

        _kernel = builder.Build();
    }

    public async IAsyncEnumerable<AgentStreamEvent> ProcessStreamAsync(
        AgentRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Configure the AI service based on provider
        var aiProvider = _providerFactory.GetProvider(request.Provider);

        // Set up chat completion with auto-invoke for tools
        var settings = new OpenAIPromptExecutionSettings
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
            Temperature = request.Temperature ?? 0.7f,
            MaxTokens = request.MaxTokens
        };

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(GetAgentSystemPrompt());

        // Add conversation history
        foreach (var message in request.Messages)
        {
            if (message.Role == "user")
                chatHistory.AddUserMessage(message.Content);
            else
                chatHistory.AddAssistantMessage(message.Content);
        }

        // Stream with tool execution
        var chatService = _kernel.GetRequiredService<IChatCompletionService>();

        await foreach (var update in chatService.GetStreamingChatMessageContentsAsync(
            chatHistory, settings, _kernel, cancellationToken))
        {
            if (update.Content != null)
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Token,
                    Content = update.Content
                };
            }

            // Handle tool calls
            if (update.Metadata?.ContainsKey("ToolCalls") == true)
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.ToolCall,
                    ToolName = update.Metadata["ToolName"]?.ToString(),
                    ToolResult = update.Metadata["ToolResult"]?.ToString()
                };
            }
        }
    }

    private string GetAgentSystemPrompt()
    {
        return @"You are an intelligent assistant with access to tools for managing notes.

When the user asks you to save, create, or remember something, use the CreateNote tool.
When searching for information in notes, use the SearchNotes tool.
When updating existing notes, use the UpdateNote tool.

Always confirm tool actions with the user and provide relevant details about what was created or found.

Be helpful, concise, and proactive in using your tools when appropriate.";
    }
}
```

#### 1.3 Create Notes Plugin

```csharp
// NotesPlugin.cs
public class NotesPlugin
{
    private readonly INoteRepository _noteRepository;

    public NotesPlugin(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;
    }

    [KernelFunction("CreateNote")]
    [Description("Creates a new note with the specified title and content")]
    public async Task<string> CreateNoteAsync(
        [Description("The title of the note")] string title,
        [Description("The content/body of the note")] string content,
        [Description("Comma-separated tags for the note")] string? tags = null,
        [Description("The user ID who owns the note")] string? userId = null)
    {
        var note = new Note
        {
            Id = Guid.NewGuid().ToString(),
            Title = title,
            Content = content,
            Tags = tags?.Split(',').Select(t => t.Trim()).ToList() ?? new List<string>(),
            UserId = userId ?? "default",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsPinned = false,
            IsFavorite = false,
            IsArchived = false,
            IsDeleted = false
        };

        var created = await _noteRepository.CreateAsync(note);

        return $"Successfully created note '{created.Title}' with ID: {created.Id}";
    }

    [KernelFunction("SearchNotes")]
    [Description("Searches for notes matching the query")]
    public async Task<string> SearchNotesAsync(
        [Description("The search query")] string query,
        [Description("The user ID to search notes for")] string userId,
        [Description("Maximum number of results to return")] int maxResults = 5)
    {
        var notes = await _noteRepository.GetByUserIdAsync(userId);

        // Simple search implementation - can be enhanced with vector search
        var matches = notes
            .Where(n => n.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                       n.Content.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                       n.Tags.Any(t => t.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Take(maxResults)
            .ToList();

        if (!matches.Any())
        {
            return "No notes found matching the query.";
        }

        var results = matches.Select(n =>
            $"- **{n.Title}** (ID: {n.Id})\n  Tags: {string.Join(", ", n.Tags)}\n  Preview: {n.Content.Substring(0, Math.Min(100, n.Content.Length))}...");

        return $"Found {matches.Count} note(s):\n\n{string.Join("\n\n", results)}";
    }

    [KernelFunction("UpdateNote")]
    [Description("Updates an existing note")]
    public async Task<string> UpdateNoteAsync(
        [Description("The ID of the note to update")] string noteId,
        [Description("New title (optional)")] string? title = null,
        [Description("New content (optional)")] string? content = null,
        [Description("New tags, comma-separated (optional)")] string? tags = null)
    {
        var note = await _noteRepository.GetByIdAsync(noteId);

        if (note == null)
        {
            return $"Note with ID '{noteId}' not found.";
        }

        if (title != null) note.Title = title;
        if (content != null) note.Content = content;
        if (tags != null) note.Tags = tags.Split(',').Select(t => t.Trim()).ToList();
        note.UpdatedAt = DateTime.UtcNow;

        await _noteRepository.UpdateAsync(noteId, note);

        return $"Successfully updated note '{note.Title}'";
    }
}
```

#### 1.4 Create Agent Controller

```csharp
// AgentController.cs
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AgentController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly IChatRepository _chatRepository;
    private readonly ILogger<AgentController> _logger;

    public AgentController(
        IAgentService agentService,
        IChatRepository chatRepository,
        ILogger<AgentController> logger)
    {
        _agentService = agentService;
        _chatRepository = chatRepository;
        _logger = logger;
    }

    /// <summary>
    /// Stream an agent message with tool execution
    /// </summary>
    [HttpPost("conversations/{id}/messages/stream")]
    public async Task StreamAgentMessage(
        string id,
        [FromBody] AgentMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            await Response.WriteAsync("{\"error\":\"Not authenticated\"}");
            return;
        }

        // Set SSE headers
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        var conversation = await _chatRepository.GetByIdAsync(id);
        if (conversation == null || conversation.UserId != userId)
        {
            await Response.WriteAsync("event: error\ndata: {\"error\":\"Conversation not found\"}\n\n");
            return;
        }

        // Build agent request
        var agentRequest = new AgentRequest
        {
            Provider = conversation.Provider,
            Model = conversation.Model,
            Messages = conversation.Messages.Select(m => new AgentMessage
            {
                Role = m.Role,
                Content = m.Content
            }).ToList(),
            UserId = userId,
            Temperature = request.Temperature,
            MaxTokens = request.MaxTokens
        };

        // Add the new user message
        agentRequest.Messages.Add(new AgentMessage
        {
            Role = "user",
            Content = request.Content
        });

        // Stream the response
        var fullResponse = new StringBuilder();
        var toolCalls = new List<ToolExecutionResult>();

        await foreach (var evt in _agentService.ProcessStreamAsync(agentRequest, cancellationToken))
        {
            switch (evt.Type)
            {
                case AgentEventType.Token:
                    fullResponse.Append(evt.Content);
                    var escapedToken = evt.Content.Replace("\n", "\\n");
                    await Response.WriteAsync($"data: {escapedToken}\n\n");
                    break;

                case AgentEventType.ToolCall:
                    var toolJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        tool = evt.ToolName,
                        result = evt.ToolResult
                    });
                    await Response.WriteAsync($"event: tool\ndata: {toolJson}\n\n");
                    toolCalls.Add(new ToolExecutionResult
                    {
                        ToolName = evt.ToolName,
                        Result = evt.ToolResult
                    });
                    break;
            }

            await Response.Body.FlushAsync(cancellationToken);
        }

        // Save messages to conversation
        conversation.Messages.Add(new ChatMessage
        {
            Role = "user",
            Content = request.Content,
            Timestamp = DateTime.UtcNow
        });

        conversation.Messages.Add(new ChatMessage
        {
            Role = "assistant",
            Content = fullResponse.ToString(),
            Timestamp = DateTime.UtcNow,
            ToolCalls = toolCalls.Any() ? toolCalls : null
        });

        await _chatRepository.UpdateAsync(id, conversation);

        // Send end event
        await Response.WriteAsync($"event: end\ndata: {{\"conversationId\":\"{id}\"}}\n\n");
    }
}
```

---

### Phase 2: Frontend Implementation

#### 2.1 Agent Mode Toggle Component

```typescript
// AgentModeToggle.tsx
import { useState } from 'react';

interface AgentModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function AgentModeToggle({ enabled, onChange, disabled }: AgentModeToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${enabled
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          : 'bg-transparent text-gray-400 border border-gray-600 hover:border-gray-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={enabled ? 'Agent mode enabled' : 'Enable agent mode'}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      Agent
    </button>
  );
}
```

#### 2.2 Agent Stream Hook

```typescript
// use-agent-stream.ts
import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

interface ToolExecution {
  tool: string;
  result: string;
  timestamp: Date;
}

interface UseAgentStreamReturn {
  isStreaming: boolean;
  streamingMessage: string;
  toolExecutions: ToolExecution[];
  sendAgentMessage: (conversationId: string, content: string) => Promise<void>;
  cancelStream: () => void;
}

export function useAgentStream(): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendAgentMessage = useCallback(async (conversationId: string, content: string) => {
    setIsStreaming(true);
    setStreamingMessage('');
    setToolExecutions([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${apiClient.baseUrl}/api/agent/conversations/${conversationId}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...apiClient.getAuthHeaders(),
          },
          body: JSON.stringify({ content }),
          signal: abortControllerRef.current.signal,
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            setStreamingMessage(prev => prev + data.replace(/\\n/g, '\n'));
          } else if (line.startsWith('event: tool')) {
            // Next line will be the tool data
            const toolDataLine = lines[lines.indexOf(line) + 1];
            if (toolDataLine?.startsWith('data: ')) {
              const toolData = JSON.parse(toolDataLine.slice(6));
              setToolExecutions(prev => [...prev, {
                ...toolData,
                timestamp: new Date()
              }]);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Agent stream error:', error);
        throw error;
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    streamingMessage,
    toolExecutions,
    sendAgentMessage,
    cancelStream,
  };
}
```

#### 2.3 Tool Execution Display Component

```typescript
// ToolExecutionCard.tsx
interface ToolExecutionCardProps {
  toolName: string;
  result: string;
  timestamp: Date;
}

export function ToolExecutionCard({ toolName, result, timestamp }: ToolExecutionCardProps) {
  const getToolIcon = (name: string) => {
    switch (name) {
      case 'CreateNote':
        return '📝';
      case 'SearchNotes':
        return '🔍';
      case 'UpdateNote':
        return '✏️';
      default:
        return '🔧';
    }
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'CreateNote':
        return 'Created Note';
      case 'SearchNotes':
        return 'Searched Notes';
      case 'UpdateNote':
        return 'Updated Note';
      default:
        return name;
    }
  };

  return (
    <div
      className="my-2 p-3 rounded-lg border"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{getToolIcon(toolName)}</span>
        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {getToolLabel(toolName)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div
        className="text-sm whitespace-pre-wrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {result}
      </div>
    </div>
  );
}
```

#### 2.4 Update ChatPage to Support Agent Mode

Add to the ChatPage state:
```typescript
const [agentModeEnabled, setAgentModeEnabled] = useState(false);
```

Add toggle to header (after RAG toggle):
```typescript
{/* Agent Mode Toggle */}
<div className="flex-shrink-0">
  <AgentModeToggle
    enabled={agentModeEnabled}
    onChange={setAgentModeEnabled}
    disabled={isLoading}
  />
</div>
```

Modify send message handler to use agent stream when enabled:
```typescript
const handleSendMessage = async () => {
  if (!inputValue.trim()) return;

  if (agentModeEnabled) {
    // Use agent streaming
    await sendAgentMessage(conversationId, inputValue);
  } else {
    // Use regular streaming
    await sendStreamingMessage(conversationId, { content: inputValue, ... });
  }
};
```

---

### Phase 3: Data Models

#### 3.1 Backend Models

```csharp
// AgentRequest.cs
public class AgentRequest
{
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public List<AgentMessage> Messages { get; set; } = new();
    public string UserId { get; set; } = string.Empty;
    public float? Temperature { get; set; }
    public int? MaxTokens { get; set; }
}

public class AgentMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

// AgentStreamEvent.cs
public class AgentStreamEvent
{
    public AgentEventType Type { get; set; }
    public string? Content { get; set; }
    public string? ToolName { get; set; }
    public string? ToolResult { get; set; }
}

public enum AgentEventType
{
    Token,
    ToolCall,
    ToolResult,
    Error,
    End
}

// ToolExecutionResult.cs
public class ToolExecutionResult
{
    public string ToolName { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}
```

#### 3.2 Update ChatMessage Entity

```csharp
// Add to ChatMessage.cs
public List<ToolExecutionResult>? ToolCalls { get; set; }
```

---

### Phase 4: Provider Configuration

#### 4.1 Configure Semantic Kernel for Each Provider

```csharp
// AgentProviderConfiguration.cs
public static class AgentProviderConfiguration
{
    public static void ConfigureKernelForProvider(
        IKernelBuilder builder,
        string provider,
        string model,
        IConfiguration configuration)
    {
        switch (provider.ToLower())
        {
            case "openai":
                builder.AddOpenAIChatCompletion(
                    model,
                    configuration["OpenAI:ApiKey"]!);
                break;

            case "claude":
                // Use Anthropic connector or custom implementation
                builder.AddAnthropic(
                    model,
                    configuration["Anthropic:ApiKey"]!);
                break;

            case "gemini":
                builder.AddGoogleAIGeminiChatCompletion(
                    model,
                    configuration["Gemini:ApiKey"]!);
                break;

            case "ollama":
                builder.AddOllamaChatCompletion(
                    model,
                    new Uri(configuration["Ollama:Endpoint"]!));
                break;

            case "grok":
                // Custom implementation for Grok
                // May need to use OpenAI-compatible endpoint
                builder.AddOpenAIChatCompletion(
                    model,
                    configuration["Grok:ApiKey"]!,
                    endpoint: new Uri(configuration["Grok:Endpoint"]!));
                break;
        }
    }
}
```

---

## Testing Plan

### Unit Tests

```csharp
[Fact]
public async Task CreateNoteTool_ShouldCreateNote_WhenValidInput()
{
    // Arrange
    var mockRepo = new Mock<INoteRepository>();
    var plugin = new NotesPlugin(mockRepo.Object);

    // Act
    var result = await plugin.CreateNoteAsync(
        "Test Note",
        "Test Content",
        "tag1, tag2",
        "user123");

    // Assert
    mockRepo.Verify(r => r.CreateAsync(It.IsAny<Note>()), Times.Once);
    Assert.Contains("Successfully created note", result);
}
```

### Integration Tests

1. Test agent streaming with tool execution
2. Test conversation persistence with tool calls
3. Test multi-turn conversations with agent
4. Test error handling for failed tool calls

### Manual Testing Scenarios

1. **Create Note Flow**
   - User: "Save a note about our meeting today with the title 'Team Sync'"
   - Expected: Agent creates note, confirms with ID

2. **Search and Create**
   - User: "Search for notes about 'project alpha' and create a summary note"
   - Expected: Agent searches, finds notes, creates summary

3. **Multi-Step Task**
   - User: "Find all my notes tagged 'important' and update them to also include the tag 'priority'"
   - Expected: Agent searches, iterates through notes, updates each

---

## Security Considerations

1. **Tool Permissions**: Ensure tools only access user's own notes (userId validation)
2. **Input Sanitization**: Validate all tool inputs before execution
3. **Rate Limiting**: Consider limiting tool executions per conversation
4. **Audit Logging**: Log all tool executions for security review

---

## Performance Considerations

1. **Token Usage**: Agent mode uses more tokens due to system prompts and reasoning
   - Consider displaying estimated cost to users
   - Implement token budgets per conversation

2. **Streaming Optimization**:
   - Buffer tool results before sending
   - Minimize database calls during streaming

3. **Caching**:
   - Cache frequently accessed notes for search
   - Cache user preferences

---

## Future Enhancements

### Additional Tools

1. **WebSearchPlugin** - Search the web for information
2. **TasksPlugin** - Create and manage tasks/reminders
3. **LinksPlugin** - Create links between notes
4. **ExportPlugin** - Export notes to various formats
5. **SchedulePlugin** - Set reminders and schedule notes

### Advanced Features

1. **Agent Personas** - Different agent configurations for different use cases
2. **Multi-Agent Collaboration** - Multiple specialized agents working together
3. **Memory/Context Window Management** - Smart context compression
4. **Autonomous Mode** - Agent proactively organizes and maintains notes

---

## Deployment Checklist

- [ ] Add Semantic Kernel NuGet packages
- [ ] Implement AgentService and plugins
- [ ] Create AgentController endpoints
- [ ] Update ChatMessage entity with ToolCalls
- [ ] Add database migration for tool calls
- [ ] Implement frontend toggle and streaming
- [ ] Add tool execution display components
- [ ] Write unit and integration tests
- [ ] Update API documentation
- [ ] Configure provider-specific settings
- [ ] Test with all 5 providers
- [ ] Performance testing and optimization
- [ ] Security review

---

## References

- [Semantic Kernel Documentation](https://learn.microsoft.com/en-us/semantic-kernel/)
- [Semantic Kernel Agent Framework](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/)
- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [GitHub - Microsoft Semantic Kernel](https://github.com/microsoft/semantic-kernel)
