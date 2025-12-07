# Anthropic SDK - Full Features Implementation Guide

This document provides a comprehensive implementation plan for leveraging all features available in the Anthropic.SDK (`Anthropic.SDK` v5.8.0+).

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Feature Implementation Plan](#feature-implementation-plan)
   - [1. Function Calling (Tools)](#1-function-calling-tools)
   - [2. Extended Thinking](#2-extended-thinking)
   - [3. Prompt Caching](#3-prompt-caching)
   - [4. Streaming with Tool Use](#4-streaming-with-tool-use)
   - [5. Computer Use](#5-computer-use)
   - [6. Vision (Image Understanding)](#6-vision-image-understanding)
   - [7. PDF Support](#7-pdf-support)
   - [8. Citations](#8-citations)
   - [9. Batch API](#9-batch-api)
   - [10. Structured Output (JSON Mode)](#10-structured-output-json-mode)
4. [API Endpoints to Add](#api-endpoints-to-add)
5. [Database Schema Changes](#database-schema-changes)
6. [Frontend Integration](#frontend-integration)
7. [Configuration Updates](#configuration-updates)
8. [Testing Strategy](#testing-strategy)

---

## Overview

The Anthropic.SDK provides comprehensive access to Claude API features. This document outlines how to upgrade from basic chat completion to leverage advanced features like extended thinking, prompt caching, computer use, and the Batch API.

### SDK Information

| Property | Value |
|----------|-------|
| **Package** | `Anthropic.SDK` |
| **Version** | 5.8.0 |
| **NuGet** | https://www.nuget.org/packages/Anthropic.SDK |
| **Documentation** | https://docs.anthropic.com |
| **GitHub** | https://github.com/tghamm/Anthropic.SDK |

### Key Namespaces

```csharp
using Anthropic.SDK;              // Main client
using Anthropic.SDK.Messaging;    // MessageParameters, Message, ContentBase
using Anthropic.SDK.Extensions;   // Extension methods
using Anthropic.SDK.Common;       // Shared types
```

### Client Organization

The SDK provides a unified client with specialized sub-clients:

| Property | Client Class | Purpose |
|----------|--------------|---------|
| `Messages` | `MessagesEndpoint` | Chat completions, streaming |
| `Batches` | `BatchesEndpoint` | Batch processing |

### Claude Models (December 2025)

| Model | Context | Features | Use Case |
|-------|---------|----------|----------|
| `claude-opus-4-20250514` | 200K | Extended thinking, tools | Most complex tasks |
| `claude-sonnet-4-20250514` | 200K | Extended thinking, tools | Balanced performance |
| `claude-3-7-sonnet-20250219` | 200K | Extended thinking, tools | Latest Sonnet |
| `claude-3-5-sonnet-20241022` | 200K | Tools, vision | Production workhorse |
| `claude-3-5-haiku-20241022` | 200K | Tools, vision | Fast, cost-effective |
| `claude-3-opus-20240229` | 200K | Tools, vision | Legacy flagship |
| `claude-3-sonnet-20240229` | 200K | Tools, vision | Legacy balanced |
| `claude-3-haiku-20240307` | 200K | Tools, vision | Legacy fast |

---

## Current Implementation Status

> **Last Updated:** December 2025

| Feature | Status | Notes |
|---------|--------|-------|
| Text Generation | ✅ Implemented | `GetClaudeMessageAsync` |
| Streaming | ✅ Implemented | `StreamClaudeMessageAsync` |
| Chat/Multi-turn | ✅ Implemented | Multiple `Message` objects |
| System Messages | ✅ Implemented | `MessageParameters.System` |
| Multimodal (Images) | ✅ Implemented | `ImageContent` with `ImageSource` |
| Function Calling | ✅ Implemented | Native `Tool` and `ToolUseContent` in AgentService |
| Health Checks | ✅ Implemented | Provider availability |
| Telemetry | ✅ Implemented | OpenTelemetry integration |
| Extended Thinking | ✅ Implemented | Native `ThinkingParameters` with `BudgetTokens` |
| Streaming with Tool Use | ✅ Implemented | Stream outputs collected and reconstructed via `Message(outputs)` |
| Prompt Caching | ✅ Implemented | `CacheControl.Ephemeral` on system messages |
| Computer Use | ❌ Not Started | Desktop automation (low priority) |
| PDF Support | ✅ Implemented | `DocumentContent` with `DocumentSource` |
| Citations | ✅ Implemented | `Citation` model with cache usage tracking |
| Batch API | ❌ Not Started | Bulk processing (low priority) |
| Structured Output | ✅ Implemented | Tool forcing via unified service |

### Current Implementation Details

#### ✅ Fully Implemented

- **Chat Completion**: `client.Messages.GetClaudeMessageAsync` with temperature, max tokens
- **Streaming**: `client.Messages.StreamClaudeMessageAsync` with first-token latency tracking
- **Multimodal Images**: `ImageContent` with `ImageSource` containing base64 data
- **System Messages**: `MessageParameters.System` with `SystemMessage` list
- **Function Calling**: Native tool calling in `AgentService.ProcessAnthropicStreamAsync`:
  - `Tool` definitions with JSON schema
  - `ToolUseContent` parsing from responses
  - `ToolResultContent` for returning results
  - Parallel tool execution
- **Extended Thinking**: Native `ThinkingParameters` API:
  - Configurable token budget (`Thinking.DefaultBudget`, `Thinking.MaxBudget`)
  - Model capability detection (`IsThinkingCapableModel`, `IsAnthropicThinkingCapableModel`)
  - `ThinkingContent` parsing from responses
  - Streaming thinking deltas via `Delta.Thinking`
  - Fallback to XML `<thinking>` tag parsing for non-thinking models
- **Streaming with Tools**: Full streaming support:
  - Streams text and thinking in real-time
  - Collects all `MessageResponse` outputs during streaming
  - Reconstructs full message via `new Message(outputs)` to extract tool calls
  - Extracts `ToolUseContent` from reconstructed message
- **Prompt Caching**: `PromptCacheType.AutomaticToolsAndSystem`:
  - Configurable minimum content tokens
  - Cache usage tracking (`CacheUsageStats`)
  - Telemetry tags for cache metrics
- **PDF Support**: `DocumentContent` with `DocumentSource`:
  - `MessageDocument` class for PDF attachments
  - Base64 encoding support
- **Citations**: `Citation` model for source attribution:
  - Document references with page numbers
  - Text snippets with character ranges

#### Configuration Classes

- `AnthropicFeaturesConfig`: Feature flags for function calling, thinking, caching, citations, PDF
- `AnthropicThinkingConfig`: Extended thinking settings (budget, include in response)
- `AnthropicCachingConfig`: Prompt caching settings (enabled, min tokens)

---

## Feature Implementation Plan

### 1. Function Calling (Tools)

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Location:** `AgentService.cs`, `ClaudeProvider.cs`

#### Overview

Function calling allows Claude to invoke external functions/tools and use their results. This is fully implemented using the SDK's native tool support.

#### SDK Types

```csharp
using Anthropic.SDK.Messaging;

// Define a tool
var tool = new Tool(
    new Function(
        name: "search_notes",
        description: "Search through the user's notes",
        parameters: new Dictionary<string, object>
        {
            ["type"] = "object",
            ["properties"] = new Dictionary<string, object>
            {
                ["query"] = new Dictionary<string, object>
                {
                    ["type"] = "string",
                    ["description"] = "Search query"
                }
            },
            ["required"] = new[] { "query" }
        }
    )
);

// Add to parameters
var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-3-5-sonnet-20241022",
    MaxTokens = 4096,
    Tools = new List<Tool> { tool }
};

// Handle tool use in response
var response = await client.Messages.GetClaudeMessageAsync(parameters);

foreach (var content in response.Content)
{
    if (content is ToolUseContent toolUse)
    {
        // Execute the tool
        var result = await ExecuteToolAsync(toolUse.Name, toolUse.Input);
        
        // Add tool result
        messages.Add(new Message
        {
            Role = RoleType.User,
            Content = new List<ContentBase>
            {
                new ToolResultContent
                {
                    ToolUseId = toolUse.Id,
                    Content = result
                }
            }
        });
    }
}
```

#### Current Implementation in AgentService

The `StreamAnthropicNativeAsync` method handles Claude tool calling:

1. **Tool Registration**: Builds `Tool` list from `NotesPlugin` using reflection
2. **Tool Detection**: Parses `ToolUseContent` from responses
3. **Parallel Execution**: Executes multiple tools concurrently
4. **Result Continuation**: Sends `ToolResultContent` back to Claude

#### Files Implemented

| File | Status |
|------|--------|
| `Services/Agents/AgentService.cs` | ✅ Done |
| `Services/AI/Providers/ClaudeProvider.cs` | ✅ Done |

---

### 2. Extended Thinking

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Use Claude's built-in extended thinking capability

#### Overview

Extended thinking allows Claude to show its step-by-step reasoning process before delivering the final answer. This is especially useful for complex problems requiring multi-step reasoning.

#### SDK Usage

```csharp
var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-sonnet-4-20250514", // Supports extended thinking
    MaxTokens = 16000,
    Thinking = new ThinkingParameters
    {
        Type = "enabled",
        BudgetTokens = 10000 // Max tokens for thinking
    }
};

var response = await client.Messages.GetClaudeMessageAsync(parameters);

// Response includes thinking blocks
foreach (var content in response.Content)
{
    if (content is ThinkingContent thinking)
    {
        Console.WriteLine($"[Thinking] {thinking.Thinking}");
    }
    else if (content is TextContent text)
    {
        Console.WriteLine($"[Response] {text.Text}");
    }
}
```

#### Streaming with Extended Thinking

```csharp
await foreach (var streamEvent in client.Messages.StreamClaudeMessageAsync(parameters))
{
    if (streamEvent.ContentBlock?.Type == "thinking")
    {
        // Thinking block started
        Console.WriteLine("[Thinking started]");
    }
    else if (streamEvent.Delta?.Thinking != null)
    {
        // Thinking content delta
        Console.Write(streamEvent.Delta.Thinking);
    }
    else if (streamEvent.Delta?.Text != null)
    {
        // Response text delta
        Console.Write(streamEvent.Delta.Text);
    }
}
```

#### Implementation Steps

1. **Add `EnableExtendedThinking` option to settings:**
   ```csharp
   public class AnthropicThinkingConfig
   {
       public bool Enabled { get; set; } = false;
       public int DefaultBudget { get; set; } = 10000;
       public int MaxBudget { get; set; } = 50000;
       public bool IncludeThinkingInResponse { get; set; } = true;
   }
   ```

2. **Update `ClaudeProvider` to support thinking:**
   ```csharp
   if (settings.EnableThinking)
   {
       parameters.Thinking = new ThinkingParameters
       {
           Type = "enabled",
           BudgetTokens = settings.ThinkingBudget ?? _settings.Thinking.DefaultBudget
       };
   }
   ```

3. **Parse thinking blocks in response:**
   ```csharp
   foreach (var content in response.Content)
   {
       if (content is ThinkingContent thinking)
       {
           aiResponse.ThinkingProcess = thinking.Thinking;
       }
   }
   ```

4. **Update `AIResponse` model:**
   ```csharp
   public class AIResponse
   {
       // ... existing properties
       public string? ThinkingProcess { get; set; }
   }
   ```

5. **Stream thinking events in AgentService:**
   ```csharp
   yield return new AgentStreamEvent
   {
       Type = AgentEventType.Thinking,
       Content = thinkingContent
   };
   ```

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Configuration/AIProvidersSettings.cs` | Add `AnthropicThinkingConfig` | ⏳ Pending |
| `Services/AI/Providers/ClaudeProvider.cs` | Add thinking support | ⏳ Pending |
| `Services/AI/Models/AIResponse.cs` | Add `ThinkingProcess` | ✅ Done |
| `Services/Agents/AgentService.cs` | Parse native thinking | ⏳ Pending |
| `DTOs/Requests/SendMessageRequest.cs` | Add `EnableThinking`, `ThinkingBudget` | ⏳ Pending |
| `frontend/src/types/chat.ts` | Add thinking types | ⏳ Pending |

---

### 3. Prompt Caching

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Cache system prompts and context for cost/latency reduction

#### Overview

Prompt caching allows caching frequently used context (system prompts, long documents) between API calls, reducing costs by up to 90% and latency by up to 85%.

#### SDK Usage

```csharp
// Mark content for caching with cache_control
var systemMessages = new List<SystemMessage>
{
    new SystemMessage("You are a helpful assistant."),
    new SystemMessage(veryLongContext)
    {
        CacheControl = new CacheControl { Type = "ephemeral" }
    }
};

var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-3-5-sonnet-20241022",
    MaxTokens = 4096,
    System = systemMessages
};

var response = await client.Messages.GetClaudeMessageAsync(parameters);

// Check cache usage in response
Console.WriteLine($"Cache creation tokens: {response.Usage.CacheCreationInputTokens}");
Console.WriteLine($"Cache read tokens: {response.Usage.CacheReadInputTokens}");
```

#### Cache Control Types

| Type | Duration | Use Case |
|------|----------|----------|
| `ephemeral` | ~5 minutes | Session-based caching |

#### Implementation Steps

1. **Create `IClaudeCacheService` interface:**
   ```csharp
   public interface IClaudeCacheService
   {
       Task<CacheableContent> CreateCacheableContentAsync(
           string content,
           string userId,
           CancellationToken cancellationToken = default);
       
       Task<bool> IsContentCachedAsync(
           string contentHash,
           CancellationToken cancellationToken = default);
   }
   ```

2. **Add cache control to system messages:**
   ```csharp
   public class ClaudeCacheService : IClaudeCacheService
   {
       public SystemMessage CreateCachedSystemMessage(string content)
       {
           return new SystemMessage(content)
           {
               CacheControl = new CacheControl { Type = "ephemeral" }
           };
       }
   }
   ```

3. **Track cache usage in telemetry:**
   ```csharp
   activity?.SetTag("ai.cache.creation_tokens", response.Usage.CacheCreationInputTokens);
   activity?.SetTag("ai.cache.read_tokens", response.Usage.CacheReadInputTokens);
   ```

4. **Add cache analytics to stats:**
   ```csharp
   public class AnthropicCacheStats
   {
       public int TotalCacheCreationTokens { get; set; }
       public int TotalCacheReadTokens { get; set; }
       public decimal CacheSavingsPercent { get; set; }
   }
   ```

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Caching/IClaudeCacheService.cs` | Create | ❌ Not Started |
| `Services/AI/Caching/ClaudeCacheService.cs` | Create | ❌ Not Started |
| `Services/AI/Providers/ClaudeProvider.cs` | Add cache support | ❌ Not Started |
| `Configuration/AIProvidersSettings.cs` | Add `AnthropicCachingConfig` | ❌ Not Started |
| `API/Extensions/ServiceCollectionExtensions.cs` | Register service | ❌ Not Started |

---

### 4. Streaming with Tool Use

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Enable streaming even when tools are enabled

#### Overview

Currently, the implementation switches to non-streaming mode when tools are enabled for reliability. The goal is to enable streaming while still handling tool calls correctly.

#### Current Implementation

```csharp
// Current workaround - disable streaming for tools
var useStreaming = tools.Count == 0;

if (useStreaming)
{
    // Stream text tokens
    await foreach (var streamEvent in client.Messages.StreamClaudeMessageAsync(parameters))
    {
        // Handle text deltas
    }
}
else
{
    // Non-streaming for tool handling
    parameters.Stream = false;
    var response = await client.Messages.GetClaudeMessageAsync(parameters);
}
```

#### Target Implementation

```csharp
// Stream with tool detection
var accumulatedToolUse = new Dictionary<int, ToolUseBuilder>();

await foreach (var streamEvent in client.Messages.StreamClaudeMessageAsync(parameters))
{
    // Handle content block starts
    if (streamEvent.ContentBlock != null)
    {
        if (streamEvent.ContentBlock.Type == "tool_use")
        {
            var index = streamEvent.Index ?? 0;
            accumulatedToolUse[index] = new ToolUseBuilder
            {
                Id = streamEvent.ContentBlock.Id,
                Name = streamEvent.ContentBlock.Name
            };
        }
    }
    
    // Handle text deltas - stream immediately
    if (streamEvent.Delta?.Text != null)
    {
        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Token,
            Content = streamEvent.Delta.Text
        };
    }
    
    // Handle tool input deltas - accumulate
    if (streamEvent.Delta?.PartialJson != null && streamEvent.Index.HasValue)
    {
        if (accumulatedToolUse.TryGetValue(streamEvent.Index.Value, out var builder))
        {
            builder.AppendInput(streamEvent.Delta.PartialJson);
        }
    }
    
    // Handle message end
    if (streamEvent.Type == "message_delta" && streamEvent.Delta?.StopReason == "tool_use")
    {
        // Execute accumulated tool calls
        foreach (var (index, toolBuilder) in accumulatedToolUse)
        {
            var toolCall = toolBuilder.Build();
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.ToolCallStart,
                Content = toolCall.Name
            };
            
            var result = await ExecuteToolAsync(toolCall);
            
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.ToolCallEnd,
                Content = result
            };
        }
    }
}
```

#### Files to Modify

| File | Action | Status |
|------|--------|--------|
| `Services/Agents/AgentService.cs` | Implement streaming with tools | ⏳ Pending |
| `Services/AI/Models/ToolUseBuilder.cs` | Create accumulator class | ⏳ Pending |

---

### 5. Computer Use

**Priority:** LOW  
**Complexity:** High  
**Status:** ❌ Not Started  
**Target:** Enable Claude to control computer UI

#### Overview

Computer use allows Claude to interact with computer interfaces by taking screenshots, moving the mouse, clicking, and typing.

#### SDK Usage

```csharp
// Define computer use tool
var computerTool = new Tool
{
    Type = "computer_20241022",
    Name = "computer",
    DisplayWidthPx = 1920,
    DisplayHeightPx = 1080,
    DisplayNumber = 1
};

var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-sonnet-4-20250514",
    MaxTokens = 4096,
    Tools = new List<Tool> { computerTool },
    AnthropicBeta = new[] { "computer-use-2024-10-22" }
};

// Handle computer use requests
var response = await client.Messages.GetClaudeMessageAsync(parameters);

foreach (var content in response.Content)
{
    if (content is ToolUseContent toolUse && toolUse.Name == "computer")
    {
        var action = toolUse.Input["action"]?.ToString();
        
        switch (action)
        {
            case "screenshot":
                var screenshot = TakeScreenshot();
                // Return as base64 image
                break;
            case "mouse_move":
                var x = toolUse.Input["coordinate"][0].GetInt32();
                var y = toolUse.Input["coordinate"][1].GetInt32();
                MoveMouse(x, y);
                break;
            case "left_click":
                LeftClick();
                break;
            case "type":
                var text = toolUse.Input["text"]?.ToString();
                TypeText(text);
                break;
        }
    }
}
```

#### Implementation Considerations

- **Security**: Requires sandboxed environment
- **Platform**: Windows-specific in demo app
- **Use Cases**: Automated testing, accessibility, UI automation
- **Tauri Integration**: Could integrate with desktop app

#### Files to Create

| File | Action | Status |
|------|--------|--------|
| `Services/AI/ComputerUse/IComputerUseService.cs` | Create interface | ❌ Not Started |
| `Services/AI/ComputerUse/ComputerUseService.cs` | Implement actions | ❌ Not Started |
| `Services/AI/ComputerUse/ScreenshotService.cs` | Screenshot capture | ❌ Not Started |

---

### 6. Vision (Image Understanding)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Already working, document enhancements

#### Overview

Claude can understand images sent in messages, supporting various formats and use cases.

#### Current Implementation

```csharp
// In ClaudeProvider.ConvertToClaudeMessage
private static Message ConvertToClaudeMessage(Models.ChatMessage message)
{
    if (message.Images != null && message.Images.Count > 0)
    {
        var contentBlocks = new List<ContentBase>();
        
        // Add images first (Claude prefers images before text)
        foreach (var image in message.Images)
        {
            var imageContent = new ImageContent
            {
                Source = new ImageSource
                {
                    MediaType = image.MediaType,
                    Data = image.Base64Data
                }
            };
            contentBlocks.Add(imageContent);
        }
        
        // Add text content after images
        if (!string.IsNullOrEmpty(message.Content))
        {
            contentBlocks.Add(new TextContent { Text = message.Content });
        }
        
        return new Message { Role = role, Content = contentBlocks };
    }
    
    return new Message(role, message.Content);
}
```

#### Supported Formats

| Format | MIME Type | Max Size |
|--------|-----------|----------|
| JPEG | `image/jpeg` | 20MB |
| PNG | `image/png` | 20MB |
| GIF | `image/gif` | 20MB |
| WebP | `image/webp` | 20MB |

#### Enhancements

1. **Image URL support** - Direct URLs instead of base64
2. **Multiple images per message** - Already supported
3. **Image quality hints** - Optimize for speed vs quality

---

### 7. PDF Support

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Process PDF documents directly

#### Overview

Claude can process PDF documents, extracting text and understanding visual elements like charts and tables.

#### SDK Usage

```csharp
// PDF as document content
var pdfBytes = await File.ReadAllBytesAsync("document.pdf");
var pdfBase64 = Convert.ToBase64String(pdfBytes);

var documentContent = new DocumentContent
{
    Source = new DocumentSource
    {
        Type = "base64",
        MediaType = "application/pdf",
        Data = pdfBase64
    }
};

var messages = new List<Message>
{
    new Message
    {
        Role = RoleType.User,
        Content = new List<ContentBase>
        {
            documentContent,
            new TextContent { Text = "Summarize this document" }
        }
    }
};
```

#### Use Cases

1. **Document Q&A** - Ask questions about PDF content
2. **Data Extraction** - Extract tables and data
3. **Summarization** - Generate summaries
4. **RAG Enhancement** - Use PDFs as context

#### Implementation Steps

1. **Add PDF content type support:**
   ```csharp
   public class MessageAttachment
   {
       public string Type { get; set; } // "image", "pdf"
       public string MediaType { get; set; }
       public string Base64Data { get; set; }
   }
   ```

2. **Update message conversion:**
   ```csharp
   if (attachment.Type == "pdf")
   {
       contentBlocks.Add(new DocumentContent
       {
           Source = new DocumentSource
           {
               Type = "base64",
               MediaType = "application/pdf",
               Data = attachment.Base64Data
           }
       });
   }
   ```

3. **Frontend: Add PDF upload support**

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Providers/ClaudeProvider.cs` | Add PDF content support | ❌ Not Started |
| `DTOs/MessageAttachment.cs` | Create DTO | ❌ Not Started |
| `frontend/src/types/chat.ts` | Add PDF attachment types | ❌ Not Started |
| `frontend/src/features/chat/components/input/` | Add PDF upload | ❌ Not Started |

---

### 8. Citations

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Ground responses in source documents

#### Overview

Citations allow Claude to reference specific passages from source documents, providing verifiable attribution for its responses.

#### SDK Usage

```csharp
// Enable citations in request
var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-3-5-sonnet-20241022",
    MaxTokens = 4096,
    // Provide source documents with IDs
    System = new List<SystemMessage>
    {
        new SystemMessage
        {
            Text = "Answer based on the provided documents. Always cite your sources.",
            CacheControl = new CacheControl { Type = "ephemeral" }
        }
    }
};

// Documents should be marked with IDs for citation
var documentMessage = new Message
{
    Role = RoleType.User,
    Content = new List<ContentBase>
    {
        new DocumentContent
        {
            Source = new DocumentSource
            {
                Type = "base64",
                MediaType = "application/pdf",
                Data = pdfBase64
            },
            // Enable citations for this document
            Citations = new CitationSettings { Enabled = true }
        },
        new TextContent { Text = "What does this document say about X?" }
    }
};

// Response includes citations
foreach (var content in response.Content)
{
    if (content is TextContent textContent)
    {
        // Text may include citation markers
        Console.WriteLine(textContent.Text);
        
        // Citations available in metadata
        if (textContent.Citations != null)
        {
            foreach (var citation in textContent.Citations)
            {
                Console.WriteLine($"[{citation.DocumentId}] Page {citation.Page}: {citation.Text}");
            }
        }
    }
}
```

#### Implementation Steps

1. **Add citation models:**
   ```csharp
   public class Citation
   {
       public string DocumentId { get; set; }
       public int? Page { get; set; }
       public string Text { get; set; }
       public int StartIndex { get; set; }
       public int EndIndex { get; set; }
   }
   ```

2. **Update response models:**
   ```csharp
   public class AIResponse
   {
       // ... existing properties
       public List<Citation>? Citations { get; set; }
   }
   ```

3. **Parse citations from response**
4. **Display citations in frontend**

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Models/Citation.cs` | Create model | ❌ Not Started |
| `Services/AI/Providers/ClaudeProvider.cs` | Parse citations | ❌ Not Started |
| `frontend/src/types/chat.ts` | Add citation types | ❌ Not Started |
| `frontend/src/features/chat/components/Citations.tsx` | Display UI | ❌ Not Started |

---

### 9. Batch API

**Priority:** LOW  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Bulk processing at 50% cost reduction

#### Overview

The Batch API enables processing large volumes of requests asynchronously with 50% cost savings.

#### SDK Usage

```csharp
// Create batch request
var batchRequest = new BatchRequest
{
    Requests = new List<BatchRequestItem>
    {
        new BatchRequestItem
        {
            CustomId = "request-1",
            Params = new MessageParameters
            {
                Model = "claude-3-5-sonnet-20241022",
                MaxTokens = 1024,
                Messages = new List<Message>
                {
                    new Message(RoleType.User, "Summarize: ...")
                }
            }
        },
        // ... more requests
    }
};

// Submit batch
var batch = await client.Batches.CreateBatchAsync(batchRequest);
Console.WriteLine($"Batch ID: {batch.Id}, Status: {batch.ProcessingStatus}");

// Poll for completion
while (batch.ProcessingStatus != "ended")
{
    await Task.Delay(TimeSpan.FromSeconds(30));
    batch = await client.Batches.GetBatchAsync(batch.Id);
}

// Get results
var results = await client.Batches.GetBatchResultsAsync(batch.Id);
foreach (var result in results)
{
    Console.WriteLine($"{result.CustomId}: {result.Result.Content[0].Text}");
}
```

#### Use Cases

1. **Bulk note analysis** - Analyze all notes overnight
2. **Embedding generation** - Generate summaries for RAG
3. **Content moderation** - Check large content libraries
4. **Data extraction** - Process document batches

#### Implementation Steps

1. **Create batch service:**
   ```csharp
   public interface IClaudeBatchService
   {
       Task<string> CreateBatchAsync(
           IEnumerable<BatchItem> items,
           CancellationToken cancellationToken = default);
       
       Task<BatchStatus> GetBatchStatusAsync(
           string batchId,
           CancellationToken cancellationToken = default);
       
       Task<IEnumerable<BatchResult>> GetBatchResultsAsync(
           string batchId,
           CancellationToken cancellationToken = default);
   }
   ```

2. **Add batch job tracking table**
3. **Background worker for polling**
4. **API endpoints for batch management**

#### Files to Create

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Batch/IClaudeBatchService.cs` | Create interface | ❌ Not Started |
| `Services/AI/Batch/ClaudeBatchService.cs` | Implement | ❌ Not Started |
| `Controllers/BatchController.cs` | API endpoints | ❌ Not Started |
| `database/xx_claude_batches.sql` | Tracking table | ❌ Not Started |

---

### 10. Structured Output (JSON Mode)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Guaranteed JSON output

> **Implementation Note:** Structured output is implemented via the unified `IStructuredOutputService` in `Services/AI/StructuredOutput/`. Uses tool forcing with `ToolChoice.Type = Tool` and `ToolChoice.Name = "structured_output"` to guarantee JSON output. Schema is built from C# types using reflection via `JsonSchemaBuilder` and converted via `ClaudeSchemaAdapter`.

#### Overview

Force Claude to return responses in a specific JSON format using tool definitions.

#### SDK Usage

```csharp
// Use a tool definition to enforce JSON structure
var jsonTool = new Tool(
    new Function(
        name: "output",
        description: "Output the result in the specified format",
        parameters: new Dictionary<string, object>
        {
            ["type"] = "object",
            ["properties"] = new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object>
                {
                    ["type"] = "string",
                    ["description"] = "Note title"
                },
                ["summary"] = new Dictionary<string, object>
                {
                    ["type"] = "string",
                    ["description"] = "Brief summary"
                },
                ["tags"] = new Dictionary<string, object>
                {
                    ["type"] = "array",
                    ["items"] = new Dictionary<string, object>
                    {
                        ["type"] = "string"
                    }
                },
                ["sentiment"] = new Dictionary<string, object>
                {
                    ["type"] = "string",
                    ["enum"] = new[] { "positive", "neutral", "negative" }
                }
            },
            ["required"] = new[] { "title", "summary", "tags", "sentiment" }
        }
    )
);

var parameters = new MessageParameters
{
    Messages = messages,
    Model = "claude-3-5-sonnet-20241022",
    MaxTokens = 4096,
    Tools = new List<Tool> { jsonTool },
    ToolChoice = new ToolChoice { Type = "tool", Name = "output" }
};

var response = await client.Messages.GetClaudeMessageAsync(parameters);

// Extract structured output
var toolUse = response.Content.OfType<ToolUseContent>().First();
var result = JsonSerializer.Deserialize<NoteAnalysis>(toolUse.Input.ToJsonString());
```

#### Implementation

```csharp
public interface IClaudeStructuredOutputService
{
    Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class;
}

public class ClaudeStructuredOutputService : IClaudeStructuredOutputService
{
    public async Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class
    {
        var schema = ClaudeSchemaBuilder.FromType<T>();
        var tool = new Tool(new Function("output", "Return structured output", schema));
        
        var parameters = new MessageParameters
        {
            Messages = new List<Message>
            {
                new Message(RoleType.User, prompt)
            },
            Model = "claude-3-5-sonnet-20241022",
            MaxTokens = 4096,
            Tools = new List<Tool> { tool },
            ToolChoice = new ToolChoice { Type = "tool", Name = "output" }
        };
        
        if (!string.IsNullOrEmpty(systemPrompt))
        {
            parameters.System = new List<SystemMessage>
            {
                new SystemMessage(systemPrompt)
            };
        }
        
        var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
        var toolUse = response.Content.OfType<ToolUseContent>().FirstOrDefault();
        
        return toolUse != null
            ? JsonSerializer.Deserialize<T>(toolUse.Input.ToJsonString())
            : null;
    }
}
```

#### Files to Create

| File | Action | Status |
|------|--------|--------|
| `Services/AI/StructuredOutput/ClaudeSchemaBuilder.cs` | Create | ❌ Not Started |
| `Services/AI/StructuredOutput/IClaudeStructuredOutputService.cs` | Create | ❌ Not Started |
| `Services/AI/StructuredOutput/ClaudeStructuredOutputService.cs` | Create | ❌ Not Started |

---

## API Endpoints to Add

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/claude/batch` | POST | Create batch job | Low |
| `/api/claude/batch/{id}` | GET | Get batch status | Low |
| `/api/claude/batch/{id}/results` | GET | Get batch results | Low |

---

## Database Schema Changes

> ✅ **IMPLEMENTED**: All Claude database tables have been created in `database/24_claude_features.sql` and applied to both Docker and Desktop PostgreSQL instances.

### Claude Cache Analytics

```sql
-- Track prompt caching statistics
CREATE TABLE claude_cache_stats (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128),
    cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    model VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_claude_cache_user_id ON claude_cache_stats(user_id);
CREATE INDEX idx_claude_cache_created ON claude_cache_stats(created_at);
```

### Claude Batch Jobs

```sql
-- Track batch processing jobs
CREATE TABLE claude_batch_jobs (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    batch_id VARCHAR(256) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    total_requests INTEGER NOT NULL,
    completed_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    results_json JSONB
);

CREATE INDEX idx_claude_batch_user_id ON claude_batch_jobs(user_id);
CREATE INDEX idx_claude_batch_status ON claude_batch_jobs(status);
```

### Claude Citations

```sql
-- Store citations for reference
CREATE TABLE claude_citations (
    id VARCHAR(128) PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    document_id VARCHAR(256),
    page_number INTEGER,
    cited_text TEXT NOT NULL,
    start_index INTEGER,
    end_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_claude_citations_message_id ON claude_citations(message_id);
```

---

## Frontend Integration

### Type Updates (frontend/src/types/chat.ts)

```typescript
// Extended thinking types
export interface ThinkingConfig {
  enabled: boolean;
  budgetTokens: number;
}

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
}

// Citation types
export interface Citation {
  documentId?: string;
  page?: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

// Batch types
export interface BatchJob {
  id: string;
  batchId: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'failed';
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  createdAt: string;
  completedAt?: string;
}

export interface BatchResult {
  customId: string;
  success: boolean;
  content?: string;
  error?: string;
}

// Cache stats
export interface ClaudeCacheStats {
  cacheCreationTokens: number;
  cacheReadTokens: number;
  savingsPercent: number;
}

// Update SendMessageRequest
export interface SendMessageRequest {
  // ... existing fields
  
  // Claude-specific options
  enableThinking?: boolean;
  thinkingBudget?: number;
  enableCaching?: boolean;
  enableCitations?: boolean;
}

// Update ChatMessage
export interface ChatMessage {
  // ... existing fields
  
  thinkingProcess?: string;
  citations?: Citation[];
  cacheStats?: ClaudeCacheStats;
}

// Streaming events
export type ClaudeStreamEventType = 
  | 'text'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'citation'
  | 'error'
  | 'done';
```

### UI Components to Create

| Component | Purpose | Priority |
|-----------|---------|----------|
| `ThinkingDisplay` | Show thinking process | High |
| `CitationsPanel` | Display citations | Medium |
| `CacheStatsDisplay` | Show cache savings | Medium |
| `BatchJobManager` | Manage batch jobs | Low |
| `PDFUploader` | Upload PDF documents | Medium |

---

## Configuration Updates

### appsettings.json

```json
{
  "AIProviders": {
    "Anthropic": {
      "Enabled": true,
      "ApiKey": "",
      "BaseUrl": "https://api.anthropic.com/v1",
      "DefaultModel": "claude-3-5-sonnet-20241022",
      "MaxTokens": 8192,
      "Temperature": 0.7,
      "TimeoutSeconds": 120,
      "Version": "2023-06-01",
      
      "Features": {
        "EnableFunctionCalling": true,
        "EnableExtendedThinking": false,
        "EnablePromptCaching": true,
        "EnableCitations": false,
        "EnableComputerUse": false
      },
      
      "Thinking": {
        "Enabled": false,
        "DefaultBudget": 10000,
        "MaxBudget": 50000,
        "IncludeThinkingInResponse": true
      },
      
      "Caching": {
        "Enabled": true,
        "MinContentTokens": 1024
      },
      
      "Batch": {
        "Enabled": false,
        "MaxRequestsPerBatch": 10000,
        "PollIntervalSeconds": 30
      }
    }
  }
}
```

### Configuration Classes

```csharp
public class AnthropicSettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.anthropic.com/v1";
    public string DefaultModel { get; set; } = "claude-3-5-sonnet-20241022";
    public int MaxTokens { get; set; } = 8192;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    public string Version { get; set; } = "2023-06-01";
    
    // Feature flags
    public AnthropicFeaturesConfig Features { get; set; } = new();
    
    // Extended thinking
    public AnthropicThinkingConfig Thinking { get; set; } = new();
    
    // Prompt caching
    public AnthropicCachingConfig Caching { get; set; } = new();
    
    // Batch processing
    public AnthropicBatchConfig Batch { get; set; } = new();
}

public class AnthropicFeaturesConfig
{
    public bool EnableFunctionCalling { get; set; } = true;
    public bool EnableExtendedThinking { get; set; } = false;
    public bool EnablePromptCaching { get; set; } = true;
    public bool EnableCitations { get; set; } = false;
    public bool EnableComputerUse { get; set; } = false;
}

public class AnthropicThinkingConfig
{
    public bool Enabled { get; set; } = false;
    public int DefaultBudget { get; set; } = 10000;
    public int MaxBudget { get; set; } = 50000;
    public bool IncludeThinkingInResponse { get; set; } = true;
}

public class AnthropicCachingConfig
{
    public bool Enabled { get; set; } = true;
    public int MinContentTokens { get; set; } = 1024;
}

public class AnthropicBatchConfig
{
    public bool Enabled { get; set; } = false;
    public int MaxRequestsPerBatch { get; set; } = 10000;
    public int PollIntervalSeconds { get; set; } = 30;
}
```

---

## Testing Strategy

### Unit Tests

1. **Message conversion tests**
   - Text messages
   - Image messages
   - PDF documents
   - Tool use content

2. **Schema generation tests**
   - Primitive types
   - Complex objects
   - Arrays and lists

3. **Response parsing tests**
   - Text content
   - Thinking content
   - Tool use content
   - Citations

### Integration Tests

1. **End-to-end tool calling flow**
2. **Extended thinking with budget**
3. **Prompt caching with token tracking**
4. **Batch job lifecycle**

### Manual Testing

1. Test each feature with real API
2. Verify streaming behavior
3. Check error handling
4. Performance testing for caching

---

## Implementation Priority

### Phase 1 - High Priority (Weeks 1-2)

1. **Extended Thinking (Native)** - Replace tag parsing with native API
2. **Streaming with Tool Use** - Enable streaming even with tools
3. **Prompt Caching** - Reduce costs and latency
4. ~~**Structured Output**~~ - ✅ Implemented via unified service

### Phase 2 - Medium Priority (Weeks 3-4)

5. **PDF Support** - Document processing
6. **Citations** - Source attribution
7. **Frontend Types** - All Claude-specific types

### Phase 3 - Lower Priority (Weeks 5-6)

8. **Batch API** - Bulk processing
9. **Computer Use** - Desktop automation (Tauri integration)
10. **Advanced Analytics** - Cache and usage stats

---

## Known Issues & Limitations

### SDK Considerations

1. **Unofficial SDK** - Anthropic.SDK is community-maintained
2. **API Version** - Uses `2023-06-01` version header
3. **Beta Features** - Computer use requires beta header

### Model-Specific Limitations

| Model | Limitation |
|-------|------------|
| claude-3-haiku | No extended thinking |
| claude-3-* legacy | Older feature set |
| Computer use | Requires specific beta |

### Workarounds Applied

1. **Streaming with tools** - Currently disabled, needs implementation
2. **Extended thinking** - Using XML tag parsing as fallback

---

## References

- [Anthropic.SDK GitHub](https://github.com/tghamm/Anthropic.SDK)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Claude Messages API](https://docs.anthropic.com/en/api/messages)
- [Extended Thinking Guide](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Prompt Caching Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Computer Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/computer-use)
- [Citations Guide](https://docs.anthropic.com/en/docs/build-with-claude/citations)
- [Batch API Guide](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)
- [NuGet Package](https://www.nuget.org/packages/Anthropic.SDK)
