# OpenAI .NET SDK - Full Features Implementation Guide

This document provides a comprehensive implementation plan for leveraging all features available in the official OpenAI .NET SDK (`OpenAI` v2.7.0+).

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Feature Implementation Plan](#feature-implementation-plan)
   - [1. Function Calling (Tools)](#1-function-calling-tools)
   - [2. Structured Output (JSON Schema)](#2-structured-output-json-schema)
   - [3. Reasoning Models (o1/o3)](#3-reasoning-models-o1o3)
   - [4. Responses API](#4-responses-api)
   - [5. Audio Input/Output](#5-audio-inputoutput)
   - [6. Audio Transcription (Whisper)](#6-audio-transcription-whisper)
   - [7. Text Embeddings](#7-text-embeddings)
   - [8. Image Generation (DALL-E)](#8-image-generation-dall-e)
   - [9. Vision (Image Understanding)](#9-vision-image-understanding)
   - [10. Assistants API with RAG](#10-assistants-api-with-rag)
   - [11. Web Search (Responses API)](#11-web-search-responses-api)
   - [12. File Search (Responses API)](#12-file-search-responses-api)
   - [13. Realtime API](#13-realtime-api)
   - [14. Batch API](#14-batch-api)
   - [15. Fine-Tuning](#15-fine-tuning)
   - [16. Content Moderation](#16-content-moderation)
4. [API Endpoints to Add](#api-endpoints-to-add)
5. [Database Schema Changes](#database-schema-changes)
6. [Frontend Integration](#frontend-integration)
7. [Configuration Updates](#configuration-updates)
8. [Testing Strategy](#testing-strategy)

---

## Overview

The official OpenAI .NET SDK provides comprehensive access to all OpenAI API features. This document outlines how to upgrade from basic chat completion to leverage advanced features like function calling, structured outputs, reasoning models, audio, and the new Responses API.

### SDK Information

| Property | Value |
|----------|-------|
| **Package** | `OpenAI` |
| **Version** | 2.7.0 |
| **NuGet** | https://www.nuget.org/packages/OpenAI |
| **Documentation** | https://github.com/openai/openai-dotnet |
| **GitHub** | https://github.com/openai/openai-dotnet |

### Key Namespaces

```csharp
using OpenAI;                    // Main client, OpenAIClient
using OpenAI.Chat;               // ChatClient, ChatCompletion, ChatCompletionOptions
using OpenAI.Responses;          // OpenAIResponseClient (new Responses API)
using OpenAI.Audio;              // AudioClient, transcription, TTS
using OpenAI.Embeddings;         // EmbeddingClient
using OpenAI.Images;             // ImageClient
using OpenAI.Assistants;         // AssistantClient (Assistants API)
using OpenAI.Files;              // OpenAIFileClient
using OpenAI.VectorStores;       // VectorStoreClient
using OpenAI.FineTuning;         // FineTuningClient
using OpenAI.Moderations;        // ModerationClient
using OpenAI.Batch;              // BatchClient
using OpenAI.Realtime;           // RealtimeClient
using OpenAI.Models;             // OpenAIModelClient
```

### Client Organization

The SDK provides specialized clients for each feature area:

| Namespace | Client Class | Purpose |
|-----------|--------------|---------|
| `OpenAI.Assistants` | `AssistantClient` | Assistants API for persistent threads |
| `OpenAI.Audio` | `AudioClient` | Transcription (Whisper), TTS |
| `OpenAI.Batch` | `BatchClient` | Batch processing |
| `OpenAI.Chat` | `ChatClient` | Chat completions |
| `OpenAI.Embeddings` | `EmbeddingClient` | Text embeddings |
| `OpenAI.FineTuning` | `FineTuningClient` | Model fine-tuning |
| `OpenAI.Files` | `OpenAIFileClient` | File upload/management |
| `OpenAI.Images` | `ImageClient` | DALL-E image generation |
| `OpenAI.Models` | `OpenAIModelClient` | List/retrieve models |
| `OpenAI.Moderations` | `ModerationClient` | Content moderation |
| `OpenAI.Realtime` | `RealtimeClient` | Realtime audio/video |
| `OpenAI.Responses` | `OpenAIResponseClient` | Responses API (new) |
| `OpenAI.VectorStores` | `VectorStoreClient` | Vector stores for RAG |

---

## Current Implementation Status

> **Last Updated:** December 2025

| Feature | Status | Notes |
|---------|--------|-------|
| Text Generation | ✅ Implemented | `ChatClient.CompleteChatAsync` |
| Streaming | ✅ Implemented | `CompleteChatStreamingAsync` |
| Chat/Multi-turn | ✅ Implemented | UserChatMessage, AssistantChatMessage |
| System Messages | ✅ Implemented | SystemChatMessage |
| Multimodal (Images) | ✅ Implemented | `ChatMessageContentPart.CreateImagePart` |
| Image Generation | ✅ Implemented | DALL-E 3 via SDK `ImageClient` |
| Structured Output | ✅ Implemented | `ChatResponseFormat.CreateJsonSchemaFormat` via unified service |
| Function Calling | ✅ Implemented | Native SDK with `ChatTool`, `ChatToolCall` |
| Text Embeddings | ✅ Implemented | SDK `EmbeddingClient` with custom dimensions support |
| Reasoning Models | ⏳ Pending | o1/o3 support minimal |
| Responses API | ❌ Not Started | New API for web/file search |
| Audio Input/Output | ❌ Not Started | gpt-4o-audio-preview |
| Audio Transcription | ❌ Not Started | Whisper integration |
| Assistants API | ❌ Not Started | Persistent threads + RAG |
| Web Search | ❌ Not Started | Responses API feature |
| File Search | ❌ Not Started | Responses API feature |
| Realtime API | ❌ Not Started | WebSocket-based |
| Batch API | ❌ Not Started | Bulk processing |
| Fine-Tuning | ❌ Not Started | Custom model training |
| Content Moderation | ❌ Not Started | Safety filtering |

### Current Implementation Details

#### ✅ Fully Implemented

- **Chat Completion**: Basic `ChatClient.CompleteChatAsync` with temperature handling
- **Streaming**: `CompleteChatStreamingAsync` with first-token latency tracking
- **Multimodal Images**: User messages with image content parts via data URLs
- **Image Generation**: DALL-E 3 via SDK `ImageClient` with size/quality/style mapping
- **Text Embeddings**: SDK `EmbeddingClient` with custom dimensions (256-3072) and token usage tracking
- **Health Checks**: Provider availability and model listing
- **Telemetry**: OpenTelemetry integration for requests
- **Function Calling**: Native SDK implementation with `ChatTool.CreateFunctionTool`, streaming tool calls, parallel tool execution
- **Structured Output**: Via unified `IStructuredOutputService` with `ChatResponseFormat.CreateJsonSchemaFormat`

#### ⚠️ Partial/Workaround Implementation

- **Temperature Handling**: Retry logic for models that don't support temperature (o1, o1-mini)

---

## Feature Implementation Plan

### 1. Function Calling (Tools)

**Priority:** HIGH  
**Complexity:** Medium  
**Status:** ✅ Implemented  
**Target:** Native SDK implementation like Gemini/Claude

#### Overview

Function calling allows GPT models to invoke external functions/tools and use their results. The SDK provides native support that's more flexible than Semantic Kernel for advanced scenarios.

#### SDK Types

```csharp
using OpenAI.Chat;

// Define a function tool
ChatTool getCurrentWeatherTool = ChatTool.CreateFunctionTool(
    functionName: "get_current_weather",
    functionDescription: "Get the current weather in a given location",
    functionParameters: BinaryData.FromBytes("""
        {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. Boston, MA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The temperature unit"
                }
            },
            "required": ["location"]
        }
        """u8.ToArray())
);

// Add to completion options
var options = new ChatCompletionOptions
{
    Tools = { getCurrentWeatherTool }
};

// Handle tool calls in response
ChatCompletion completion = await client.CompleteChatAsync(messages, options);

if (completion.FinishReason == ChatFinishReason.ToolCalls)
{
    foreach (ChatToolCall toolCall in completion.ToolCalls)
    {
        // Execute the function
        string result = await ExecuteFunction(toolCall.FunctionName, toolCall.FunctionArguments);
        
        // Add tool result to messages
        messages.Add(new AssistantChatMessage(completion));
        messages.Add(new ToolChatMessage(toolCall.Id, result));
    }
    
    // Continue conversation with results
    completion = await client.CompleteChatAsync(messages, options);
}
```

#### Implementation Steps

1. **Create `IOpenAIFunctionHandler` interface:**
   ```csharp
   public interface IOpenAIFunctionHandler
   {
       string FunctionName { get; }
       ChatTool GetToolDefinition();
       Task<string> ExecuteAsync(BinaryData arguments, CancellationToken ct);
   }
   ```

2. **Create `OpenAIFunctionDeclarationBuilder`:**
   ```csharp
   public static class OpenAIFunctionDeclarationBuilder
   {
       public static ChatTool BuildFromMethod(MethodInfo method)
       {
           // Extract [KernelFunction] and [Description] attributes
           // Build JSON schema for parameters
           // Return ChatTool.CreateFunctionTool(...)
       }
   }
   ```

3. **Create `PluginBasedOpenAIFunctionHandler`:**
   ```csharp
   public class PluginBasedOpenAIFunctionHandler : IOpenAIFunctionHandler
   {
       // Uses NotesPlugin methods like Gemini implementation
   }
   ```

4. **Update `OpenAIProvider` with tool support:**
   ```csharp
   public async Task<AIResponse> GenerateWithToolsAsync(
       IEnumerable<ChatMessage> messages,
       IEnumerable<ChatTool> tools,
       AIRequest? settings = null,
       CancellationToken cancellationToken = default)
   {
       var options = new ChatCompletionOptions
       {
           Tools = tools.ToList(),
           MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens
       };
       
       // Loop handling tool calls
       while (true)
       {
           var completion = await _client.CompleteChatAsync(chatMessages, options, cancellationToken);
           
           if (completion.Value.FinishReason != ChatFinishReason.ToolCalls)
               break;
               
           // Execute tools in parallel
           var toolResults = await ExecuteToolCallsAsync(completion.Value.ToolCalls);
           
           // Add results and continue
           chatMessages.Add(new AssistantChatMessage(completion.Value));
           chatMessages.AddRange(toolResults.Select(r => new ToolChatMessage(r.Id, r.Result)));
       }
       
       return MapToAIResponse(completion);
   }
   ```

5. **Add streaming with tool calls:**
   ```csharp
   public async IAsyncEnumerable<OpenAIStreamEvent> StreamWithToolsAsync(
       IEnumerable<ChatMessage> messages,
       IEnumerable<ChatTool> tools,
       AIRequest? settings = null,
       [EnumeratorCancellation] CancellationToken cancellationToken = default)
   {
       // Accumulate tool calls during streaming
       // Execute when complete
       // Yield text tokens as they arrive
   }
   ```

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/FunctionCalling/IOpenAIFunctionHandler.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/OpenAIFunctionRegistry.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/OpenAIFunctionDeclarationBuilder.cs` | Create | ✅ Implemented |
| `Services/AI/FunctionCalling/Handlers/PluginBasedOpenAIFunctionHandler.cs` | Create | ✅ Implemented |
| `Services/AI/Models/OpenAIToolStreamEvent.cs` | Create | ✅ Implemented |
| `Services/AI/Providers/OpenAIProvider.cs` | Modify | ✅ Implemented |
| `Services/Agents/AgentService.cs` | Modify | ✅ Implemented |
| `Configuration/AIProvidersSettings.cs` | Modify | ✅ Implemented |
| `API/Extensions/ServiceCollectionExtensions.cs` | Modify | ✅ Implemented |
| `API/appsettings.json` | Modify | ✅ Implemented |

#### Implementation Summary

The native OpenAI function calling implementation follows the same pattern as Ollama, Gemini, and Claude:

1. **`IOpenAIFunctionHandler`**: Interface for individual function handlers with `GetToolDefinition()` returning `ChatTool`
2. **`OpenAIFunctionRegistry`**: Registry managing all registered handlers, providing `GetAllTools()` and `ExecuteAsync()`
3. **`OpenAIFunctionDeclarationBuilder`**: Builds `ChatTool` from `[KernelFunction]` decorated methods using reflection
4. **`PluginBasedOpenAIFunctionHandler`**: Wraps `NotesPlugin` methods as OpenAI tools
5. **`OpenAIToolStreamEvent`**: Stream event model for text, tool calls, and completion events
6. **`OpenAIProvider.StreamWithToolsAsync()`**: Streaming with tool support, handles `ChatFinishReason.ToolCalls`
7. **`AgentService.ProcessOpenAIStreamAsync()`**: Tool execution loop with parallel execution support

#### Configuration

```json
"OpenAI": {
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
```

---

### 2. Structured Output (JSON Schema)

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Guaranteed JSON output matching schema

> **Implementation Note:** Structured output is implemented via the unified `IStructuredOutputService` in `Services/AI/StructuredOutput/`. Uses `ChatResponseFormat.CreateJsonSchemaFormat` with `jsonSchemaIsStrict: true`. Schema is built from C# types using reflection via `JsonSchemaBuilder`.

#### Overview

Structured outputs force GPT models to return responses matching a specific JSON schema. This is critical for reliable API integrations, data extraction, and type-safe responses.

#### SDK Usage

```csharp
var options = new ChatCompletionOptions
{
    ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
        jsonSchemaFormatName: "math_reasoning",
        jsonSchema: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "explanation": { "type": "string" },
                                "output": { "type": "string" }
                            },
                            "required": ["explanation", "output"],
                            "additionalProperties": false
                        }
                    },
                    "final_answer": { "type": "string" }
                },
                "required": ["steps", "final_answer"],
                "additionalProperties": false
            }
            """u8.ToArray()),
        jsonSchemaIsStrict: true)
};

ChatCompletion completion = await client.CompleteChatAsync(messages, options);

// Response.Text is guaranteed valid JSON matching schema
var result = JsonSerializer.Deserialize<MathReasoning>(completion.Content[0].Text);
```

#### Implementation

1. **Create `OpenAISchemaBuilder`:**
   ```csharp
   public static class OpenAISchemaBuilder
   {
       /// <summary>
       /// Build JSON schema from C# type using reflection
       /// </summary>
       public static BinaryData FromType<T>()
       {
           var schema = BuildSchemaForType(typeof(T));
           return BinaryData.FromBytes(
               JsonSerializer.SerializeToUtf8Bytes(schema));
       }
       
       private static Dictionary<string, object> BuildSchemaForType(Type type)
       {
           var schema = new Dictionary<string, object>
           {
               ["type"] = "object",
               ["additionalProperties"] = false
           };
           
           var properties = new Dictionary<string, object>();
           var required = new List<string>();
           
           foreach (var prop in type.GetProperties())
           {
               var propSchema = GetPropertySchema(prop.PropertyType);
               var name = GetJsonPropertyName(prop);
               properties[name] = propSchema;
               
               if (!IsNullable(prop.PropertyType))
                   required.Add(name);
           }
           
           schema["properties"] = properties;
           schema["required"] = required;
           
           return schema;
       }
   }
   ```

2. **Create `IOpenAIStructuredOutputService`:**
   ```csharp
   public interface IOpenAIStructuredOutputService
   {
       Task<T?> GenerateAsync<T>(
           string prompt,
           string? systemPrompt = null,
           CancellationToken cancellationToken = default) where T : class;
       
       Task<T?> GenerateAsync<T>(
           IEnumerable<ChatMessage> messages,
           CancellationToken cancellationToken = default) where T : class;
   }
   ```

3. **Implement service:**
   ```csharp
   public class OpenAIStructuredOutputService : IOpenAIStructuredOutputService
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
                   jsonSchemaFormatName: typeof(T).Name,
                   jsonSchema: OpenAISchemaBuilder.FromType<T>(),
                   jsonSchemaIsStrict: true)
           };
           
           var completion = await _client.CompleteChatAsync(messages, options, cancellationToken);
           
           return JsonSerializer.Deserialize<T>(completion.Value.Content[0].Text);
       }
   }
   ```

#### Use Cases

1. **Note Analysis** - Extract title, summary, tags, sentiment
2. **Query Intent Detection** - Structured classification of user queries
3. **Data Extraction** - Parse documents into typed data
4. **API Responses** - Guaranteed valid JSON for downstream systems
5. **Agent Tool Arguments** - Type-safe function parameters

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/StructuredOutput/Common/JsonSchemaBuilder.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/Common/JsonSchemaDefinition.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/Adapters/OpenAISchemaAdapter.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/Providers/OpenAIStructuredOutputService.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/IProviderStructuredOutputService.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/IStructuredOutputService.cs` | Create | ✅ Implemented |
| `Services/AI/StructuredOutput/StructuredOutputService.cs` | Create | ✅ Implemented |
| `API/Extensions/ServiceCollectionExtensions.cs` | Modify | ✅ Implemented |

#### Implementation Summary

Structured output is implemented via a unified cross-provider service:

1. **`JsonSchemaBuilder`**: Builds JSON schema from C# types using reflection
2. **`OpenAISchemaAdapter`**: Adapts generic schema to OpenAI's `ChatResponseFormat.CreateJsonSchemaFormat`
3. **`OpenAIStructuredOutputService`**: Provider-specific implementation using `ChatClient`
4. **`StructuredOutputService`**: Unified service that routes to appropriate provider

---

### 3. Reasoning Models (o1/o3)

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ⏳ Pending  
**Target:** Support o1, o1-mini, o3-mini with reasoning

#### Overview

OpenAI's reasoning models (o1, o1-mini, o3, o3-mini) use extended thinking for complex problems. The Responses API provides better access to reasoning features.

#### SDK Usage (Responses API)

```csharp
using OpenAI.Responses;

OpenAIResponseClient client = new(
    model: "o3-mini",
    apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY"));

// Non-streaming with reasoning
OpenAIResponse response = await client.CreateResponseAsync(
    userInputText: "What's the optimal strategy to win at poker?",
    new ResponseCreationOptions
    {
        ReasoningOptions = new ResponseReasoningOptions
        {
            ReasoningEffortLevel = ResponseReasoningEffortLevel.High
        }
    });

// Streaming with reasoning
await foreach (StreamingResponseUpdate update
    in client.CreateResponseStreamingAsync(
        userInputText: "Solve this complex problem...",
        new ResponseCreationOptions
        {
            ReasoningOptions = new ResponseReasoningOptions
            {
                ReasoningEffortLevel = ResponseReasoningEffortLevel.High
            }
        }))
{
    if (update is StreamingResponseOutputItemAddedUpdate itemUpdate
        && itemUpdate.Item is ReasoningResponseItem reasoningItem)
    {
        Console.WriteLine($"[Reasoning] ({reasoningItem.Status})");
    }
    else if (update is StreamingResponseOutputTextDeltaUpdate delta)
    {
        Console.Write(delta.Delta);
    }
}
```

#### Reasoning Effort Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `Low` | Quick reasoning | Simple tasks |
| `Medium` | Balanced | General use |
| `High` | Extended thinking | Complex problems |

#### Implementation Steps

1. **Add `ReasoningConfig` to settings:**
   ```csharp
   public class OpenAIReasoningConfig
   {
       public string DefaultEffortLevel { get; set; } = "Medium";
       public bool IncludeReasoningInResponse { get; set; } = false;
       public int MaxReasoningTokens { get; set; } = 4096;
   }
   ```

2. **Create `IOpenAIResponseService`:**
   ```csharp
   public interface IOpenAIResponseService
   {
       Task<AIResponse> CreateResponseAsync(
           string userInput,
           OpenAIResponseOptions? options = null,
           CancellationToken cancellationToken = default);
       
       IAsyncEnumerable<OpenAIStreamEvent> CreateResponseStreamingAsync(
           string userInput,
           OpenAIResponseOptions? options = null,
           CancellationToken cancellationToken = default);
   }
   ```

3. **Update `OpenAIProvider` for reasoning models:**
   ```csharp
   private bool IsReasoningModel(string model) =>
       model.StartsWith("o1") || model.StartsWith("o3");
   
   public async Task<AIResponse> GenerateWithReasoningAsync(
       AIRequest request,
       ResponseReasoningEffortLevel effort = ResponseReasoningEffortLevel.Medium,
       CancellationToken cancellationToken = default)
   {
       var client = new OpenAIResponseClient(request.Model ?? "o3-mini", _settings.ApiKey);
       
       var response = await client.CreateResponseAsync(
           request.Prompt,
           new ResponseCreationOptions
           {
               ReasoningOptions = new ResponseReasoningOptions
               {
                   ReasoningEffortLevel = effort
               }
           },
           cancellationToken);
       
       return MapToAIResponse(response);
   }
   ```

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Configuration/AIProvidersSettings.cs` | Modify | ⏳ Pending |
| `Services/AI/Responses/IOpenAIResponseService.cs` | Create | ⏳ Pending |
| `Services/AI/Responses/OpenAIResponseService.cs` | Create | ⏳ Pending |
| `Services/AI/Providers/OpenAIProvider.cs` | Modify | ⏳ Pending |
| `DTOs/Requests/SendMessageRequest.cs` | Modify | ⏳ Pending |

---

### 4. Responses API

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Modern API with built-in tools

#### Overview

The Responses API is OpenAI's newer API that combines chat completions with built-in tools like web search, file search, and computer use. It's the recommended API for new features.

#### SDK Usage

```csharp
using OpenAI.Responses;

OpenAIResponseClient client = new(
    model: "gpt-4o-mini",
    apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY"));

// Basic response
OpenAIResponse response = await client.CreateResponseAsync(
    userInputText: "Hello!",
    new ResponseCreationOptions());

// With tools
OpenAIResponse response = await client.CreateResponseAsync(
    userInputText: "What's the weather in Tokyo?",
    new ResponseCreationOptions
    {
        Tools = { ResponseTool.CreateWebSearchTool() }
    });

// Access output items
foreach (ResponseItem item in response.OutputItems)
{
    if (item is MessageResponseItem message)
    {
        Console.WriteLine($"[{message.Role}] {message.Content?.FirstOrDefault()?.Text}");
    }
    else if (item is WebSearchCallResponseItem webSearch)
    {
        Console.WriteLine($"[Web Search] {webSearch.Id}");
    }
}
```

#### Key Differences from Chat API

| Feature | Chat API | Responses API |
|---------|----------|---------------|
| Tool Definition | Manual JSON schema | Built-in `ResponseTool` |
| Web Search | Not available | `ResponseTool.CreateWebSearchTool()` |
| File Search | Via Assistants | `ResponseTool.CreateFileSearchTool()` |
| Reasoning | Limited | Full `ReasoningOptions` |
| Streaming | `StreamingChatCompletionUpdate` | `StreamingResponseUpdate` |

#### Implementation Steps

1. **Create wrapper service for Responses API**
2. **Map ResponseItem types to internal models**
3. **Integrate with existing chat flow**
4. **Add frontend support for response items**

---

### 5. Audio Input/Output

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Voice conversations with GPT-4o Audio

#### Overview

The `gpt-4o-audio-preview` model supports audio input and output in chat completions, enabling voice conversations.

#### SDK Usage

```csharp
ChatClient client = new("gpt-4o-audio-preview", apiKey);

// Audio input
string audioFilePath = "question.wav";
byte[] audioBytes = File.ReadAllBytes(audioFilePath);
BinaryData audioData = BinaryData.FromBytes(audioBytes);

List<ChatMessage> messages = new()
{
    new UserChatMessage(
        ChatMessageContentPart.CreateInputAudioPart(audioData, ChatInputAudioFormat.Wav))
};

// Request audio output
ChatCompletionOptions options = new()
{
    ResponseModalities = ChatResponseModalities.Text | ChatResponseModalities.Audio,
    AudioOptions = new(ChatOutputAudioVoice.Alloy, ChatOutputAudioFormat.Mp3)
};

ChatCompletion completion = await client.CompleteChatAsync(messages, options);

// Get audio response
if (completion.OutputAudio is ChatOutputAudio outputAudio)
{
    Console.WriteLine($"Transcript: {outputAudio.Transcript}");
    await File.WriteAllBytesAsync($"{outputAudio.Id}.mp3", outputAudio.AudioBytes);
}
```

#### Audio Voices

| Voice | Description |
|-------|-------------|
| `Alloy` | Neutral, balanced |
| `Echo` | Warm, conversational |
| `Fable` | British, storytelling |
| `Onyx` | Deep, authoritative |
| `Nova` | Friendly, upbeat |
| `Shimmer` | Clear, professional |

#### Audio Formats

**Input Formats:** `Wav`, `Mp3`, `Flac`, `Webm`, `Mp4`, `Mpga`, `M4a`, `Ogg`

**Output Formats:** `Wav`, `Mp3`, `Flac`, `Opus`, `Pcm16`

#### Implementation Steps

1. **Add audio content part support to message conversion**
2. **Create `IAudioChatService` for audio conversations**
3. **Handle audio output in responses**
4. **Frontend: Add audio recording/playback UI**

#### Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `Services/AI/Audio/IAudioChatService.cs` | Create | ❌ Not Started |
| `Services/AI/Audio/AudioChatService.cs` | Create | ❌ Not Started |
| `Services/AI/Providers/OpenAIProvider.cs` | Modify | ❌ Not Started |
| `DTOs/ChatMessage.cs` | Modify | ❌ Not Started |

---

### 6. Audio Transcription (Whisper)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** Speech-to-text for notes and chat

#### Overview

Use Whisper for accurate audio transcription with word-level timestamps.

#### SDK Usage

```csharp
using OpenAI.Audio;

AudioClient client = new("whisper-1", apiKey);

AudioTranscriptionOptions options = new()
{
    ResponseFormat = AudioTranscriptionFormat.Verbose,
    TimestampGranularities = AudioTimestampGranularities.Word | AudioTimestampGranularities.Segment
};

AudioTranscription transcription = await client.TranscribeAudioAsync(
    "recording.mp3",
    options);

Console.WriteLine($"Text: {transcription.Text}");
Console.WriteLine($"Duration: {transcription.Duration}");

foreach (TranscribedWord word in transcription.Words)
{
    Console.WriteLine($"  {word.Word}: {word.StartTime} - {word.EndTime}");
}
```

#### Use Cases

1. **Voice Notes** - Create notes from audio recordings
2. **Meeting Transcription** - Transcribe meeting audio
3. **Voice Commands** - Voice input for chat
4. **Accessibility** - Speech-to-text for accessibility

#### Implementation

```csharp
public interface IAudioTranscriptionService
{
    Task<TranscriptionResult> TranscribeAsync(
        Stream audioStream,
        string fileName,
        TranscriptionOptions? options = null,
        CancellationToken cancellationToken = default);
    
    Task<TranscriptionResult> TranscribeFromUrlAsync(
        string audioUrl,
        TranscriptionOptions? options = null,
        CancellationToken cancellationToken = default);
}

public class TranscriptionResult
{
    public string Text { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public string Language { get; set; } = "en";
    public List<TranscribedWord>? Words { get; set; }
    public List<TranscribedSegment>? Segments { get; set; }
}
```

---

### 7. Text Embeddings

**Priority:** HIGH  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Migrate to SDK `EmbeddingClient`

#### Overview

The SDK's `EmbeddingClient` is now used for text embeddings with support for custom dimensions (256-3072) and token usage tracking.

#### SDK Usage

```csharp
using OpenAI.Embeddings;

EmbeddingClient client = new("text-embedding-3-small", apiKey);

// Single embedding
OpenAIEmbedding embedding = await client.GenerateEmbeddingAsync(
    "Your text to embed");
ReadOnlyMemory<float> vector = embedding.ToFloats();

// Batch embeddings
EmbeddingCollection embeddings = await client.GenerateEmbeddingsAsync(
    new[] { "Text 1", "Text 2", "Text 3" });

// With reduced dimensions
EmbeddingGenerationOptions options = new() { Dimensions = 512 };
OpenAIEmbedding smallEmbedding = await client.GenerateEmbeddingAsync(
    "Your text", options);
```

#### Embedding Models

| Model | Dimensions | Use Case |
|-------|------------|----------|
| `text-embedding-3-small` | 1536 (default) | General use, cost-effective |
| `text-embedding-3-large` | 3072 (default) | Higher quality, more expensive |
| `text-embedding-ada-002` | 1536 (fixed) | Legacy model |

#### Implementation

Update existing embedding provider to use SDK:

```csharp
public class OpenAIEmbeddingProvider : IEmbeddingProvider
{
    private readonly EmbeddingClient _client;
    
    public async Task<float[]> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        var embedding = await _client.GenerateEmbeddingAsync(text, cancellationToken: cancellationToken);
        return embedding.Value.ToFloats().ToArray();
    }
    
    public async Task<IList<float[]>> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default)
    {
        var embeddings = await _client.GenerateEmbeddingsAsync(
            texts.ToList(),
            cancellationToken: cancellationToken);
        
        return embeddings.Value
            .Select(e => e.ToFloats().ToArray())
            .ToList();
    }
}
```

---

### 8. Image Generation (DALL-E)

**Priority:** LOW  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Migrate to SDK `ImageClient`

#### Overview

The SDK's `ImageClient` is now used for DALL-E image generation with proper size/quality/style mapping.

#### SDK Usage

```csharp
using OpenAI.Images;

ImageClient client = new("dall-e-3", apiKey);

// Basic generation
GeneratedImage image = await client.GenerateImageAsync(
    "A futuristic city at sunset");

// With options
ImageGenerationOptions options = new()
{
    Quality = GeneratedImageQuality.High,
    Size = GeneratedImageSize.W1792xH1024,
    Style = GeneratedImageStyle.Vivid,
    ResponseFormat = GeneratedImageFormat.Bytes
};

GeneratedImage image = await client.GenerateImageAsync(prompt, options);
BinaryData imageBytes = image.ImageBytes;
```

#### Implementation

Update `OpenAIImageProvider` to use SDK:

```csharp
public class OpenAIImageProvider : IImageGenerationProvider
{
    private readonly ImageClient _client;
    
    public async Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        var options = new ImageGenerationOptions
        {
            Quality = MapQuality(request.Quality),
            Size = MapSize(request.Size),
            Style = MapStyle(request.Style),
            ResponseFormat = GeneratedImageFormat.Bytes
        };
        
        var image = await _client.GenerateImageAsync(
            request.Prompt,
            options,
            cancellationToken);
        
        return new ImageGenerationResponse
        {
            Success = true,
            Images = new List<GeneratedImage>
            {
                new GeneratedImage
                {
                    Base64Data = Convert.ToBase64String(image.Value.ImageBytes.ToArray()),
                    RevisedPrompt = image.Value.RevisedPrompt,
                    MediaType = "image/png"
                }
            }
        };
    }
}
```

---

### 9. Vision (Image Understanding)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ✅ Implemented  
**Target:** Already working, document enhancements

#### Overview

GPT-4o and GPT-4o-mini support image understanding via `ChatMessageContentPart.CreateImagePart`.

#### Current Implementation

```csharp
// In OpenAIProvider.ConvertToOpenAIMessage
private static OpenAIChatMessage ConvertToOpenAIMessage(ChatMessage message)
{
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

#### Enhancements

1. **Image URL support** - Direct URLs instead of base64
2. **Image detail control** - `low`, `high`, `auto` quality settings
3. **Multiple images** - Already supported

---

### 10. Assistants API with RAG

**Priority:** LOW  
**Complexity:** High  
**Status:** ❌ Not Started  
**Target:** Persistent threads with file search

#### Overview

The Assistants API provides persistent conversation threads with built-in file search (RAG), code interpreter, and function calling.

#### SDK Usage

```csharp
using OpenAI.Assistants;
using OpenAI.Files;
using OpenAI.VectorStores;

OpenAIClient openAIClient = new(apiKey);
OpenAIFileClient fileClient = openAIClient.GetOpenAIFileClient();
AssistantClient assistantClient = openAIClient.GetAssistantClient();

// Upload file
OpenAIFile file = await fileClient.UploadFileAsync(
    File.OpenRead("knowledge_base.pdf"),
    "knowledge_base.pdf",
    FileUploadPurpose.Assistants);

// Create assistant with file search
AssistantCreationOptions options = new()
{
    Name = "Knowledge Assistant",
    Instructions = "You are a helpful assistant that answers questions based on uploaded documents.",
    Tools =
    {
        new FileSearchToolDefinition(),
        new CodeInterpreterToolDefinition()
    },
    ToolResources = new()
    {
        FileSearch = new()
        {
            NewVectorStores =
            {
                new VectorStoreCreationHelper([file.Id])
            }
        }
    }
};

Assistant assistant = await assistantClient.CreateAssistantAsync("gpt-4o", options);

// Create thread and run
ThreadCreationOptions threadOptions = new()
{
    InitialMessages = { "What does the document say about X?" }
};

ThreadRun run = await assistantClient.CreateThreadAndRunAsync(assistant.Id, threadOptions);

// Poll for completion
do
{
    await Task.Delay(1000);
    run = await assistantClient.GetRunAsync(run.ThreadId, run.Id);
} while (!run.Status.IsTerminal);

// Get messages
var messages = await assistantClient.GetMessagesAsync(run.ThreadId);
```

#### Use Cases

1. **Document Q&A** - Upload documents and ask questions
2. **Code Analysis** - Analyze code with code interpreter
3. **Persistent Conversations** - Long-running threads
4. **Knowledge Base** - Vector store for RAG

#### Implementation Considerations

- **Requires file storage** - Files must be uploaded to OpenAI
- **Async processing** - Runs are async, require polling
- **Cost** - Vector store storage has ongoing costs
- **Rate limits** - Separate from chat API limits

---

### 11. Web Search (Responses API)

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** Real-time web search in responses

#### Overview

The Responses API provides built-in web search capability, similar to Gemini's Google Search grounding.

#### SDK Usage

```csharp
using OpenAI.Responses;

OpenAIResponseClient client = new("gpt-4o-mini", apiKey);

OpenAIResponse response = await client.CreateResponseAsync(
    userInputText: "What's the latest news about AI?",
    new ResponseCreationOptions
    {
        Tools = { ResponseTool.CreateWebSearchTool() }
    });

foreach (ResponseItem item in response.OutputItems)
{
    if (item is WebSearchCallResponseItem webSearch)
    {
        Console.WriteLine($"[Web Search] Status: {webSearch.Status}");
    }
    else if (item is MessageResponseItem message)
    {
        Console.WriteLine(message.Content?.FirstOrDefault()?.Text);
    }
}
```

#### Implementation

```csharp
public class OpenAIWebSearchService
{
    private readonly OpenAIResponseClient _client;
    
    public async Task<WebSearchResponse> SearchAndRespondAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var response = await _client.CreateResponseAsync(
            query,
            new ResponseCreationOptions
            {
                Tools = { ResponseTool.CreateWebSearchTool() }
            },
            cancellationToken);
        
        return new WebSearchResponse
        {
            Text = ExtractText(response),
            Sources = ExtractSources(response)
        };
    }
}
```

---

### 12. File Search (Responses API)

**Priority:** MEDIUM  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Search uploaded files

#### Overview

File search in the Responses API allows searching through previously uploaded and indexed files.

#### SDK Usage

```csharp
OpenAIResponseClient client = new("gpt-4o-mini", apiKey);

// Create file search tool with vector store
ResponseTool fileSearchTool = ResponseTool.CreateFileSearchTool(
    vectorStoreIds: [existingVectorStoreId]);

OpenAIResponse response = await client.CreateResponseAsync(
    userInputText: "What does the document say about revenue?",
    new ResponseCreationOptions
    {
        Tools = { fileSearchTool }
    });

foreach (ResponseItem item in response.OutputItems)
{
    if (item is FileSearchCallResponseItem fileSearch)
    {
        Console.WriteLine($"[File Search] Queries: {string.Join(", ", fileSearch.Queries)}");
    }
}
```

---

### 13. Realtime API

**Priority:** LOW  
**Complexity:** High  
**Status:** ❌ Not Started  
**Target:** WebSocket-based real-time audio/video

#### Overview

The Realtime API enables low-latency, real-time audio and video conversations over WebSocket.

#### SDK Usage

```csharp
using OpenAI.Realtime;

RealtimeConversationClient client = new("gpt-4o-realtime-preview", apiKey);

await using RealtimeConversationSession session = await client.StartConversationSessionAsync();

// Configure session
await session.ConfigureSessionAsync(new ConversationSessionOptions
{
    Voice = ConversationVoice.Alloy,
    InputAudioFormat = ConversationAudioFormat.Pcm16,
    OutputAudioFormat = ConversationAudioFormat.Pcm16
});

// Handle events
session.OnConversationUpdate += (update) =>
{
    if (update is ConversationItemStreamingAudioDeltaUpdate audioDelta)
    {
        // Play audio delta
    }
};

// Send audio
await session.SendInputAudioAsync(audioBytes);
```

#### Use Cases

1. **Voice Assistants** - Real-time voice conversations
2. **Live Translation** - Real-time speech translation
3. **Interactive Tutoring** - Voice-based learning

---

### 14. Batch API

**Priority:** LOW  
**Complexity:** Medium  
**Status:** ❌ Not Started  
**Target:** Bulk processing at reduced cost

#### Overview

The Batch API allows processing large volumes of requests at 50% cost reduction with 24-hour completion windows.

#### SDK Usage

```csharp
using OpenAI.Batch;
using OpenAI.Files;

OpenAIClient openAIClient = new(apiKey);
BatchClient batchClient = openAIClient.GetBatchClient();
OpenAIFileClient fileClient = openAIClient.GetOpenAIFileClient();

// Create batch file (JSONL format)
var batchRequests = new[]
{
    new { custom_id = "req-1", method = "POST", url = "/v1/chat/completions", body = new { model = "gpt-4o-mini", messages = new[] { new { role = "user", content = "Hello" } } } },
    new { custom_id = "req-2", method = "POST", url = "/v1/chat/completions", body = new { model = "gpt-4o-mini", messages = new[] { new { role = "user", content = "World" } } } }
};

// Upload batch file
var batchFile = await fileClient.UploadFileAsync(
    CreateJsonlStream(batchRequests),
    "batch_input.jsonl",
    FileUploadPurpose.Batch);

// Create batch
var batch = await batchClient.CreateBatchAsync(
    batchFile.Id,
    "/v1/chat/completions",
    "24h");

// Check status
batch = await batchClient.GetBatchAsync(batch.Id);
Console.WriteLine($"Status: {batch.Status}");
```

---

### 15. Fine-Tuning

**Priority:** LOW  
**Complexity:** High  
**Status:** ❌ Not Started  
**Target:** Custom model training

#### Overview

Fine-tune GPT models on custom data for specialized tasks.

#### SDK Usage

```csharp
using OpenAI.FineTuning;
using OpenAI.Files;

OpenAIClient openAIClient = new(apiKey);
FineTuningClient fineTuningClient = openAIClient.GetFineTuningClient();
OpenAIFileClient fileClient = openAIClient.GetOpenAIFileClient();

// Upload training data
var trainingFile = await fileClient.UploadFileAsync(
    File.OpenRead("training_data.jsonl"),
    "training_data.jsonl",
    FileUploadPurpose.FineTune);

// Create fine-tuning job
var job = await fineTuningClient.CreateJobAsync(
    trainingFile.Id,
    "gpt-4o-mini-2024-07-18",
    new FineTuningOptions
    {
        Suffix = "my-custom-model",
        Hyperparameters = new()
        {
            NumberOfEpochs = 3
        }
    });

// Monitor progress
await foreach (var evt in fineTuningClient.GetJobEventsAsync(job.Id))
{
    Console.WriteLine($"[{evt.Level}] {evt.Message}");
}
```

---

### 16. Content Moderation

**Priority:** MEDIUM  
**Complexity:** Low  
**Status:** ❌ Not Started  
**Target:** Safety filtering for content

#### Overview

Use the Moderation API to filter harmful content in user inputs and AI outputs.

#### SDK Usage

```csharp
using OpenAI.Moderations;

ModerationClient client = new("omni-moderation-latest", apiKey);

ModerationResult result = await client.ClassifyTextAsync("Text to check");

if (result.Flagged)
{
    Console.WriteLine("Content was flagged");
    
    foreach (var category in result.Categories)
    {
        if (category.Flagged)
        {
            Console.WriteLine($"  {category.Category}: {category.Score:P}");
        }
    }
}
```

#### Moderation Categories

| Category | Description |
|----------|-------------|
| `hate` | Hate speech |
| `hate/threatening` | Threatening hate speech |
| `harassment` | Harassment content |
| `harassment/threatening` | Threatening harassment |
| `self-harm` | Self-harm content |
| `self-harm/intent` | Intent to self-harm |
| `self-harm/instructions` | Self-harm instructions |
| `sexual` | Sexual content |
| `sexual/minors` | Sexual content involving minors |
| `violence` | Violent content |
| `violence/graphic` | Graphic violence |

#### Implementation

```csharp
public interface IContentModerationService
{
    Task<ModerationResult> ModerateAsync(
        string content,
        CancellationToken cancellationToken = default);
    
    Task<bool> IsSafeAsync(
        string content,
        CancellationToken cancellationToken = default);
}

public class OpenAIModerationService : IContentModerationService
{
    private readonly ModerationClient _client;
    
    public async Task<ModerationResult> ModerateAsync(
        string content,
        CancellationToken cancellationToken = default)
    {
        return await _client.ClassifyTextAsync(content, cancellationToken: cancellationToken);
    }
    
    public async Task<bool> IsSafeAsync(
        string content,
        CancellationToken cancellationToken = default)
    {
        var result = await ModerateAsync(content, cancellationToken);
        return !result.Flagged;
    }
}
```

---

## API Endpoints to Add

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/openai/transcribe` | POST | Audio transcription | Medium |
| `/api/openai/tts` | POST | Text-to-speech | Medium |
| `/api/openai/moderate` | POST | Content moderation | Medium |
| `/api/openai/embeddings` | POST | Generate embeddings | High |
| `/api/chat/structured` | POST | Structured output | High |
| `/api/chat/audio` | POST | Audio chat | Medium |
| `/api/assistants` | CRUD | Assistants management | Low |

---

## Database Schema Changes

> ✅ **IMPLEMENTED**: OpenAI database tables (`audio_transcriptions`, `moderation_logs`) have been created in `database/23_openai_features.sql` and applied to both Docker and Desktop PostgreSQL instances.
> 
> **Note**: Function call logging uses the generic `gemini_function_calls` table (which has a `provider` column) or the `tool_calls` table with JSONB columns for cross-provider analytics.

### Function Call Logs

```sql
CREATE TABLE openai_function_calls (
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
    provider VARCHAR(32) DEFAULT 'OpenAI',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_openai_func_calls_message_id ON openai_function_calls(message_id);
CREATE INDEX idx_openai_func_calls_conversation_id ON openai_function_calls(conversation_id);
CREATE INDEX idx_openai_func_calls_user_id ON openai_function_calls(user_id);
CREATE INDEX idx_openai_func_calls_function_name ON openai_function_calls(function_name);
```

### Audio Transcriptions

```sql
CREATE TABLE audio_transcriptions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    file_name VARCHAR(256),
    file_size_bytes INTEGER,
    duration_seconds REAL,
    text TEXT NOT NULL,
    language VARCHAR(10),
    words_json JSONB,
    segments_json JSONB,
    model VARCHAR(64) DEFAULT 'whisper-1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transcriptions_user_id ON audio_transcriptions(user_id);
CREATE INDEX idx_transcriptions_created ON audio_transcriptions(created_at);
```

### Moderation Logs

```sql
CREATE TABLE moderation_logs (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128),
    content_hash VARCHAR(64) NOT NULL,
    flagged BOOLEAN NOT NULL,
    categories JSONB,
    category_scores JSONB,
    model VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moderation_user_id ON moderation_logs(user_id);
CREATE INDEX idx_moderation_flagged ON moderation_logs(flagged) WHERE flagged = true;
```

---

## Frontend Integration

### Type Updates (frontend/src/types/chat.ts)

```typescript
// Function calling types
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

// Structured output
export interface StructuredOutputRequest<T> {
  prompt: string;
  systemPrompt?: string;
  schema: T;
}

// Reasoning models
export interface ReasoningOptions {
  effortLevel: 'low' | 'medium' | 'high';
  includeReasoning?: boolean;
}

// Audio
export interface AudioMessage {
  audioData: string; // base64
  format: 'wav' | 'mp3' | 'flac';
  transcript?: string;
}

export interface AudioResponse {
  audioData: string; // base64
  format: 'mp3' | 'wav';
  transcript: string;
  expiresAt: string;
}

// Moderation
export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

// Web search (Responses API)
export interface WebSearchResult {
  query: string;
  sources: WebSource[];
}

export interface WebSource {
  url: string;
  title: string;
  snippet: string;
}

// Send message request updates
export interface SendMessageRequest {
  // ... existing fields
  
  // OpenAI-specific options
  enableFunctionCalling?: boolean;
  enableWebSearch?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
  responseFormat?: 'text' | 'json_object' | 'json_schema';
  jsonSchema?: object;
  audioInput?: AudioMessage;
  requestAudioOutput?: boolean;
  audioVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

// Streaming events
export type OpenAIStreamEventType = 
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'reasoning'
  | 'audio'
  | 'web_search'
  | 'error'
  | 'done';

export interface OpenAIStreamEvent {
  type: OpenAIStreamEventType;
  data: unknown;
}
```

### UI Components to Create

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AudioRecorder` | Record audio for transcription/chat | Medium |
| `AudioPlayer` | Play audio responses | Medium |
| `FunctionCallDisplay` | Show function call execution | High |
| `StructuredOutputForm` | Define JSON schema | Medium |
| `ReasoningDisplay` | Show reasoning process | Medium |
| `WebSearchResults` | Display web search sources | Medium |
| `ModerationWarning` | Show moderation results | Medium |

---

## Configuration Updates

### appsettings.json

```json
{
  "AIProviders": {
    "OpenAI": {
      "Enabled": true,
      "ApiKey": "",
      "BaseUrl": "https://api.openai.com/v1",
      "DefaultModel": "gpt-4o",
      "MaxTokens": 4096,
      "Temperature": 0.7,
      "TimeoutSeconds": 120,
      
      "Features": {
        "EnableFunctionCalling": true,
        "EnableStructuredOutput": true,
        "EnableWebSearch": true,
        "EnableAudioChat": false,
        "EnableTranscription": false,
        "EnableModeration": true
      },
      
      "Reasoning": {
        "DefaultEffortLevel": "Medium",
        "IncludeReasoningInResponse": false,
        "MaxReasoningTokens": 4096
      },
      
      "Audio": {
        "DefaultVoice": "Alloy",
        "DefaultInputFormat": "Wav",
        "DefaultOutputFormat": "Mp3",
        "TranscriptionModel": "whisper-1",
        "EnableWordTimestamps": true
      },
      
      "Moderation": {
        "Enabled": true,
        "Model": "omni-moderation-latest",
        "BlockOnFlag": false,
        "LogAllRequests": false
      },
      
      "Embeddings": {
        "Model": "text-embedding-3-small",
        "Dimensions": 1536,
        "BatchSize": 100
      },
      
      "ImageGeneration": {
        "DefaultModel": "dall-e-3",
        "DefaultSize": "1024x1024",
        "DefaultQuality": "standard",
        "DefaultStyle": "vivid"
      }
    }
  }
}
```

### Configuration Classes

```csharp
public class OpenAISettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string DefaultModel { get; set; } = "gpt-4o";
    public int MaxTokens { get; set; } = 4096;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    
    // Feature flags
    public OpenAIFeaturesConfig Features { get; set; } = new();
    
    // Reasoning models config
    public OpenAIReasoningConfig Reasoning { get; set; } = new();
    
    // Audio config
    public OpenAIAudioConfig Audio { get; set; } = new();
    
    // Moderation config
    public OpenAIModerationConfig Moderation { get; set; } = new();
    
    // Embeddings config
    public OpenAIEmbeddingsConfig Embeddings { get; set; } = new();
    
    // Image generation config
    public OpenAIImageConfig ImageGeneration { get; set; } = new();
}

public class OpenAIFeaturesConfig
{
    public bool EnableFunctionCalling { get; set; } = true;
    public bool EnableStructuredOutput { get; set; } = true;
    public bool EnableWebSearch { get; set; } = true;
    public bool EnableAudioChat { get; set; } = false;
    public bool EnableTranscription { get; set; } = false;
    public bool EnableModeration { get; set; } = true;
}

public class OpenAIReasoningConfig
{
    public string DefaultEffortLevel { get; set; } = "Medium";
    public bool IncludeReasoningInResponse { get; set; } = false;
    public int MaxReasoningTokens { get; set; } = 4096;
}

public class OpenAIAudioConfig
{
    public string DefaultVoice { get; set; } = "Alloy";
    public string DefaultInputFormat { get; set; } = "Wav";
    public string DefaultOutputFormat { get; set; } = "Mp3";
    public string TranscriptionModel { get; set; } = "whisper-1";
    public bool EnableWordTimestamps { get; set; } = true;
}

public class OpenAIModerationConfig
{
    public bool Enabled { get; set; } = true;
    public string Model { get; set; } = "omni-moderation-latest";
    public bool BlockOnFlag { get; set; } = false;
    public bool LogAllRequests { get; set; } = false;
}

public class OpenAIEmbeddingsConfig
{
    public string Model { get; set; } = "text-embedding-3-small";
    public int Dimensions { get; set; } = 1536;
    public int BatchSize { get; set; } = 100;
}

public class OpenAIImageConfig
{
    public string DefaultModel { get; set; } = "dall-e-3";
    public string DefaultSize { get; set; } = "1024x1024";
    public string DefaultQuality { get; set; } = "standard";
    public string DefaultStyle { get; set; } = "vivid";
}
```

---

## Testing Strategy

### Unit Tests

1. **Function calling handler tests**
   - Tool definition generation from plugins
   - Argument parsing and validation
   - Result serialization

2. **Schema generation tests**
   - Primitive types mapping
   - Nested object handling
   - Array and list types
   - Nullable types

3. **Response parsing tests**
   - Tool call extraction
   - Reasoning output parsing
   - Audio response handling

4. **Configuration validation tests**
   - Setting validation
   - Default value handling

### Integration Tests

1. **End-to-end function calling flow**
   - Multi-turn tool conversations
   - Parallel tool execution
   - Error handling

2. **Structured output validation**
   - Schema compliance
   - Type coercion
   - Error messages

3. **Audio transcription**
   - Different formats
   - Timestamp accuracy

4. **Moderation**
   - Category detection
   - Score thresholds

### Manual Testing

1. Test each feature with real API
2. Verify frontend displays correctly
3. Check error handling and edge cases
4. Performance testing for streaming
5. Timeout handling for long operations

---

## Implementation Priority

### Phase 1 - High Priority (Weeks 1-2)

1. ✅ **Native Function Calling** - Replace Semantic Kernel dependency (COMPLETED)
2. ✅ **Structured Output** - JSON schema support (COMPLETED - via unified service)
3. ✅ **SDK Migration** - Update `OpenAIImageProvider` to use `ImageClient` (COMPLETED)
4. ✅ **Embeddings** - SDK `EmbeddingClient` with custom dimensions + token tracking (COMPLETED)

### Phase 2 - Medium Priority (Weeks 3-4)

5. **Reasoning Models** - o1/o3 support with Responses API
6. **Web Search** - Responses API integration
7. **Audio Transcription** - Whisper integration
8. **Content Moderation** - Input/output filtering

### Phase 3 - Lower Priority (Weeks 5-6)

9. **Audio Chat** - gpt-4o-audio-preview
10. **File Search** - Responses API
11. **Assistants API** - Persistent threads

### Phase 4 - Future (As Needed)

12. **Realtime API** - WebSocket voice
13. **Batch API** - Bulk processing
14. **Fine-Tuning** - Custom models

---

## Known Issues & Limitations

### SDK Considerations

1. **Responses API is Experimental** - Subject to breaking changes
2. **Assistants API is Beta** - Marked with `[Experimental]` attribute
3. **Audio models limited availability** - gpt-4o-audio-preview may have limited access

### Model-Specific Limitations

| Model | Limitation |
|-------|------------|
| o1, o1-mini, o3-mini | No temperature parameter |
| o1 | No streaming support |
| dall-e-3 | n=1 only (single image) |
| gpt-4o-audio-preview | Limited availability |

### Workarounds Needed

1. **Temperature retry** - Already implemented for o1 models
2. **Model detection** - Check model name for feature support
3. **Graceful degradation** - Fall back when features unavailable

---

## References

- [OpenAI .NET SDK Documentation](https://github.com/openai/openai-dotnet)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Chat Completions Guide](https://platform.openai.com/docs/guides/chat-completions)
- [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Responses API Guide](https://platform.openai.com/docs/api-reference/responses)
- [Audio Guide](https://platform.openai.com/docs/guides/audio)
- [Vision Guide](https://platform.openai.com/docs/guides/vision)
- [Assistants API Guide](https://platform.openai.com/docs/assistants/overview)
- [NuGet Package](https://www.nuget.org/packages/OpenAI)
