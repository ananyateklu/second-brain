# X.AI Grok API - Full Features Implementation Guide

This document provides a comprehensive implementation plan for leveraging all features available in the X.AI Grok API, which uses an OpenAI-compatible SDK interface.

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Feature Implementation Plan](#feature-implementation-plan)
   - [1. Function Calling (Tools)](#1-function-calling-tools)
   - [2. Structured Output (JSON Schema)](#2-structured-output-json-schema)
   - [3. Think Mode (Reasoning)](#3-think-mode-reasoning)
   - [4. Live Search](#4-live-search)
   - [5. DeepSearch](#5-deepsearch)
   - [6. Vision (Image Understanding)](#6-vision-image-understanding)
   - [7. Image Generation (Aurora)](#7-image-generation-aurora)
   - [8. Extended Context Window](#8-extended-context-window)
   - [9. Content Moderation](#9-content-moderation)
4. [API Endpoints to Add](#api-endpoints-to-add)
5. [Database Schema Changes](#database-schema-changes)
6. [Frontend Integration](#frontend-integration)
7. [Configuration Updates](#configuration-updates)
8. [Model Reference](#model-reference)
9. [Testing Strategy](#testing-strategy)

---

## Overview

X.AI's Grok API provides access to powerful AI models including Grok-3, Grok-3-Mini, and vision-capable models. The API is **OpenAI-compatible**, meaning we can use the official OpenAI .NET SDK with a custom endpoint. This enables seamless integration with existing OpenAI code patterns while accessing Grok-specific features.

### API Information

| Property | Value |
|----------|-------|
| **API Base URL** | `https://api.x.ai/v1` |
| **SDK** | OpenAI .NET SDK (v2.7.0) |
| **Compatibility** | OpenAI API format |
| **Documentation** | https://docs.x.ai |
| **Console** | https://console.x.ai |
| **API Portal** | https://x.ai/api |

### Key Differences from OpenAI

| Feature | OpenAI | Grok |
|---------|--------|------|
| **Live Search** | Via Responses API | Native `search_parameters` |
| **DeepSearch** | Not available | Comprehensive web research |
| **Think Mode** | o1/o3 reasoning | Native think mode |
| **Context Window** | Up to 128K | Up to 2M tokens (Grok-4) |
| **Vision** | GPT-4o | grok-2-vision-1212 |
| **Image Gen** | DALL-E | Aurora (grok-2-image) |

### SDK Usage (OpenAI-Compatible)

```csharp
using OpenAI;
using OpenAI.Chat;

// Create client with custom endpoint
var apiKeyCredential = new ApiKeyCredential(apiKey);
var options = new OpenAIClientOptions
{
    Endpoint = new Uri("https://api.x.ai/v1")
};

var client = new OpenAIClient(apiKeyCredential, options);
var chatClient = client.GetChatClient("grok-3-mini");

// Use exactly like OpenAI
var completion = await chatClient.CompleteChatAsync(
    new[] { new UserChatMessage("Hello, Grok!") });
```

---

## Current Implementation Status

> **Last Updated:** December 2025

| Feature | Status | Notes |
|---------|--------|-------|
| Text Generation | ✅ Implemented | Via OpenAI SDK |
| Streaming | ✅ Implemented | `CompleteChatStreamingAsync` |
| Chat/Multi-turn | ✅ Implemented | UserChatMessage, AssistantChatMessage |
| System Messages | ✅ Implemented | SystemChatMessage |
| Multimodal (Images) | ✅ Implemented | Vision via base64 data URLs |
| Image Generation | ✅ Implemented | Aurora (grok-2-image) via HTTP |
| Function Calling | ✅ Implemented | Native tool calling (OpenAI-compatible) |
| Structured Output | ✅ Implemented | JSON schema via unified service (OpenAI-compatible) |
| Think Mode | ✅ Implemented | Extended reasoning via HTTP API |
| Live Search | ✅ Implemented | Tool-based search (future-proof) |
| DeepSearch | ✅ Implemented | Tool-based comprehensive research |
| Extended Context | ✅ Implemented | Configurable via MaxContextTokens |

### Current Implementation Details

#### ✅ Fully Implemented

- **Chat Completion**: Basic `ChatClient.CompleteChatAsync` via OpenAI SDK
- **Streaming**: `CompleteChatStreamingAsync` with first-token latency tracking
- **Multimodal Images**: User messages with image content parts via data URLs
- **Image Generation**: Aurora (grok-2-image) via HTTP API
- **Health Checks**: Provider availability and model listing
- **Native Function Calling**: `StreamWithToolsAsync` for agent mode with tool execution
- **Think Mode**: `GenerateWithThinkModeAsync` and `StreamWithThinkModeAsync` for extended reasoning
- **Live Search Tool**: `GrokSearchTool` for real-time web and X search
- **DeepSearch Tool**: `GrokDeepSearchTool` for comprehensive research
- **Extended Context**: Configurable `MaxContextTokens` (default: 131072)
- **Telemetry**: OpenTelemetry integration for requests

#### Architecture Pattern

The current implementation uses the OpenAI SDK with Grok's custom endpoint:

```csharp
// GrokProvider.cs - Current pattern
var apiKeyCredential = new ApiKeyCredential(_settings.ApiKey);
var openAIClientOptions = new OpenAIClientOptions
{
    Endpoint = new Uri(_settings.BaseUrl) // https://api.x.ai/v1
};

var openAIClient = new OpenAIClient(apiKeyCredential, openAIClientOptions);
_client = openAIClient.GetChatClient(_settings.DefaultModel);
```

#### Native Function Calling

Grok now uses native tool calling (OpenAI-compatible) through `ProcessGrokStreamAsync` in AgentService:

```csharp
// GrokProvider.cs - Native tool calling
public async IAsyncEnumerable<GrokToolStreamEvent> StreamWithToolsAsync(
    IEnumerable<OpenAIChatMessage> messages,
    IEnumerable<ChatTool> tools,
    string model,
    AIRequest? settings = null,
    CancellationToken cancellationToken = default)

// AgentService.cs - Grok detection and processing
var isGrok = request.Provider.Equals("grok", StringComparison.OrdinalIgnoreCase) ||
             request.Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);
var useNativeGrokFunctionCalling = isGrok &&
    _grokProvider != null &&
    _settings.XAI.Enabled &&
    request.Capabilities != null &&
    request.Capabilities.Count > 0;

if (useNativeGrokFunctionCalling)
{
    await foreach (var evt in ProcessGrokStreamAsync(request, cancellationToken))
    {
        yield return evt;
    }
}
```

#### Function Calling Infrastructure

```text
Services/AI/FunctionCalling/
├── IGrokFunctionHandler.cs         # Interface for Grok function handlers
├── GrokFunctionDeclarationBuilder.cs # Builds ChatTool from [KernelFunction] methods
├── GrokFunctionRegistry.cs         # Registry for managing handlers
└── Handlers/
    └── PluginBasedGrokFunctionHandler.cs # Plugin-based function execution
```

---

## Feature Implementation Plan

### 1. Function Calling (Tools)

**Priority:** HIGH  
**Complexity:** Low (OpenAI-compatible)  
**Status:** ✅ Implemented  
**Target:** Native SDK tool calling

#### Overview

Grok supports OpenAI-compatible function calling, enabling AI agents to invoke external tools. As of December 2025, the legacy Live Search API is being integrated into the new agentic tool calling API.

#### SDK Usage (OpenAI-Compatible)

```csharp
using OpenAI.Chat;

// Define tools (same as OpenAI)
ChatTool searchNotesTool = ChatTool.CreateFunctionTool(
    functionName: "search_notes",
    functionDescription: "Search user's notes by query",
    functionParameters: BinaryData.FromBytes("""
        {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return"
                }
            },
            "required": ["query"]
        }
        """u8.ToArray())
);

// Add to completion options
var options = new ChatCompletionOptions
{
    Tools = { searchNotesTool },
    MaxOutputTokenCount = 4096
};

// Handle tool calls
var completion = await client.CompleteChatAsync(messages, options);

if (completion.Value.FinishReason == ChatFinishReason.ToolCalls)
{
    foreach (var toolCall in completion.Value.ToolCalls)
    {
        var result = await ExecuteToolAsync(toolCall);
        messages.Add(new AssistantChatMessage(completion.Value));
        messages.Add(new ToolChatMessage(toolCall.Id, result));
    }
    
    // Continue with results
    completion = await client.CompleteChatAsync(messages, options);
}
```

#### Grok-Specific: Agent Tools API

The new Agent Tools API (replacing Live Search) provides built-in tools:

```json
{
  "model": "grok-3-mini",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "web_search",
        "description": "Search the web for current information"
      }
    }
  ],
  "tool_choice": "auto"
}
```

#### Implementation Steps

1. **Create `IGrokFunctionHandler` interface:**
   ```csharp
   public interface IGrokFunctionHandler
   {
       string FunctionName { get; }
       ChatTool GetToolDefinition();
       Task<string> ExecuteAsync(BinaryData arguments, CancellationToken ct);
   }
   ```

2. **Create `GrokFunctionDeclarationBuilder`:**
   - Reuse pattern from OpenAI/Gemini implementations
   - Extract `[KernelFunction]` attributes from plugins

3. **Update `GrokProvider` with tool support:**
   ```csharp
   public async Task<AIResponse> GenerateWithToolsAsync(
       IEnumerable<ChatMessage> messages,
       IEnumerable<ChatTool> tools,
       AIRequest? settings = null,
       CancellationToken cancellationToken = default)
   ```

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/FunctionCalling/IGrokFunctionHandler.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/GrokFunctionDeclarationBuilder.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/GrokFunctionRegistry.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/Handlers/PluginBasedGrokFunctionHandler.cs` | Create | ✅ Implemented |
| `Services/AI/Models/GrokToolStreamEvent.cs` | Create | ✅ Implemented |
| `Services/AI/Providers/GrokProvider.cs` | Modify | ✅ Implemented |
| `Services/Agents/AgentService.cs` | Modify | ✅ Implemented |

---

### 2. Structured Output (JSON Schema)

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Guaranteed JSON output matching schema

> **Implementation Note:** Structured output is implemented via the unified `IStructuredOutputService` in `Services/AI/StructuredOutput/`. Uses OpenAI-compatible `ChatResponseFormat.CreateJsonSchemaFormat` with `jsonSchemaIsStrict: true`. Schema is built from C# types using reflection via `JsonSchemaBuilder` and converted via `GrokSchemaAdapter`.

#### Overview

Grok supports structured outputs with JSON schema validation. Supported models: `grok-2-1212`, `grok-2-vision-1212`, `grok-3`, `grok-3-mini` and later.

#### Supported Schema Types

| Type | Description |
|------|-------------|
| `String` | Text values |
| `Number` | Integer, float |
| `Object` | Nested objects |
| `Array` | Lists |
| `Boolean` | true/false |
| `Enum` | Enumerated values |
| `AnyOf` | Union types |

**Note:** `allOf` is not supported.

#### SDK Usage (OpenAI-Compatible)

```csharp
var options = new ChatCompletionOptions
{
    ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
        jsonSchemaFormatName: "note_analysis",
        jsonSchema: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "summary": { "type": "string" },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" }
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "negative", "neutral"]
                    }
                },
                "required": ["title", "summary", "tags", "sentiment"],
                "additionalProperties": false
            }
            """u8.ToArray()),
        jsonSchemaIsStrict: true)
};

var completion = await client.CompleteChatAsync(messages, options);
var result = JsonSerializer.Deserialize<NoteAnalysis>(completion.Value.Content[0].Text);
```

#### Implementation

```csharp
public interface IGrokStructuredOutputService
{
    Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class;
}

public class GrokStructuredOutputService : IGrokStructuredOutputService
{
    private readonly ChatClient _client;
    
    public async Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class
    {
        var messages = new List<ChatMessage>();
        
        if (!string.IsNullOrEmpty(systemPrompt))
            messages.Add(new SystemChatMessage(systemPrompt));
        
        messages.Add(new UserChatMessage(prompt));
        
        var options = new ChatCompletionOptions
        {
            ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                typeof(T).Name,
                GrokSchemaBuilder.FromType<T>(),
                jsonSchemaIsStrict: true)
        };
        
        var completion = await _client.CompleteChatAsync(messages, options, cancellationToken);
        return JsonSerializer.Deserialize<T>(completion.Value.Content[0].Text);
    }
}
```

#### Use Cases

1. **Note Analysis** - Extract structured data from notes
2. **Query Classification** - Categorize user intents
3. **Entity Extraction** - Pull entities from text
4. **Report Generation** - Generate formatted reports

---

### 3. Think Mode (Reasoning)

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Extended reasoning for complex problems

#### Overview

Think Mode enables Grok to perform advanced step-by-step reasoning, similar to OpenAI's o1/o3 models. It excels in:
- Solving equations
- Analyzing abstract concepts
- Providing theoretical insights
- Breaking down complex problems

#### Characteristics

| Aspect | Description |
|--------|-------------|
| **Processing Time** | Can take over a minute for complex problems |
| **Data Efficiency** | Uses pre-existing knowledge, no new data fetch |
| **Output** | Step-by-step reasoning process |
| **Training** | Refined using reinforcement learning |

#### API Usage

```json
{
  "model": "grok-3",
  "messages": [
    {
      "role": "user",
      "content": "Solve this differential equation: dy/dx + 2y = e^x"
    }
  ],
  "reasoning": {
    "enabled": true,
    "effort": "high"
  }
}
```

#### Implementation

```csharp
public class GrokThinkModeOptions
{
    public bool Enabled { get; set; } = false;
    public string Effort { get; set; } = "medium"; // low, medium, high
    public bool IncludeReasoningInResponse { get; set; } = false;
}

public async Task<AIResponse> GenerateWithThinkModeAsync(
    AIRequest request,
    GrokThinkModeOptions thinkOptions,
    CancellationToken cancellationToken = default)
{
    // Use HTTP client for think mode since SDK may not support it natively
    var requestBody = new
    {
        model = request.Model ?? _settings.DefaultModel,
        messages = ConvertMessages(request.Messages),
        reasoning = new
        {
            enabled = thinkOptions.Enabled,
            effort = thinkOptions.Effort
        }
    };
    
    var response = await _httpClient.PostAsJsonAsync(
        "chat/completions",
        requestBody,
        cancellationToken);
    
    // Parse response including reasoning steps
    return await ParseThinkModeResponseAsync(response);
}
```

#### Frontend Integration

```typescript
interface ThinkModeOptions {
  enabled: boolean;
  effort: 'low' | 'medium' | 'high';
  includeReasoning?: boolean;
}

interface ThinkingStep {
  step: number;
  thought: string;
  conclusion?: string;
}

interface ChatMessage {
  // ... existing fields
  thinkingProcess?: ThinkingStep[];
}
```

---

### 4. Live Search

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ✅ Implemented (Tool-based)  
**Target:** Real-time web and X (Twitter) data

#### Overview

Live Search enables real-time data retrieval from X (Twitter) and the broader internet. 

> **⚠️ Deprecation Notice:** The Live Search API is scheduled for deprecation by **December 15, 2025**. Its capabilities are being integrated into the new agentic tool calling API.

#### API Usage (Current)

```json
{
  "model": "grok-3-mini",
  "messages": [
    {
      "role": "user",
      "content": "What are the latest developments in AI today?"
    }
  ],
  "search_parameters": {
    "mode": "auto",
    "sources": ["web", "x"],
    "recency": "day",
    "max_results": 10
  }
}
```

#### Search Modes

| Mode | Description |
|------|-------------|
| `auto` | Model decides when to search |
| `on` | Always perform search |
| `off` | Never search |

#### Implementation

```csharp
public class GrokSearchOptions
{
    public string Mode { get; set; } = "auto"; // auto, on, off
    public List<string> Sources { get; set; } = new() { "web", "x" };
    public string Recency { get; set; } = "day"; // hour, day, week, month
    public int MaxResults { get; set; } = 10;
}

public async Task<AIResponse> GenerateWithSearchAsync(
    AIRequest request,
    GrokSearchOptions searchOptions,
    CancellationToken cancellationToken = default)
{
    var requestBody = new
    {
        model = request.Model ?? "grok-3-mini",
        messages = ConvertMessages(request.Messages),
        search_parameters = new
        {
            mode = searchOptions.Mode,
            sources = searchOptions.Sources,
            recency = searchOptions.Recency,
            max_results = searchOptions.MaxResults
        }
    };
    
    // Use HTTP client for search since SDK may not support it
    var response = await _httpClient.PostAsJsonAsync(
        "chat/completions",
        requestBody,
        cancellationToken);
    
    return await ParseSearchResponseAsync(response);
}
```

#### Migration to Tool Calling

After December 15, 2025:

```json
{
  "model": "grok-3-mini",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "live_search",
        "description": "Search web and X for real-time information"
      }
    }
  ]
}
```

---

### 5. DeepSearch

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ✅ Implemented (Tool-based)  
**Target:** Comprehensive web research agent

#### Overview

DeepSearch is an AI agent that conducts comprehensive, real-time searches across human knowledge. It:
- Synthesizes information from multiple sources
- Resolves conflicting facts
- Delivers concise, comprehensive reports
- Provides insights beyond standard browser searches

#### Use Cases

| Category | Example |
|----------|---------|
| **Real-time News** | "What happened at the AI conference today?" |
| **Research** | "Summarize recent papers on transformer architectures" |
| **Analysis** | "Compare different approaches to climate change mitigation" |
| **Social Insights** | "What's trending on X about cryptocurrencies?" |

#### Implementation

```csharp
public class GrokDeepSearchOptions
{
    public bool Enabled { get; set; } = false;
    public int MaxSources { get; set; } = 20;
    public int MaxTimeSeconds { get; set; } = 120;
    public List<string> FocusAreas { get; set; } = new();
}

public async Task<DeepSearchResponse> DeepSearchAsync(
    string query,
    GrokDeepSearchOptions options,
    CancellationToken cancellationToken = default)
{
    var requestBody = new
    {
        model = "grok-3",
        messages = new[]
        {
            new { role = "user", content = query }
        },
        deep_search = new
        {
            enabled = options.Enabled,
            max_sources = options.MaxSources,
            max_time_seconds = options.MaxTimeSeconds,
            focus_areas = options.FocusAreas
        }
    };
    
    var response = await _httpClient.PostAsJsonAsync(
        "chat/completions",
        requestBody,
        cancellationToken);
    
    return await ParseDeepSearchResponseAsync(response);
}

public class DeepSearchResponse
{
    public string Summary { get; set; } = string.Empty;
    public List<DeepSearchSource> Sources { get; set; } = new();
    public Dictionary<string, string> KeyFindings { get; set; } = new();
    public string Analysis { get; set; } = string.Empty;
}

public class DeepSearchSource
{
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // web, x_post, news, etc.
    public DateTime? PublishedAt { get; set; }
}
```

---

### 6. Vision (Image Understanding)

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Already working, document enhancements

#### Overview

Grok-2-Vision-1212 can process both text and image inputs, analyzing images provided as base64-encoded strings or web URLs.

#### Current Implementation

```csharp
// In GrokProvider.ConvertToGrokMessage
private static OpenAIChatMessage ConvertToGrokMessage(ChatMessage message)
{
    // User message with images
    if (message.Images != null && message.Images.Count > 0)
    {
        var contentParts = new List<ChatMessageContentPart>();
        
        if (!string.IsNullOrEmpty(message.Content))
            contentParts.Add(ChatMessageContentPart.CreateTextPart(message.Content));
        
        foreach (var image in message.Images)
        {
            var dataUrl = $"data:{image.MediaType};base64,{image.Base64Data}";
            contentParts.Add(ChatMessageContentPart.CreateImagePart(new Uri(dataUrl)));
        }
        
        return new UserChatMessage(contentParts);
    }
    
    return new UserChatMessage(message.Content);
}
```

#### Supported Image Formats

| Format | Support |
|--------|---------|
| JPEG | ✅ Supported |
| PNG | ✅ Supported |
| GIF | ✅ Supported |
| WebP | ✅ Supported |

#### Enhancements

1. **URL Support** - Direct image URLs instead of base64
2. **Image Detail** - Control resolution level
3. **Multiple Images** - Already supported

---

### 7. Image Generation (Aurora)

**Priority:** LOW  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Already working via HTTP

#### Overview

Aurora (grok-2-image) generates high-quality images from text prompts using an OpenAI-compatible API format.

#### Current Implementation

```csharp
// GrokImageProvider.cs
public async Task<ImageGenerationResponse> GenerateImageAsync(
    ImageGenerationRequest request,
    CancellationToken cancellationToken = default)
{
    var model = request.Model ?? "grok-2-image";
    
    var requestBody = new Dictionary<string, object>
    {
        { "model", model },
        { "prompt", request.Prompt },
        { "n", Math.Min(request.Count, 4) },
        { "response_format", request.ResponseFormat }
    };
    
    if (SupportedSizes.Contains(request.Size))
        requestBody["size"] = request.Size;
    
    var response = await _httpClient.PostAsync(
        "images/generations",
        new StringContent(JsonSerializer.Serialize(requestBody), 
                         Encoding.UTF8, "application/json"),
        cancellationToken);
    
    // Parse response...
}
```

#### Supported Models

| Model | Description |
|-------|-------------|
| `grok-2-image` | Current Aurora model |
| `grok-2-image-1212` | December 2024 version |

#### Supported Sizes

| Size | Aspect Ratio |
|------|--------------|
| `1024x1024` | Square |
| `1024x768` | Landscape |
| `768x1024` | Portrait |

---

### 8. Extended Context Window

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Full support for long contexts

#### Overview

Grok models support large context windows:

| Model | Context Window |
|-------|----------------|
| `grok-2-1212` | 128K tokens |
| `grok-3-mini` | 131K tokens |
| `grok-3` | 131K tokens |
| `grok-4-fast` | **2M tokens** |

#### Implementation

Update configuration to support extended contexts:

```csharp
public class XAISettings
{
    // ... existing fields
    
    public int MaxContextTokens { get; set; } = 131072;
    public bool EnableExtendedContext { get; set; } = true;
}

// In GrokProvider
public async Task<AIResponse> GenerateWithExtendedContextAsync(
    AIRequest request,
    IEnumerable<ChatMessage> longContext,
    CancellationToken cancellationToken = default)
{
    var model = request.Model ?? "grok-3-mini";
    
    // Validate context length
    var tokenCount = EstimateTokenCount(longContext);
    if (tokenCount > _settings.MaxContextTokens)
    {
        _logger.LogWarning("Context exceeds max tokens: {Count} > {Max}",
            tokenCount, _settings.MaxContextTokens);
    }
    
    // Process with extended context
    var messages = longContext.Select(ConvertToGrokMessage).ToList();
    messages.Add(new UserChatMessage(request.Prompt));
    
    var options = new ChatCompletionOptions
    {
        MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens
    };
    
    return await _client.CompleteChatAsync(messages, options, cancellationToken);
}
```

---

### 9. Content Moderation

**Priority:** LOW  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** Safety filtering for content

#### Overview

Implement content moderation for Grok responses using X.AI's moderation capabilities.

#### Implementation

```csharp
public interface IGrokModerationService
{
    Task<ModerationResult> ModerateAsync(
        string content,
        CancellationToken cancellationToken = default);
    
    Task<bool> IsSafeAsync(
        string content,
        CancellationToken cancellationToken = default);
}
```

---

## API Endpoints to Add

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/grok/search` | POST | Live search | Medium |
| `/api/grok/deep-search` | POST | DeepSearch | Medium |
| `/api/grok/think` | POST | Think mode | High |
| `/api/chat/grok/structured` | POST | Structured output | High |

---

## Database Schema Changes

> ✅ **IMPLEMENTED**: All Grok database tables have been created in `database/22_grok_features.sql` and applied to both Docker and Desktop PostgreSQL instances.

### Grok Search Logs

```sql
CREATE TABLE grok_search_logs (
    id VARCHAR(128) PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128),
    user_id VARCHAR(128),
    query TEXT NOT NULL,
    search_mode VARCHAR(32), -- auto, on, off
    sources TEXT[], -- web, x
    result_count INTEGER,
    search_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_grok_search_user ON grok_search_logs(user_id);
CREATE INDEX idx_grok_search_conversation ON grok_search_logs(conversation_id);
```

### Grok Search Sources

```sql
CREATE TABLE grok_search_sources (
    id VARCHAR(128) PRIMARY KEY,
    search_log_id VARCHAR(128) NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    snippet TEXT,
    source_type VARCHAR(32), -- web, x_post, news
    published_at TIMESTAMP WITH TIME ZONE,
    relevance_score REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (search_log_id) REFERENCES grok_search_logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_grok_sources_search ON grok_search_sources(search_log_id);
```

### Grok Think Mode Logs

```sql
CREATE TABLE grok_think_logs (
    id VARCHAR(128) PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128),
    user_id VARCHAR(128),
    effort_level VARCHAR(32), -- low, medium, high
    thinking_time_ms INTEGER,
    steps_count INTEGER,
    reasoning_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_grok_think_user ON grok_think_logs(user_id);
```

---

## Frontend Integration

### Type Updates (frontend/src/types/chat.ts)

```typescript
// Grok-specific types
export interface GrokSearchOptions {
  mode: 'auto' | 'on' | 'off';
  sources: ('web' | 'x')[];
  recency: 'hour' | 'day' | 'week' | 'month';
  maxResults: number;
}

export interface GrokSearchSource {
  url: string;
  title: string;
  snippet: string;
  sourceType: 'web' | 'x_post' | 'news';
  publishedAt?: string;
  relevanceScore?: number;
}

export interface GrokDeepSearchOptions {
  enabled: boolean;
  maxSources: number;
  maxTimeSeconds: number;
  focusAreas?: string[];
}

export interface GrokDeepSearchResult {
  summary: string;
  sources: GrokSearchSource[];
  keyFindings: Record<string, string>;
  analysis: string;
}

export interface GrokThinkOptions {
  enabled: boolean;
  effort: 'low' | 'medium' | 'high';
  includeReasoning?: boolean;
}

export interface GrokThinkingStep {
  step: number;
  thought: string;
  conclusion?: string;
}

// Update SendMessageRequest
export interface SendMessageRequest {
  // ... existing fields
  
  // Grok-specific options
  enableGrokSearch?: boolean;
  grokSearchOptions?: GrokSearchOptions;
  enableDeepSearch?: boolean;
  deepSearchOptions?: GrokDeepSearchOptions;
  enableThinkMode?: boolean;
  thinkOptions?: GrokThinkOptions;
}

// Update ChatMessage
export interface ChatMessage {
  // ... existing fields
  
  // Grok-specific fields
  grokSearchSources?: GrokSearchSource[];
  deepSearchResult?: GrokDeepSearchResult;
  thinkingSteps?: GrokThinkingStep[];
}

// Streaming events
export type GrokStreamEventType =
  | 'text'
  | 'search_start'
  | 'search_result'
  | 'think_step'
  | 'deep_search_progress'
  | 'done'
  | 'error';

export interface GrokStreamEvent {
  type: GrokStreamEventType;
  data: unknown;
}
```

### UI Components to Create

| Component | Purpose | Priority |
|-----------|---------|----------|
| `GrokSearchResults` | Display Live Search sources | Medium |
| `GrokDeepSearchPanel` | Show DeepSearch report | Medium |
| `GrokThinkingDisplay` | Show reasoning steps | High |
| `GrokSearchToggle` | Enable/disable search | Medium |
| `GrokThinkModeToggle` | Enable/disable think mode | Medium |

---

## Configuration Updates

### appsettings.json

```json
{
  "AIProviders": {
    "XAI": {
      "Enabled": true,
      "ApiKey": "",
      "BaseUrl": "https://api.x.ai/v1",
      "DefaultModel": "grok-3-mini",
      "MaxTokens": 4096,
      "Temperature": 0.7,
      "TimeoutSeconds": 120,
      "MaxContextTokens": 131072,
      
      "Features": {
        "EnableFunctionCalling": true,
        "EnableStructuredOutput": true,
        "EnableLiveSearch": true,
        "EnableDeepSearch": true,
        "EnableThinkMode": true
      },
      
      "Search": {
        "DefaultMode": "auto",
        "DefaultSources": ["web", "x"],
        "DefaultRecency": "day",
        "MaxResults": 10
      },
      
      "DeepSearch": {
        "MaxSources": 20,
        "MaxTimeSeconds": 120
      },
      
      "ThinkMode": {
        "DefaultEffort": "medium",
        "IncludeReasoningInResponse": false
      },
      
      "ImageGeneration": {
        "DefaultModel": "grok-2-image",
        "DefaultSize": "1024x1024",
        "MaxCount": 4
      }
    }
  }
}
```

### Configuration Classes

```csharp
public class XAISettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.x.ai/v1";
    public string DefaultModel { get; set; } = "grok-3-mini";
    public int MaxTokens { get; set; } = 4096;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxContextTokens { get; set; } = 131072;
    
    // Feature flags
    public GrokFeaturesConfig Features { get; set; } = new();
    
    // Search config
    public GrokSearchConfig Search { get; set; } = new();
    
    // DeepSearch config
    public GrokDeepSearchConfig DeepSearch { get; set; } = new();
    
    // Think mode config
    public GrokThinkConfig ThinkMode { get; set; } = new();
    
    // Image generation config
    public GrokImageConfig ImageGeneration { get; set; } = new();
}

public class GrokFeaturesConfig
{
    public bool EnableFunctionCalling { get; set; } = true;
    public bool EnableStructuredOutput { get; set; } = true;
    public bool EnableLiveSearch { get; set; } = true;
    public bool EnableDeepSearch { get; set; } = true;
    public bool EnableThinkMode { get; set; } = true;
}

public class GrokSearchConfig
{
    public string DefaultMode { get; set; } = "auto";
    public List<string> DefaultSources { get; set; } = new() { "web", "x" };
    public string DefaultRecency { get; set; } = "day";
    public int MaxResults { get; set; } = 10;
}

public class GrokDeepSearchConfig
{
    public int MaxSources { get; set; } = 20;
    public int MaxTimeSeconds { get; set; } = 120;
}

public class GrokThinkConfig
{
    public string DefaultEffort { get; set; } = "medium";
    public bool IncludeReasoningInResponse { get; set; } = false;
}

public class GrokImageConfig
{
    public string DefaultModel { get; set; } = "grok-2-image";
    public string DefaultSize { get; set; } = "1024x1024";
    public int MaxCount { get; set; } = 4;
}
```

---

## Model Reference

### Language Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| `grok-3` | 131K | Enterprise, complex tasks |
| `grok-3-mini` | 131K | Cost-efficient, fast |
| `grok-2-1212` | 128K | General purpose |
| `grok-2-vision-1212` | 128K | Image understanding |
| `grok-4-fast` | 2M | Extended context |
| `grok-beta` | 128K | Latest features (unstable) |

### Image Models

| Model | Description |
|-------|-------------|
| `grok-2-image` | Aurora image generation |
| `grok-2-image-1212` | December 2024 version |

### Model Selection Guide

| Use Case | Recommended Model |
|----------|-------------------|
| **General Chat** | grok-3-mini |
| **Complex Reasoning** | grok-3 + Think Mode |
| **Vision Tasks** | grok-2-vision-1212 |
| **Image Generation** | grok-2-image |
| **Long Documents** | grok-4-fast |
| **Real-time Info** | grok-3-mini + Live Search |
| **Research** | grok-3 + DeepSearch |

---

## Testing Strategy

### Unit Tests

1. **Function calling handler tests**
2. **Schema generation tests**
3. **Search parameter validation**
4. **Think mode response parsing**

### Integration Tests

1. **End-to-end function calling flow**
2. **Live Search with results**
3. **DeepSearch comprehensive reports**
4. **Vision with image understanding**
5. **Extended context handling**

### Manual Testing

1. Test each feature with real API
2. Verify frontend displays correctly
3. Check error handling
4. Performance testing for search/DeepSearch
5. Think mode timing and quality

---

## Implementation Priority

### Phase 1 - High Priority ✅ COMPLETED

1. **Native Function Calling** - ✅ `StreamWithToolsAsync`, `ProcessGrokStreamAsync`
2. **Structured Output** - ✅ JSON schema via unified service
3. **Think Mode** - ✅ `GenerateWithThinkModeAsync`, `StreamWithThinkModeAsync`

### Phase 2 - Medium Priority ✅ COMPLETED

4. **Live Search** - ✅ `GrokSearchTool` (tool-based approach)
5. **DeepSearch** - ✅ `GrokDeepSearchTool` (tool-based approach)
6. **Extended Context** - ✅ `MaxContextTokens` configuration (131K default)

### Phase 3 - Lower Priority (Pending)

7. **Content Moderation** - ❌ Not yet started
8. **Analytics** - ⏳ Basic telemetry implemented
9. **UI Components** - ✅ Frontend types added, UI pending

---

## Migration Notes

### Live Search API Deprecation

The Live Search API is being deprecated by December 15, 2025. Plan migration to tool-based approach:

**Before (Legacy):**
```json
{
  "search_parameters": {
    "mode": "on"
  }
}
```

**After (Tool-based):**
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "live_search"
      }
    }
  ]
}
```

---

## Known Issues & Limitations

### API Compatibility

1. **OpenAI SDK limitations** - Some Grok-specific features (search, think mode) may not work through the OpenAI SDK and require HTTP calls
2. **Think mode timing** - Can take over a minute for complex problems
3. **DeepSearch availability** - May not be available in all regions

### Workarounds

1. **Hybrid approach** - Use SDK for basic chat, HTTP for advanced features
2. **Timeout handling** - Increase timeouts for think mode and DeepSearch
3. **Fallback** - Graceful degradation when features unavailable

---

## References

- [X.AI API Documentation](https://docs.x.ai)
- [Grok Models Overview](https://docs.x.ai/docs/models)
- [Function Calling Guide](https://docs.x.ai/docs/guides/function-calling)
- [Structured Outputs Guide](https://docs.x.ai/docs/guides/structured-outputs)
- [Image Understanding Guide](https://docs.x.ai/docs/guides/image-understanding)
- [Live Search Guide](https://docs.x.ai/docs/guides/live-search)
- [X.AI API Portal](https://x.ai/api)
- [X.AI Console](https://console.x.ai)
