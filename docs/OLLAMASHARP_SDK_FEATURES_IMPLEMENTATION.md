# OllamaSharp SDK - Full Features Implementation Guide

This document provides a comprehensive implementation plan for leveraging all features available in the OllamaSharp SDK (`OllamaSharp` v5.4.12+).

---

## 📋 Implementation Progress Summary

> **Last Updated:** December 7, 2025

### ✅ Completed Features

| Feature | Implementation |
|---------|----------------|
| **Native Function Calling** | `StreamWithToolsAsync`, `ProcessOllamaStreamAsync`, function registry |
| **Embeddings (SDK)** | `EmbedAsync` with HTTP fallback |
| **Stateful Chat** | `OllamaChatSession` wrapping OllamaSharp's `Chat` |
| **Model Management** | Show, Copy, Create, List - all implemented |
| **Structured Output** | Via unified `IStructuredOutputService` |
| **Configuration** | `OllamaFeaturesConfig`, `OllamaFunctionCallingConfig` |

### ⏳ Pending Features

| Feature | Notes |
|---------|-------|
| **Microsoft.Extensions.AI** | IChatClient, IEmbeddingGenerator interfaces |
| **Cloud Models** | Ollama Turbo with API key auth |
| **Native AOT** | JsonSerializerContext for improved perf |

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Feature Implementation Plan](#feature-implementation-plan)
   - [1. Function Calling (Tools)](#1-function-calling-tools)
   - [2. Microsoft.Extensions.AI Integration](#2-microsoftextensionsai-integration)
   - [3. Native AOT Support](#3-native-aot-support)
   - [4. Cloud Models (Ollama Turbo)](#4-cloud-models-ollama-turbo)
   - [5. Embeddings (SDK-based)](#5-embeddings-sdk-based)
   - [6. Model Management](#6-model-management)
   - [7. Chat Class for Stateful Conversations](#7-chat-class-for-stateful-conversations)
   - [8. Vision (Multimodal)](#8-vision-multimodal)
   - [9. Structured Output (JSON Mode)](#9-structured-output-json-mode)
   - [10. Keep-Alive Configuration](#10-keep-alive-configuration)
4. [API Endpoints to Add](#api-endpoints-to-add)
5. [Database Schema Changes](#database-schema-changes)
6. [Frontend Integration](#frontend-integration)
7. [Configuration Updates](#configuration-updates)
8. [Model Reference](#model-reference)
9. [Testing Strategy](#testing-strategy)

---

## Overview

OllamaSharp provides .NET bindings for the [Ollama](https://ollama.ai) API, simplifying interactions with locally running LLMs. It's recommended by Microsoft and powers Semantic Kernel, .NET Aspire, and Microsoft.Extensions.AI integrations.

### SDK Information

| Property | Value |
|----------|-------|
| **Package** | `OllamaSharp` |
| **Version** | 5.4.12 |
| **NuGet** | https://www.nuget.org/packages/OllamaSharp |
| **Documentation** | https://github.com/awaescher/OllamaSharp |
| **GitHub** | https://github.com/awaescher/OllamaSharp |
| **Compatibility** | .NET Standard 2.0+, .NET 8/9/10 |

### Key Features

| Feature | Description |
|---------|-------------|
| **Ease of use** | Interact with Ollama in a few lines of code |
| **Reliability** | Powers Microsoft Semantic Kernel, .NET Aspire, Microsoft.Extensions.AI |
| **API Coverage** | Every Ollama API endpoint: chat, embeddings, models, pulling, creating |
| **Real-time Streaming** | Stream responses directly to applications |
| **Progress Reporting** | Real-time feedback on model pulling |
| **Tools Engine** | Sophisticated tool support with source generators |
| **Multi-modality** | Support for vision models |
| **Native AOT** | Opt-in support for improved performance |

### Key Namespaces

```csharp
using OllamaSharp;               // Main client: OllamaApiClient
using OllamaSharp.Models;        // Model types: GenerateRequest, Model
using OllamaSharp.Models.Chat;   // Chat types: ChatRequest, Message
```

### Client Organization

The SDK provides a unified client with specialized methods:

| Method/Property | Purpose |
|-----------------|---------|
| `GenerateAsync` | Text completion |
| `ChatAsync` | Chat completion with multi-turn |
| `EmbedAsync` | Generate embeddings |
| `ListLocalModelsAsync` | List installed models |
| `PullModelAsync` | Download models with progress |
| `DeleteModelAsync` | Remove models |
| `CopyModelAsync` | Copy/rename models |
| `ShowModelAsync` | Get model details |
| `CreateModelAsync` | Create custom models |
| `PushModelAsync` | Push models to registry |
| `IsRunningAsync` | Check if Ollama is running |
| `GetVersionAsync` | Get Ollama version |
| `Chat` | Stateful chat helper class |

---

## Current Implementation Status

> **Last Updated:** December 7, 2025

| Feature | Status | Notes |
|---------|--------|-------|
| Text Generation | ✅ Implemented | `GenerateAsync` with streaming |
| Streaming | ✅ Implemented | Real-time token streaming |
| Chat/Multi-turn | ✅ Implemented | `ChatAsync` with messages |
| System Messages | ✅ Implemented | Via message with role |
| Multimodal (Images) | ✅ Implemented | Base64 images array |
| Model Listing | ✅ Implemented | `ListLocalModelsAsync` + `ListModelsAsync` |
| Model Pulling | ✅ Implemented | With progress reporting |
| Model Deletion | ✅ Implemented | `DeleteModelAsync` |
| Model Details | ✅ Implemented | `ShowModelAsync` returns `OllamaModelDetails` |
| Model Copy | ✅ Implemented | `CopyModelAsync` with result |
| Model Create | ✅ Implemented | `CreateModelAsync` with streaming progress |
| Structured Output | ✅ Implemented | JSON mode + schema prompt via unified service |
| Health Checks | ✅ Implemented | Availability and model listing |
| Telemetry | ✅ Implemented | OpenTelemetry integration |
| Remote URL Support | ✅ Implemented | Per-request URL override |
| Function Calling | ✅ Implemented | Native OllamaSharp with `StreamWithToolsAsync` |
| Embeddings (SDK) | ✅ Implemented | `EmbedAsync` with HTTP fallback |
| Chat Class | ✅ Implemented | `OllamaChatSession` wrapping OllamaSharp's `Chat` |
| Microsoft.Extensions.AI | ⏳ Pending | IChatClient, IEmbeddingGenerator |
| Native AOT | ❌ Not Started | JsonSerializerContext support |
| Cloud Models | ❌ Not Started | Ollama Turbo with API key |
| Keep-Alive | ⏳ Partial | Configuration ready, not wired to requests |

### Current Implementation Details

#### ✅ Fully Implemented

- **Chat Completion**: `OllamaApiClient.ChatAsync` with temperature, max tokens
- **Streaming**: Real-time token streaming with first-token latency tracking
- **Multimodal Images**: Base64 image arrays for vision models (llava, llama3.2-vision)
- **Model Management**: Pull, delete, list, show, copy, create models with progress reporting
- **Health Checks**: Provider availability via `ListLocalModelsAsync`
- **Remote Support**: Per-request URL override with client caching
- **Telemetry**: OpenTelemetry integration for all operations
- **Native Function Calling**: `StreamWithToolsAsync` + `ProcessOllamaStreamAsync` in AgentService
- **Embeddings (SDK)**: `EmbedAsync` with automatic HTTP fallback
- **Stateful Chat**: `OllamaChatSession` wrapping OllamaSharp's `Chat` class
- **Configuration**: `OllamaFeaturesConfig` + `OllamaFunctionCallingConfig` in settings

#### ⚠️ Partial/Workaround Implementation

- **Token Counting**: Not available from current OllamaSharp version (returns 0)
- **Keep-Alive**: Configuration classes added but not yet wired to requests

#### 📁 Files Created/Modified

**Function Calling Infrastructure:**
- `Services/AI/FunctionCalling/IOllamaFunctionHandler.cs` - Interface for handlers
- `Services/AI/FunctionCalling/OllamaFunctionDeclarationBuilder.cs` - Builds `Tool` from `[KernelFunction]`
- `Services/AI/FunctionCalling/OllamaFunctionRegistry.cs` - Registry for handlers
- `Services/AI/FunctionCalling/Handlers/PluginBasedOllamaFunctionHandler.cs` - Reflection-based execution

**Chat Session:**
- `Services/AI/Chat/IOllamaChatSession.cs` - Stateful session interface
- `Services/AI/Chat/OllamaChatSession.cs` - Implementation + factory

**Models:**
- `Services/AI/Models/OllamaToolStreamEvent.cs` - Streaming event types
- `Services/AI/Models/OllamaModelDetails.cs` - Model details DTOs

**Modified:**
- `Services/AI/Providers/OllamaProvider.cs` - Added `StreamWithToolsAsync`, enhanced model management
- `Services/Agents/AgentService.cs` - Added `ProcessOllamaStreamAsync` for native tool calling
- `Services/Embeddings/Providers/OllamaEmbeddingProvider.cs` - SDK-based with HTTP fallback
- `Configuration/AIProvidersSettings.cs` - Added `OllamaFeaturesConfig`, `OllamaFunctionCallingConfig`
- `API/appsettings.json` - Added Ollama features configuration
- `API/Extensions/ServiceCollectionExtensions.cs` - Registered `IOllamaFunctionRegistry`

### Architecture Pattern

The implementation uses `OllamaApiClient` with client caching:

```csharp
// OllamaProvider.cs - Client caching pattern
private readonly ConcurrentDictionary<string, OllamaApiClient> _clientCache = new();

private OllamaApiClient? GetClientForUrl(string? overrideUrl)
{
    if (string.IsNullOrWhiteSpace(overrideUrl))
        return _defaultClient;
    
    return _clientCache.GetOrAdd(overrideUrl.TrimEnd('/'), url =>
        new OllamaApiClient(new Uri(url))
        {
            SelectedModel = _settings.DefaultModel
        });
}
```

#### Agent Integration

**Native OllamaSharp for function calling** (when capabilities enabled):

```csharp
// AgentService.cs - ProcessOllamaStreamAsync
var isOllama = request.Provider.Equals("ollama", StringComparison.OrdinalIgnoreCase);
var useNativeOllamaFunctionCalling = isOllama &&
    _ollamaProvider != null &&
    _settings.Ollama.Features.EnableFunctionCalling &&
    request.Capabilities?.Count > 0;

if (useNativeOllamaFunctionCalling)
{
    await foreach (var evt in ProcessOllamaStreamAsync(request, cancellationToken))
        yield return evt;
    yield break;
}
```

**Semantic Kernel fallback** (for general chat without tools):

```csharp
// AgentService.cs - BuildKernel (fallback path)
case "ollama":
    builder.AddOpenAIChatCompletion(
        modelId: model,
        apiKey: "ollama",
        endpoint: new Uri($"{effectiveOllamaUrl}/v1"));
```

---

## Feature Implementation Plan

### 1. Function Calling (Tools)

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Completed:** December 7, 2025

#### Overview

OllamaSharp v5.0+ includes sophisticated tool/function calling support with source generators. This enables Ollama models (llama3.1+, qwen2.5, mistral-nemo) to invoke external functions.

#### SDK Usage

```csharp
using OllamaSharp;
using OllamaSharp.Models.Chat;

var ollama = new OllamaApiClient("http://localhost:11434");
ollama.SelectedModel = "qwen3:4b";

// Define tools
var tools = new List<Tool>
{
    new Tool
    {
        Type = "function",
        Function = new Function
        {
            Name = "search_notes",
            Description = "Search user's notes by query",
            Parameters = new Parameters
            {
                Type = "object",
                Properties = new Dictionary<string, Property>
                {
                    ["query"] = new Property
                    {
                        Type = "string",
                        Description = "The search query"
                    },
                    ["limit"] = new Property
                    {
                        Type = "integer",
                        Description = "Maximum results to return"
                    }
                },
                Required = new List<string> { "query" }
            }
        }
    }
};

// Create chat request with tools
var request = new ChatRequest
{
    Model = "qwen3:4b",
    Messages = new List<Message>
    {
        new Message { Role = "user", Content = "Search my notes for AI" }
    },
    Tools = tools
};

// Handle tool calls in response
await foreach (var response in ollama.ChatAsync(request))
{
    if (response.Message?.ToolCalls != null)
    {
        foreach (var toolCall in response.Message.ToolCalls)
        {
            var result = await ExecuteToolAsync(toolCall);
            
            // Add tool response
            request.Messages.Add(new Message
            {
                Role = "tool",
                Content = result
            });
        }
        
        // Continue conversation with tool results
        await foreach (var continuation in ollama.ChatAsync(request))
        {
            Console.Write(continuation.Message?.Content);
        }
    }
}
```

#### Source Generator Support

OllamaSharp includes source generators for automatic tool registration:

```csharp
// Define tool with attributes
public partial class NotesTools
{
    [OllamaTool("search_notes", "Search user's notes")]
    public static async Task<string> SearchNotes(
        [OllamaParameter("query", "Search query")] string query,
        [OllamaParameter("limit", "Max results")] int limit = 10)
    {
        // Implementation
        return JsonSerializer.Serialize(results);
    }
}

// Usage - tools auto-registered
var tools = NotesTools.GetTools();
```

#### Implementation Steps

1. **Create `IOllamaFunctionHandler` interface:**
   ```csharp
   public interface IOllamaFunctionHandler
   {
       string FunctionName { get; }
       Tool GetToolDefinition();
       Task<string> ExecuteAsync(JsonElement arguments, CancellationToken ct);
   }
   ```

2. **Create `OllamaFunctionDeclarationBuilder`:**
   ```csharp
   public static class OllamaFunctionDeclarationBuilder
   {
       public static Tool BuildFromMethod(MethodInfo method)
       {
           // Extract [KernelFunction] and [Description] attributes
           // Build Tool definition
       }
       
       public static IEnumerable<Tool> BuildFromPlugin(IAgentPlugin plugin)
       {
           // Build all tools from plugin methods
       }
   }
   ```

3. **Update `OllamaProvider` with tool support:**
   ```csharp
   public async IAsyncEnumerable<OllamaStreamEvent> StreamWithToolsAsync(
       IEnumerable<ChatMessage> messages,
       IEnumerable<Tool> tools,
       AIRequest? settings = null,
       [EnumeratorCancellation] CancellationToken cancellationToken = default)
   ```

4. **Add native Ollama agent flow in AgentService:**
   ```csharp
   case "ollama":
       // Use native OllamaSharp instead of Semantic Kernel
       await foreach (var evt in StreamOllamaNativeAsync(request, ct))
       {
           yield return evt;
       }
       break;
   ```

#### Files Created/Modified

| File | Action | Status |
|------|--------|--------|
| `Services/AI/FunctionCalling/IOllamaFunctionHandler.cs` | Created | ✅ Done |
| `Services/AI/FunctionCalling/OllamaFunctionDeclarationBuilder.cs` | Created | ✅ Done |
| `Services/AI/FunctionCalling/OllamaFunctionRegistry.cs` | Created | ✅ Done |
| `Services/AI/FunctionCalling/Handlers/PluginBasedOllamaFunctionHandler.cs` | Created | ✅ Done |
| `Services/AI/Models/OllamaToolStreamEvent.cs` | Created | ✅ Done |
| `Services/AI/Providers/OllamaProvider.cs` | Modified | ✅ Done |
| `Services/Agents/AgentService.cs` | Modified | ✅ Done |
| `API/Extensions/ServiceCollectionExtensions.cs` | Modified | ✅ Done |

#### Implementation Details

The native function calling implementation includes:

1. **`IOllamaFunctionHandler`** - Interface matching `IGeminiFunctionHandler` pattern
2. **`OllamaFunctionDeclarationBuilder`** - Converts `[KernelFunction]` methods to OllamaSharp `Tool` definitions
3. **`OllamaFunctionRegistry`** - Manages handler registration and execution
4. **`PluginBasedOllamaFunctionHandler`** - Reflection-based plugin method invocation
5. **`OllamaProvider.StreamWithToolsAsync`** - Streaming with tool detection and handling
6. **`AgentService.ProcessOllamaStreamAsync`** - Full agent loop with parallel tool execution

#### Supported Models for Tool Calling

| Model | Tool Calling | Notes |
|-------|--------------|-------|
| `llama3.1` | ✅ | 8B, 70B, 405B variants |
| `llama3.2` | ✅ | 1B, 3B variants |
| `llama3.3` | ✅ | Latest 70B |
| `qwen2.5` | ✅ | 0.5B to 72B variants |
| `qwen3` | ✅ | 4B+ recommended |
| `mistral-nemo` | ✅ | 12B |
| `mistral-small` | ✅ | 22B |
| `mixtral` | ✅ | 8x7B, 8x22B |
| `command-r` | ✅ | 35B |
| `hermes3` | ✅ | 8B to 70B |

---

### 2. Microsoft.Extensions.AI Integration

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** IChatClient and IEmbeddingGenerator interfaces

#### Overview

OllamaSharp implements `Microsoft.Extensions.AI` interfaces, enabling unified AI abstractions across providers. This allows seamless switching between Ollama, OpenAI, Claude, and other providers.

#### SDK Usage

```csharp
using Microsoft.Extensions.AI;
using OllamaSharp;

// OllamaApiClient implements IChatClient
IChatClient chatClient = new OllamaApiClient("http://localhost:11434", "qwen3:4b");

// Use standard IChatClient methods
var response = await chatClient.GetResponseAsync("Hello!");
Console.WriteLine(response.Text);

// Streaming
await foreach (var update in chatClient.GetStreamingResponseAsync("Tell me a story"))
{
    Console.Write(update.Text);
}

// With conversation history
var messages = new List<ChatMessage>
{
    new(ChatRole.System, "You are a helpful assistant."),
    new(ChatRole.User, "What's the weather?")
};

var result = await chatClient.GetResponseAsync(messages);
```

#### Embedding Generator

```csharp
using Microsoft.Extensions.AI;
using OllamaSharp;

// OllamaApiClient implements IEmbeddingGenerator<string, Embedding<float>>
IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator = 
    new OllamaApiClient("http://localhost:11434", "nomic-embed-text");

// Generate embeddings
var embedding = await embeddingGenerator.GenerateEmbeddingAsync("Hello world");
ReadOnlyMemory<float> vector = embedding.Vector;

// Batch embeddings
var embeddings = await embeddingGenerator.GenerateAsync(new[] { "Hello", "World" });
```

#### Implementation Steps

1. **Create abstraction service:**
   ```csharp
   public interface IOllamaAIService
   {
       IChatClient GetChatClient(string? model = null);
       IEmbeddingGenerator<string, Embedding<float>> GetEmbeddingGenerator(string? model = null);
   }
   
   public class OllamaAIService : IOllamaAIService
   {
       private readonly OllamaSettings _settings;
       
       public IChatClient GetChatClient(string? model = null)
       {
           return new OllamaApiClient(
               new Uri(_settings.BaseUrl),
               model ?? _settings.DefaultModel);
       }
       
       public IEmbeddingGenerator<string, Embedding<float>> GetEmbeddingGenerator(string? model = null)
       {
           return new OllamaApiClient(
               new Uri(_settings.BaseUrl),
               model ?? "nomic-embed-text");
       }
   }
   ```

2. **Register in DI:**
   ```csharp
   services.AddSingleton<IOllamaAIService, OllamaAIService>();
   services.AddSingleton<IChatClient>(sp => 
       sp.GetRequiredService<IOllamaAIService>().GetChatClient());
   ```

3. **Use with middleware:**
   ```csharp
   // Add caching, logging, rate limiting
   IChatClient client = new OllamaApiClient(uri, model)
       .AsBuilder()
       .UseLogging()
       .UseOpenTelemetry()
       .Build();
   ```

#### Benefits

| Benefit | Description |
|---------|-------------|
| **Provider Agnostic** | Switch between Ollama, OpenAI, Claude without code changes |
| **Middleware Support** | Logging, caching, rate limiting via pipeline |
| **Semantic Kernel Integration** | Works with SK's IChatCompletionService |
| **Standard Types** | Uses Microsoft.Extensions.AI types everywhere |

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Abstractions/IOllamaAIService.cs` | Create | ❌ Not Started |
| `Services/AI/Abstractions/OllamaAIService.cs` | Create | ❌ Not Started |
| `API/Extensions/ServiceCollectionExtensions.cs` | Modify | ❌ Not Started |

---

### 3. Native AOT Support

**Priority:** LOW  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Improved startup performance

#### Overview

OllamaSharp supports Native AOT (Ahead-of-Time) compilation for improved startup time and reduced memory usage. Requires custom `JsonSerializerContext`.

#### SDK Usage

```csharp
using System.Text.Json.Serialization;
using OllamaSharp;

// Define custom types for AOT serialization
[JsonSerializable(typeof(MyNoteAnalysis))]
[JsonSerializable(typeof(List<MyNoteAnalysis>))]
public partial class MyJsonContext : JsonSerializerContext { }

// Create client with AOT support
var ollama = OllamaApiClient.CreateWithJsonContext(
    new Uri("http://localhost:11434"),
    "qwen3:4b",
    MyJsonContext.Default);

// Use normally
await foreach (var response in ollama.ChatAsync(request))
{
    Console.Write(response.Message?.Content);
}
```

#### Implementation Considerations

1. **Requires .NET 8+** for full AOT support
2. **All types must be registered** in JsonSerializerContext
3. **Reflection is limited** - some features may not work
4. **Best for** desktop app (Tauri) and microservices

#### Files to Create

| File | Action | Status |
|------|--------|--------|
| `Serialization/OllamaJsonContext.cs` | Create | ❌ Not Started |

---

### 4. Cloud Models (Ollama Turbo)

**Priority:** LOW  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** Cloud-hosted Ollama with API key

#### Overview

OllamaSharp supports cloud-hosted Ollama instances (Ollama Turbo/Cloud) that require API key authentication.

#### SDK Usage

```csharp
using OllamaSharp;

// Create HttpClient with API key
var httpClient = new HttpClient();
httpClient.BaseAddress = new Uri("https://api.ollama.ai");
httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer YOUR_API_KEY");

// Create client with custom HttpClient
var ollama = new OllamaApiClient(httpClient);
ollama.SelectedModel = "llama3.3:70b";

// Use as normal
await foreach (var response in ollama.ChatAsync("Hello!"))
{
    Console.Write(response.Message?.Content);
}
```

#### Implementation Steps

1. **Add cloud configuration:**
   ```json
   {
     "AIProviders": {
       "Ollama": {
         "CloudEnabled": true,
         "CloudApiKey": "",
         "CloudBaseUrl": "https://api.ollama.ai"
       }
     }
   }
   ```

2. **Update provider to support cloud:**
   ```csharp
   private OllamaApiClient CreateCloudClient()
   {
       var httpClient = new HttpClient
       {
           BaseAddress = new Uri(_settings.CloudBaseUrl)
       };
       httpClient.DefaultRequestHeaders.Add(
           "Authorization", 
           $"Bearer {_settings.CloudApiKey}");
       
       return new OllamaApiClient(httpClient)
       {
           SelectedModel = _settings.DefaultModel
       };
   }
   ```

#### Files to Modify

| File | Action | Status |
|------|--------|--------|
| `Configuration/AIProvidersSettings.cs` | Modify | ❌ Not Started |
| `Services/AI/Providers/OllamaProvider.cs` | Modify | ❌ Not Started |

---

### 5. Embeddings (SDK-based)

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Completed:** December 7, 2025

#### Overview

Replace current raw HTTP implementation with OllamaSharp's native embedding support for better maintainability and consistency.

#### Current Implementation (HTTP)

```csharp
// OllamaEmbeddingProvider.cs - Current
var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/embed";
var request = new OllamaEmbedRequest { Model = _settings.Model, Input = text };
var response = await httpClient.PostAsJsonAsync(url, request, cancellationToken);
```

#### SDK Usage

```csharp
using OllamaSharp;

var ollama = new OllamaApiClient("http://localhost:11434");

// Single embedding
var embedding = await ollama.EmbedAsync(
    model: "nomic-embed-text",
    input: "Hello world");

float[] vector = embedding.Embeddings[0];

// Batch embeddings
var embeddings = await ollama.EmbedAsync(
    model: "nomic-embed-text",
    input: new[] { "Hello", "World" });

foreach (var vec in embeddings.Embeddings)
{
    Console.WriteLine($"Dimensions: {vec.Length}");
}
```

#### Implementation

```csharp
public class OllamaEmbeddingProvider : IEmbeddingProvider
{
    private readonly OllamaApiClient _client;
    
    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        var response = await _client.EmbedAsync(
            _settings.Model,
            text,
            cancellationToken: cancellationToken);
        
        if (response.Embeddings == null || response.Embeddings.Length == 0)
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Empty embedding response",
                Provider = ProviderName
            };
        }
        
        return new EmbeddingResponse
        {
            Success = true,
            Embedding = response.Embeddings[0].Select(v => (double)v).ToList(),
            Provider = ProviderName,
            Model = _settings.Model
        };
    }
    
    public async Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default)
    {
        var response = await _client.EmbedAsync(
            _settings.Model,
            texts.ToArray(),
            cancellationToken: cancellationToken);
        
        return new BatchEmbeddingResponse
        {
            Success = true,
            Embeddings = response.Embeddings
                .Select(e => e.Select(v => (double)v).ToList())
                .ToList(),
            Provider = ProviderName,
            Model = _settings.Model
        };
    }
}
```

#### Files Modified

| File | Action | Status |
|------|--------|--------|
| `Services/Embeddings/Providers/OllamaEmbeddingProvider.cs` | Modified | ✅ Done |

#### Implementation Details

The SDK-based embedding implementation:

1. **SDK-first approach** - Uses `OllamaApiClient.EmbedAsync` for single and batch embeddings
2. **Automatic HTTP fallback** - Falls back to HTTP API if SDK fails
3. **Client caching** - Reuses `OllamaApiClient` instances via `ConcurrentDictionary`
4. **Both single and batch** - `GenerateEmbeddingWithSdkAsync` and `GenerateEmbeddingsWithSdkAsync`

```csharp
// SDK-based single embedding
var response = await client.EmbedAsync(_settings.Model, text, cancellationToken: ct);
return new EmbeddingResponse
{
    Success = true,
    Embedding = response.Embeddings[0].Select(v => (double)v).ToList(),
    Provider = ProviderName
};
```

---

### 6. Model Management

**Priority:** LOW  
**Complexity:** Low  
**Status:** ✅ Fully Implemented  
**Completed:** December 7, 2025

#### Overview

OllamaSharp provides comprehensive model management APIs. All core operations are now implemented.

#### Current Implementation

| Feature | Status | Method |
|---------|--------|--------|
| List Models | ✅ Done | `ListLocalModelsAsync` + `ListModelsAsync` |
| Pull Model | ✅ Done | `PullModelAsync` with progress |
| Delete Model | ✅ Done | `DeleteModelAsync` |
| Show Model | ✅ Done | `ShowModelAsync` → `OllamaModelDetails` |
| Copy Model | ✅ Done | `CopyModelAsync` → `OllamaModelCopyResult` |
| Create Model | ✅ Done | `CreateModelAsync` with streaming |
| Push Model | ❌ Not Done | `PushModelAsync` (low priority) |

#### Additional Methods to Implement

```csharp
// Show model details
public async Task<ShowModelResponse?> ShowModelAsync(
    string modelName,
    CancellationToken cancellationToken = default)
{
    var client = GetClientForUrl(null);
    return await client.ShowModelAsync(modelName, cancellationToken);
}

// Copy/rename model
public async Task CopyModelAsync(
    string source,
    string destination,
    CancellationToken cancellationToken = default)
{
    var client = GetClientForUrl(null);
    await client.CopyModelAsync(source, destination, cancellationToken);
}

// Create model from Modelfile
public async IAsyncEnumerable<CreateModelResponse> CreateModelAsync(
    string name,
    string modelfileContent,
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    var client = GetClientForUrl(null);
    await foreach (var response in client.CreateModelAsync(
        new CreateModelRequest { Name = name, Modelfile = modelfileContent },
        cancellationToken))
    {
        yield return response;
    }
}
```

#### Model Info Response

```csharp
public class OllamaModelDetails
{
    public string Name { get; set; }
    public string? Modelfile { get; set; }
    public string? Template { get; set; }
    public string? License { get; set; }
    public long? Size { get; set; }
    public string? QuantizationLevel { get; set; }
    public Dictionary<string, object>? Parameters { get; set; }
}
```

---

### 7. Chat Class for Stateful Conversations

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Completed:** December 7, 2025

#### Overview

OllamaSharp provides a `Chat` class that automatically manages conversation history, eliminating the need to manually track messages.

#### SDK Usage

```csharp
using OllamaSharp;

var ollama = new OllamaApiClient("http://localhost:11434");
ollama.SelectedModel = "qwen3:4b";

// Create stateful chat
var chat = new Chat(ollama);

// Messages are automatically tracked
while (true)
{
    Console.Write("You: ");
    var input = Console.ReadLine();
    
    Console.Write("AI: ");
    await foreach (var token in chat.SendAsync(input))
    {
        Console.Write(token);
    }
    Console.WriteLine();
}

// Access conversation history
var messages = chat.Messages;
```

#### Implementation

```csharp
public interface IOllamaChatSession : IDisposable
{
    IReadOnlyList<Message> Messages { get; }
    IAsyncEnumerable<string> SendAsync(string message, CancellationToken ct = default);
    void ClearHistory();
    void SetSystemPrompt(string systemPrompt);
}

public class OllamaChatSession : IOllamaChatSession
{
    private readonly Chat _chat;
    
    public OllamaChatSession(OllamaApiClient client, string? systemPrompt = null)
    {
        _chat = new Chat(client, systemPrompt);
    }
    
    public IReadOnlyList<Message> Messages => _chat.Messages;
    
    public async IAsyncEnumerable<string> SendAsync(
        string message,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await foreach (var token in _chat.SendAsync(message, ct))
        {
            yield return token;
        }
    }
    
    public void ClearHistory() => _chat.Messages.Clear();
    
    public void SetSystemPrompt(string systemPrompt)
    {
        _chat.Messages.Insert(0, new Message 
        { 
            Role = "system", 
            Content = systemPrompt 
        });
    }
    
    public void Dispose()
    {
        _chat.Messages.Clear();
    }
}
```

#### Use Cases

1. **Chat Page** - Simplified conversation management
2. **Agent Sessions** - Maintain context across tool calls
3. **Interactive Features** - Multi-turn interactions

#### Files Created

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Chat/IOllamaChatSession.cs` | Created | ✅ Done |
| `Services/AI/Chat/OllamaChatSession.cs` | Created | ✅ Done |

#### Implementation Details

The `OllamaChatSession` implementation includes:

1. **`IOllamaChatSession`** - Interface with `SendAsync`, `ClearHistory`, `SetSystemPrompt`, `AddMessage`
2. **`OllamaChatSession`** - Wraps OllamaSharp's `Chat` class with message tracking
3. **`IOllamaChatSessionFactory`** - Factory interface for creating sessions
4. **`OllamaChatSessionFactory`** - Default factory with URL override support

```csharp
// Create session
var session = new OllamaChatSession(client, model, systemPrompt, logger);

// Stream conversation
await foreach (var chunk in session.SendAsync("Hello!"))
{
    Console.Write(chunk);
}

// Access history
var messages = session.Messages;
```

---

### 8. Vision (Multimodal)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Already working, document enhancements

#### Overview

Ollama supports vision models that can process images along with text. This is already implemented.

#### Current Implementation

```csharp
// OllamaProvider.ConvertToOllamaMessage
private static Message ConvertToOllamaMessage(Models.ChatMessage message)
{
    var ollamaMessage = new Message
    {
        Role = message.Role.ToLower(),
        Content = message.Content
    };

    // Add images if present
    if (message.Images != null && message.Images.Count > 0)
    {
        ollamaMessage.Images = message.Images
            .Select(img => img.Base64Data)
            .ToArray();
    }

    return ollamaMessage;
}
```

#### Supported Vision Models

| Model | Description |
|-------|-------------|
| `llava` | LLaVA 1.5/1.6 (7B, 13B, 34B) |
| `llava-llama3` | LLaVA with Llama 3 base |
| `llama3.2-vision` | Native Llama 3.2 vision |
| `bakllava` | BakLLaVA |
| `moondream` | Lightweight vision (1.8B) |

#### Enhancements

1. **Image URL support** - Currently only base64
2. **Multiple images** - Already supported
3. **Video frames** - Extract frames and send as images

---

### 9. Structured Output (JSON Mode)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Guaranteed JSON output

> **Implementation Note:** Structured output is implemented via the unified `IStructuredOutputService` in `Services/AI/StructuredOutput/`. Uses `Format = "json"` with schema instructions in system prompt. Schema is built from C# types using reflection via `JsonSchemaBuilder` and converted to prompt instructions via `OllamaSchemaAdapter`.

#### Overview

Ollama supports JSON mode for structured output. This ensures responses are valid JSON matching optional schemas.

#### SDK Usage

```csharp
var request = new ChatRequest
{
    Model = "qwen3:4b",
    Messages = messages,
    Format = "json", // Enable JSON mode
    Options = new RequestOptions
    {
        Temperature = 0.1f // Lower temp for structured output
    }
};

await foreach (var response in ollama.ChatAsync(request))
{
    var json = response.Message?.Content;
    var result = JsonSerializer.Deserialize<NoteAnalysis>(json);
}
```

#### With Schema (Prompt Engineering)

```csharp
var systemPrompt = """
    You are a note analyzer. Respond with JSON matching this schema:
    {
        "title": "string",
        "summary": "string",
        "tags": ["string"],
        "sentiment": "positive|negative|neutral"
    }
    """;

var request = new ChatRequest
{
    Model = "qwen3:4b",
    Messages = new List<Message>
    {
        new Message { Role = "system", Content = systemPrompt },
        new Message { Role = "user", Content = "Analyze this note: ..." }
    },
    Format = "json"
};
```

#### Implementation

```csharp
public interface IOllamaStructuredOutputService
{
    Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class;
}

public class OllamaStructuredOutputService : IOllamaStructuredOutputService
{
    private readonly OllamaApiClient _client;
    
    public async Task<T?> GenerateAsync<T>(
        string prompt,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default) where T : class
    {
        var schema = OllamaSchemaBuilder.FromType<T>();
        var effectiveSystemPrompt = systemPrompt ?? 
            $"Respond with JSON matching this schema:\n{schema}";
        
        var request = new ChatRequest
        {
            Model = _settings.DefaultModel,
            Messages = new List<Message>
            {
                new Message { Role = "system", Content = effectiveSystemPrompt },
                new Message { Role = "user", Content = prompt }
            },
            Format = "json"
        };
        
        string fullResponse = "";
        await foreach (var response in _client.ChatAsync(request, cancellationToken))
        {
            fullResponse += response.Message?.Content ?? "";
        }
        
        return JsonSerializer.Deserialize<T>(fullResponse);
    }
}
```

#### Files (Already Implemented via Unified Service)

| File | Action | Status |
|------|--------|--------|
| `Services/AI/StructuredOutput/Adapters/OllamaSchemaAdapter.cs` | Created | ✅ Done |
| `Services/AI/StructuredOutput/Providers/OllamaStructuredOutputService.cs` | Created | ✅ Done |
| `Services/AI/StructuredOutput/IStructuredOutputService.cs` | Created | ✅ Done |
| `Services/AI/StructuredOutput/StructuredOutputService.cs` | Created | ✅ Done |

> **Note:** Structured output is implemented via the unified `IStructuredOutputService` system that supports all providers (OpenAI, Claude, Gemini, Grok, Ollama).

---

### 10. Keep-Alive Configuration

**Priority:** LOW  
**Complexity:** Low  
**Status:** ⏳ Partial (Config ready, not wired)  
**Target:** Model memory management

#### Overview

Configure how long models stay loaded in memory after requests. Important for balancing response latency vs. memory usage.

#### SDK Usage

```csharp
var request = new ChatRequest
{
    Model = "qwen3:4b",
    Messages = messages,
    KeepAlive = "5m" // Keep loaded for 5 minutes
};

// Or use TimeSpan
var request2 = new GenerateRequest
{
    Model = "qwen3:4b",
    Prompt = "Hello",
    KeepAlive = TimeSpan.FromMinutes(10)
};

// Special values
// "0" = Unload immediately after request
// "-1" = Keep loaded forever (until Ollama restart)
```

#### Configuration

```json
{
  "AIProviders": {
    "Ollama": {
      "KeepAlive": {
        "DefaultDuration": "5m",
        "ChatDuration": "10m",
        "EmbeddingDuration": "1m"
      }
    }
  }
}
```

#### Implementation

```csharp
public class OllamaKeepAliveConfig
{
    public string DefaultDuration { get; set; } = "5m";
    public string ChatDuration { get; set; } = "10m";
    public string EmbeddingDuration { get; set; } = "1m";
    
    public TimeSpan GetDefaultTimeSpan() => ParseDuration(DefaultDuration);
    
    private static TimeSpan ParseDuration(string duration)
    {
        if (duration == "-1") return TimeSpan.MaxValue;
        if (duration == "0") return TimeSpan.Zero;
        
        var match = Regex.Match(duration, @"(\d+)([smh])");
        if (!match.Success) return TimeSpan.FromMinutes(5);
        
        var value = int.Parse(match.Groups[1].Value);
        return match.Groups[2].Value switch
        {
            "s" => TimeSpan.FromSeconds(value),
            "m" => TimeSpan.FromMinutes(value),
            "h" => TimeSpan.FromHours(value),
            _ => TimeSpan.FromMinutes(5)
        };
    }
}
```

---

## API Endpoints to Add

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/ollama/models/{name}` | GET | Get model details | Low |
| `/api/ollama/models/copy` | POST | Copy/rename model | Low |
| `/api/ollama/models/create` | POST | Create from Modelfile | Low |
| `/api/ollama/structured` | POST | Structured JSON output | Medium |

---

## Database Schema Changes

> ✅ **IMPLEMENTED**: Ollama database tables (`ollama_model_pulls`, `ollama_model_info`) have been created in `database/25_ollama_features.sql` and applied to both Docker and Desktop PostgreSQL instances.
> 
> **Note**: Function call logging uses the generic `gemini_function_calls` table (which has a `provider` column) or the `tool_calls` table with JSONB columns for cross-provider analytics.

### Ollama Function Call Logs

```sql
CREATE TABLE ollama_function_calls (
    id VARCHAR(128) PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128),
    user_id VARCHAR(128),
    function_name VARCHAR(128) NOT NULL,
    arguments JSONB,
    result JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    model VARCHAR(64),
    provider VARCHAR(32) DEFAULT 'Ollama',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_ollama_func_calls_message_id ON ollama_function_calls(message_id);
CREATE INDEX idx_ollama_func_calls_conversation_id ON ollama_function_calls(conversation_id);
CREATE INDEX idx_ollama_func_calls_user_id ON ollama_function_calls(user_id);
CREATE INDEX idx_ollama_func_calls_function_name ON ollama_function_calls(function_name);
```

### Model Pull History

```sql
CREATE TABLE ollama_model_pulls (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128),
    model_name VARCHAR(256) NOT NULL,
    base_url VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'completed', 'failed', 'cancelled'
    total_bytes BIGINT,
    duration_seconds INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ollama_pulls_user_id ON ollama_model_pulls(user_id);
CREATE INDEX idx_ollama_pulls_model ON ollama_model_pulls(model_name);
CREATE INDEX idx_ollama_pulls_status ON ollama_model_pulls(status);
```

---

## Frontend Integration

### Type Updates (frontend/src/types/chat.ts)

```typescript
// Ollama-specific types
export interface OllamaTool {
  type: 'function';
  function: OllamaFunction;
}

export interface OllamaFunction {
  name: string;
  description: string;
  parameters: OllamaParameters;
}

export interface OllamaParameters {
  type: 'object';
  properties: Record<string, OllamaProperty>;
  required?: string[];
}

export interface OllamaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: OllamaProperty;
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

// Model management
export interface OllamaModelDetails {
  name: string;
  modelfile?: string;
  template?: string;
  license?: string;
  size?: number;
  quantizationLevel?: string;
  parameters?: Record<string, unknown>;
}

export interface OllamaModelPullHistory {
  id: string;
  modelName: string;
  baseUrl: string;
  status: 'completed' | 'failed' | 'cancelled';
  totalBytes?: number;
  durationSeconds?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// Keep-alive configuration
export interface OllamaKeepAliveOptions {
  duration: string; // "5m", "1h", "0", "-1"
}

// Update SendMessageRequest
export interface SendMessageRequest {
  // ... existing fields
  
  // Ollama-specific options
  ollamaKeepAlive?: string;
  enableOllamaTools?: boolean;
  ollamaJsonMode?: boolean;
}

// Streaming events
export type OllamaStreamEventType =
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'model_load'
  | 'error'
  | 'done';

export interface OllamaStreamEvent {
  type: OllamaStreamEventType;
  data: unknown;
}
```

### UI Components to Create

| Component | Purpose | Priority |
|-----------|---------|----------|
| `OllamaModelDetails` | Show model info | Low |
| `OllamaToolCallDisplay` | Show tool execution | Medium |
| `OllamaKeepAliveSettings` | Configure keep-alive | Low |
| `OllamaModelPullHistory` | Show pull history | Low |

---

## Configuration Updates

### appsettings.json ✅ IMPLEMENTED

```json
{
  "AIProviders": {
    "Ollama": {
      "Enabled": true,
      "BaseUrl": "http://localhost:11434",
      "DefaultModel": "qwen3:4b",
      "KeepAlive": "5m",
      "Temperature": 0.7,
      "TimeoutSeconds": 120,
      "StreamingEnabled": true,
      
      "Features": {
        "EnableFunctionCalling": true,
        "EnableStructuredOutput": true,
        "EnableVision": true
      },
      
      "FunctionCalling": {
        "MaxIterations": 10,
        "ParallelExecution": true,
        "TimeoutSeconds": 30
      }
    }
  }
}
```

> **Note:** Cloud and detailed KeepAlive configurations are planned for future implementation.

### Configuration Classes ✅ IMPLEMENTED

```csharp
// Configuration/AIProvidersSettings.cs
public class OllamaSettings
{
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string DefaultModel { get; set; } = "llama3.2";
    public string KeepAlive { get; set; } = "5m";
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    public bool StreamingEnabled { get; set; } = true;

    // ✅ Implemented
    public OllamaFeaturesConfig Features { get; set; } = new();
    public OllamaFunctionCallingConfig FunctionCalling { get; set; } = new();
}

public class OllamaFeaturesConfig  // ✅ Implemented
{
    public bool EnableFunctionCalling { get; set; } = true;
    public bool EnableStructuredOutput { get; set; } = true;
    public bool EnableVision { get; set; } = true;
}

public class OllamaFunctionCallingConfig  // ✅ Implemented
{
    public int MaxIterations { get; set; } = 10;
    public bool ParallelExecution { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 30;
}

// Future additions (not yet implemented)
public class OllamaCloudConfig  // ❌ Not Started
{
    public bool Enabled { get; set; } = false;
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.ollama.ai";
}
```

---

## Model Reference

### Language Models (Recommended for Chat)

| Model | Parameters | Context | Tool Calling | Notes |
|-------|------------|---------|--------------|-------|
| `qwen3` | 4B-32B | 32K | ✅ | Fast, high quality |
| `qwen2.5` | 0.5B-72B | 128K | ✅ | Long context |
| `llama3.3` | 70B | 128K | ✅ | Latest Llama |
| `llama3.2` | 1B-3B | 128K | ✅ | Lightweight |
| `llama3.1` | 8B-405B | 128K | ✅ | Production ready |
| `mistral-nemo` | 12B | 128K | ✅ | Balanced |
| `mixtral` | 8x7B | 32K | ✅ | MoE |
| `gemma2` | 2B-27B | 8K | ❌ | Google |
| `phi3` | 3.8B-14B | 128K | ❌ | Microsoft |

### Vision Models

| Model | Parameters | Notes |
|-------|------------|-------|
| `llama3.2-vision` | 11B-90B | Native Llama vision |
| `llava` | 7B-34B | LLaVA 1.5/1.6 |
| `moondream` | 1.8B | Lightweight |
| `bakllava` | 7B | BakLLaVA |

### Embedding Models

| Model | Dimensions | Notes |
|-------|------------|-------|
| `nomic-embed-text` | 768 | General purpose |
| `mxbai-embed-large` | 1024 | High quality |
| `all-minilm` | 384 | Lightweight |
| `snowflake-arctic-embed` | 1024 | Enterprise |
| `bge-m3` | 1024 | Multilingual |

### Model Selection Guide

| Use Case | Recommended Model |
|----------|-------------------|
| **General Chat** | qwen3:4b, llama3.2:3b |
| **Complex Reasoning** | qwen2.5:32b, llama3.3:70b |
| **Tool Calling** | qwen3:4b, llama3.1:8b |
| **Vision Tasks** | llama3.2-vision:11b, llava |
| **Fast Responses** | phi3:mini, gemma2:2b |
| **Long Documents** | qwen2.5:14b (128K context) |
| **Code Generation** | qwen2.5-coder, codellama |
| **Embeddings** | nomic-embed-text, bge-m3 |

---

## Testing Strategy

### Unit Tests

1. **Function calling handler tests**
   - Tool definition generation
   - Argument parsing and validation
   - Result serialization

2. **Message conversion tests**
   - Text messages
   - Image messages
   - Tool messages

3. **Configuration validation tests**
   - Setting validation
   - Default value handling

### Integration Tests

1. **End-to-end function calling flow**
   - Multi-turn tool conversations
   - Parallel tool execution
   - Error handling

2. **Model management**
   - Pull with progress
   - Delete verification
   - List models

3. **Streaming behavior**
   - Token streaming
   - Error recovery
   - Timeout handling

### Manual Testing

1. Test each feature with real Ollama instance
2. Verify frontend displays correctly
3. Check error handling for offline Ollama
4. Performance testing for large models
5. Memory usage with keep-alive

---

## Implementation Priority

### Phase 1 - High Priority ✅ COMPLETED

1. ✅ **Native Function Calling** - Implemented with `StreamWithToolsAsync` and `ProcessOllamaStreamAsync`
2. ⏳ **Microsoft.Extensions.AI** - Pending (IChatClient, IEmbeddingGenerator)
3. ✅ **Embeddings SDK** - Implemented with HTTP fallback

### Phase 2 - Medium Priority ✅ COMPLETED

4. ✅ **Structured Output** - Implemented via unified service
5. ✅ **Chat Class** - Implemented `OllamaChatSession`
6. ✅ **Enhanced Model Management** - Show, copy, create all implemented

### Phase 3 - Lower Priority (Future)

7. ❌ **Cloud Models** - Ollama Turbo support
8. ⏳ **Keep-Alive Configuration** - Config ready, needs wiring
9. ❌ **Native AOT** - Performance optimization

---

## Known Issues & Limitations

### SDK Considerations

1. **Token counting** - Not available in current SDK version
2. **Tool calling maturity** - Relatively new feature, may have edge cases
3. **Model compatibility** - Not all models support all features

### Model-Specific Limitations

| Model | Limitation |
|-------|------------|
| gemma2 | No tool calling |
| phi3 | No tool calling |
| Older llama2 | Limited capabilities |
| Small models (<3B) | May struggle with complex tools |

### Workarounds Applied

1. ~~**Function calling** - Currently using Semantic Kernel with `/v1` endpoint~~ → ✅ Now uses native OllamaSharp
2. ~~**Embeddings** - Currently using raw HTTP instead of SDK~~ → ✅ Now uses SDK with HTTP fallback
3. **Token counting** - Not tracked (returns 0) - SDK limitation

---

## References

- [OllamaSharp GitHub](https://github.com/awaescher/OllamaSharp)
- [OllamaSharp NuGet](https://www.nuget.org/packages/OllamaSharp)
- [Ollama Documentation](https://ollama.ai)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama Model Library](https://ollama.ai/library)
- [Microsoft.Extensions.AI](https://devblogs.microsoft.com/dotnet/introducing-microsoft-extensions-ai-preview/)
- [Semantic Kernel Ollama Connector](https://github.com/microsoft/semantic-kernel)
- [Ollama Tool Calling Guide](https://ollama.ai/blog/tool-support)
