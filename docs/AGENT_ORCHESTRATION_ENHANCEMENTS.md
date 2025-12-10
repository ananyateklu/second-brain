# Agent Orchestration Layer Enhancements

> **Document Version**: 2.0
> **Created**: December 10, 2025
> **Updated**: December 10, 2025
> **Status**: ✅ Phase 1 & 2 Complete
> **Goal**: Make the agentic orchestration layer super effective by implementing latest SDK best practices

## Overview

This document tracks the enhancement of all 6 agent streaming strategies to leverage the latest SDK features and best practices from each AI provider.

---

## Implementation Status Dashboard

### Quick Reference

| Provider | Strategy File | Before | After | Status |
|----------|---------------|--------|-------|--------|
| Anthropic | `AnthropicStreamingStrategy.cs` | 7/10 | 9/10 | ✅ Complete |
| Gemini | `GeminiStreamingStrategy.cs` | 7/10 | 9/10 | ✅ Complete (Official SDK + Token Tracking) |
| OpenAI | `OpenAIStreamingStrategy.cs` | 6/10 | 8/10 | ✅ Complete |
| Ollama | `OllamaStreamingStrategy.cs` | 6/10 | 8/10 | ✅ Complete |
| Grok | `GrokStreamingStrategy.cs` | 5/10 | 9/10 | ✅ Complete |
| SK Fallback | `SemanticKernelStreamingStrategy.cs` | 7/10 | 7/10 | ✅ No changes needed |

### Cross-Provider Enhancements

| Enhancement | Status | Files Affected |
|-------------|--------|----------------|
| Unified Token Tracking | ✅ Complete | All strategies, `AgentModels.cs` |
| Standardized Retry Policy | ✅ Complete | `AgentRetryPolicy.cs`, all strategies |
| Provider Capability Detection | ✅ Complete | `ProviderCapabilities.cs` |
| Enhanced Error Handling | ✅ Complete | `BaseAgentStreamingStrategy` (CategorizedErrorEvent) |
| OpenAI Strict Mode | ✅ Complete | `OpenAIFunctionDeclarationBuilder`, `PluginToolBuilder` |
| Retry Helpers | ✅ Complete | `BaseAgentStreamingStrategy` (WithRetryAsync) |

---

## What Was Implemented

### Phase 1: Foundation (Cross-Provider) ✅ COMPLETE

#### 1.1 Token Fields Added to AgentStreamEvent
**File**: `Services/Agents/Models/AgentModels.cs`

Added new fields to `AgentStreamEvent`:
- `InputTokens` - Number of input/prompt tokens
- `OutputTokens` - Number of output/completion tokens
- `CachedTokens` - Number of cached tokens (Anthropic, Gemini)
- `ReasoningTokens` - Number of reasoning tokens (Claude, Grok Think Mode)
- `TotalTokens` - Sum of all token types
- `GrokSearchSources` - Search results from Grok Live Search
- `GrokThinkingStep` - Reasoning steps from Grok Think Mode

Added new `AgentEventType` values:
- `TokenUsage` - Token usage information event
- `ReasoningStep` - Reasoning/thinking step event

Added new `AgentRequest` fields:
- `ReasoningEffort` - Effort level (low/medium/high) for Claude Opus 4.5 and Grok
- `EnableThinkMode` - Enable Think Mode for Grok models

#### 1.2 ProviderCapabilities Helper
**File**: `Services/Agents/Helpers/ProviderCapabilities.cs`

Static helper class with methods:
- `SupportsNativeThinking(provider, model)` - Detects thinking support
- `SupportsGrounding(provider)` - Gemini, Grok
- `SupportsXSearch(provider)` - Grok only
- `SupportsCodeExecution(provider)` - Gemini, Grok
- `SupportsFunctionCalling(provider, model)` - All providers
- `SupportsStrictToolMode(provider, model)` - OpenAI GPT-4o
- `SupportsEffortControl(provider, model)` - Claude Opus 4.5, Grok
- `SupportsPromptCaching(provider)` - Anthropic, Gemini, OpenAI
- `GetMaxThinkingBudget(provider, model)` - Token limits
- `NormalizeEffortLevel(effort)` - Normalize effort strings
- `GetFeatureSummary(provider, model)` - Complete feature summary

#### 1.3 AgentRetryPolicy Helper
**File**: `Services/Agents/Helpers/AgentRetryPolicy.cs`

Polly-based retry policy with:
- Exponential backoff: `2^n * 1000ms`
- Jitter: Random 0-1000ms
- Max retries: 3 (configurable)
- Max delay: 60 seconds
- Retry-After header support
- Rate limit exception handling
- Retriable error detection

Custom exception types:
- `RateLimitException` - With optional RetryAfterSeconds
- `TransientApiException` - For transient API errors

---

### Phase 2: Provider-Specific Enhancements ✅ COMPLETE

#### 2.1 Anthropic Strategy
**File**: `Services/Agents/Strategies/AnthropicStreamingStrategy.cs`

Implemented:
- ✅ **Token usage tracking** - Captures InputTokens, OutputTokens, CacheCreationTokens, CacheReadTokens
- ✅ **Token logging** - Logs final token usage for monitoring
- ✅ **EndEventWithTokens** - Emits token usage in End event

Not Implemented (Deferred):
- ❌ Effort parameter (requires SDK update for Claude Opus 4.5)
- ❌ Fine-grained tool streaming (requires beta header support)
- ❌ 1-hour cache duration (requires extended thinking sessions)

#### 2.2 OpenAI Strategy
**File**: `Services/Agents/Strategies/OpenAIStreamingStrategy.cs`

Implemented:
- ✅ **Token usage tracking** - Captures from Done stream event
- ✅ **Token logging** - Logs final token usage
- ✅ **EndEventWithTokens** - Emits token usage in End event

Not Implemented (Deferred):
- ❌ Strict mode for tools (can be added to OpenAIFunctionDeclarationBuilder)
- ❌ o1/o3 reasoning model special handling

#### 2.3 Grok Strategy - MAJOR ENHANCEMENTS
**File**: `Services/Agents/Strategies/GrokStreamingStrategy.cs`

Implemented:
- ✅ **Think Mode support** - Auto-detects complex queries
- ✅ **Reasoning effort control** - Uses `ReasoningEffort` from request
- ✅ **Token usage tracking** - Input, Output, and Reasoning tokens
- ✅ **Reasoning event handling** - Emits ThinkingEvent for reasoning
- ✅ **GrokReasoningStepEvent** - Structured reasoning steps
- ✅ **Search result handling** - GrokSearchEvent for Live Search
- ✅ **Search status events** - "Searching the web..." status

Auto-enable Think Mode triggers:
- Query contains "analyze", "explain why", "step by step"
- Query contains "think through", "reason", "complex"

Not Implemented (Deferred):
- ❌ X/Twitter search tool (x_search)
- ❌ Agentic server-side tools

#### 2.4 Gemini Strategy
**File**: `Services/Agents/Strategies/GeminiStreamingStrategy.cs`

Implemented:
- ✅ **Official Google.GenAI SDK** - Already using official SDK v0.8.0 (latest as of Dec 10, 2025)
- ✅ **Actual token tracking** - Uses `UsageMetadata` from SDK (InputTokens, OutputTokens, CachedTokens)
- ✅ **Grounding cost tracking** - Logs source count and estimated cost ($14/1k queries)
- ✅ **GeminiStreamEvent token fields** - Added InputTokens, OutputTokens, TotalTokens, CachedTokens
- ✅ **EndEventWithTokens** - Emits actual token usage from UsageMetadata

SDK Features Used:
- `Google.GenAI` v0.8.0 (official Google package)
- `UsageMetadata.PromptTokenCount`, `CandidatesTokenCount`, `TotalTokenCount`, `CachedContentTokenCount`
- Native function calling via `FunctionDeclaration`
- Google Search grounding
- Code execution

Not Implemented (Deferred):
- ❌ File upload for code execution
- ❌ Matplotlib chart support

#### 2.5 Ollama Strategy
**File**: `Services/Agents/Strategies/OllamaStreamingStrategy.cs`

Implemented:
- ✅ **Token usage tracking** - Captures from Done event
- ✅ **Thinking mode detection** - Uses ProviderCapabilities
- ✅ **Thinking event handling** - Handles native thinking from deepseek-r1, qwen
- ✅ **Token logging** - Logs final token usage
- ✅ **EndEventWithTokens** - Emits token usage in End event

Models with thinking support detected:
- deepseek-r1, deepseek-coder
- qwen (with thinking)
- reflection models

---

### Phase 3: DI Registration ✅ COMPLETE

**File**: `Extensions/ServiceCollectionExtensions.cs`

Added:
```csharp
services.AddSingleton<IAgentRetryPolicy, AgentRetryPolicy>();
```

---

## Files Modified

### New Files Created
- ✅ `Services/Agents/Helpers/AgentRetryPolicy.cs`
- ✅ `Services/Agents/Helpers/ProviderCapabilities.cs`

### Files Modified
- ✅ `Services/Agents/Models/AgentModels.cs` - Token fields, new event types, new request fields
- ✅ `Services/Agents/Strategies/BaseAgentStreamingStrategy.cs` - EndEventWithTokens, GrokSearchEvent, GrokReasoningStepEvent, **WithRetryAsync, CategorizedErrorEvent, IAgentRetryPolicy constructor param**
- ✅ `Services/Agents/Strategies/AnthropicStreamingStrategy.cs` - Token tracking, **IAgentRetryPolicy**
- ✅ `Services/Agents/Strategies/GeminiStreamingStrategy.cs` - **Actual token tracking from UsageMetadata, IAgentRetryPolicy**
- ✅ `Services/Agents/Strategies/OpenAIStreamingStrategy.cs` - Token tracking, **strict mode detection, IAgentRetryPolicy**
- ✅ `Services/Agents/Strategies/OllamaStreamingStrategy.cs` - Token tracking, thinking mode, **IAgentRetryPolicy**
- ✅ `Services/Agents/Strategies/GrokStreamingStrategy.cs` - Think Mode, reasoning trace, search events, **IAgentRetryPolicy**
- ✅ `Services/Agents/Strategies/SemanticKernelStreamingStrategy.cs` - **IAgentRetryPolicy**
- ✅ `Services/AI/Providers/GeminiProvider.cs` - **Added token fields to GeminiStreamEvent, capture UsageMetadata**
- ✅ `Services/AI/FunctionCalling/OpenAIFunctionDeclarationBuilder.cs` - **Added useStrictMode parameter**
- ✅ `Services/Agents/Helpers/IPluginToolBuilder.cs` - **Added useStrictMode to BuildOpenAITools**
- ✅ `Services/Agents/Helpers/PluginToolBuilder.cs` - **Strict mode support for OpenAI**
- ✅ `Extensions/ServiceCollectionExtensions.cs` - Register AgentRetryPolicy
- ✅ `SecondBrain.Application.csproj` - **Updated Google.GenAI to v0.8.0**

### Phase 4: Gemini File Upload

**New Files:**
- ✅ `Controllers/GeminiFilesController.cs` - REST API for file management

**Modified Files:**
- ✅ `Services/AI/Providers/GeminiProvider.cs` - Added file upload methods
- ✅ `Services/AI/Models/AIResponse.cs` - Added `GeminiUploadedFile`, `GeminiFileUploadRequest`, `GeminiFileReference` models
- ✅ `Services/Agents/Models/AgentModels.cs` - Added `FileReferences`, `EnableCodeExecution` to `AgentRequest`
- ✅ `Services/Agents/Strategies/GeminiStreamingStrategy.cs` - File reference integration with code execution

---

## Testing Status

- ✅ All 26 existing unit tests pass
- ✅ Build succeeds with no errors (0 warnings)
- ✅ Token tracking emits for all providers
- ✅ Think Mode auto-detection works for Grok
- ✅ Reasoning events emitted correctly

---

## Future Enhancements (Not Yet Implemented)

### High Priority
1. ~~**Apply retry policy to strategies**~~ ✅ Complete - All strategies now accept `IAgentRetryPolicy`
2. ~~**OpenAI strict mode for tools**~~ ✅ Complete - `useStrictMode` parameter in OpenAIFunctionDeclarationBuilder
3. **Effort parameter for Anthropic** - When SDK supports Claude Opus 4.5 effort control

### Medium Priority
4. ~~**Gemini SDK migration**~~ ✅ Already using official Google.GenAI SDK v0.8.0
5. **Grok X/Twitter search** - Requires migration to xAI SDK (`xai-sdk`) for Agent Tools API
   - Live Search API deprecated Dec 15, 2025
   - New API uses `x_search` tool with `from_date`, `to_date`, `allowed_x_handles` params
   - See [xAI Search Tools docs](https://docs.x.ai/docs/guides/tools/search-tools)
6. ~~**Enhanced error categorization**~~ ✅ Complete - `CategorizedErrorEvent()` in BaseAgentStreamingStrategy

### Low Priority
7. ~~**File upload for Gemini code execution**~~ ✅ Complete - See section below
8. **Matplotlib chart support for Gemini**
9. **Agentic server-side tools for Grok**

---

## Gemini File Upload for Code Execution

### Overview
Gemini can now analyze uploaded files using its Python code execution sandbox. Upload CSV, JSON, or other data files and Gemini will automatically analyze them.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gemini/files/upload` | POST | Upload a file (multipart form) |
| `/api/gemini/files/upload/base64` | POST | Upload a file (base64 JSON) |
| `/api/gemini/files` | GET | List all uploaded files |
| `/api/gemini/files/{fileName}` | GET | Get file metadata |
| `/api/gemini/files/{fileName}` | DELETE | Delete a file |

### Usage Example

```bash
# Upload a CSV file
curl -X POST "http://localhost:5001/api/gemini/files/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.csv" \
  -F "displayName=Sales Data"

# Response:
{
  "name": "files/abc123",
  "displayName": "Sales Data",
  "mimeType": "text/csv",
  "sizeBytes": 1024,
  "uri": "https://generativelanguage.googleapis.com/v1beta/files/abc123",
  "state": "ACTIVE"
}
```

### Using Files with Agent

Include the file reference in your agent request:

```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "messages": [{"role": "user", "content": "Analyze this sales data"}],
  "enableCodeExecution": true,
  "fileReferences": [
    {
      "fileUri": "https://generativelanguage.googleapis.com/v1beta/files/abc123",
      "mimeType": "text/csv"
    }
  ]
}
```

### Supported File Types

**Data files (for code execution):**
- CSV (`text/csv`)
- JSON (`application/json`)
- Plain text (`text/plain`)
- XML (`application/xml`, `text/xml`)
- TSV (`text/tab-separated-values`)

**Images (for multimodal analysis):**
- PNG, JPEG, GIF, WebP

**Documents:**
- PDF (`application/pdf`)

### Implementation Files

- `GeminiProvider.cs` - File upload methods (`UploadFileAsync`, `UploadAndWaitAsync`, `GetFileAsync`, `DeleteFileAsync`, `ListFilesAsync`)
- `GeminiFilesController.cs` - REST API endpoints
- `AIResponse.cs` - `GeminiUploadedFile`, `GeminiFileUploadRequest`, `GeminiFileReference` models
- `AgentModels.cs` - `FileReferences` and `EnableCodeExecution` on `AgentRequest`
- `GeminiStreamingStrategy.cs` - Auto-enables code execution when files provided

---

## API Changes

### New AgentStreamEvent Fields

```typescript
interface AgentStreamEvent {
  // ... existing fields ...

  // NEW: Token usage (available on End events)
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;

  // NEW: Grok-specific
  grokSearchSources?: GrokSearchSource[];
  grokThinkingStep?: GrokThinkingStep;
}
```

### New AgentRequest Fields

```typescript
interface AgentRequest {
  // ... existing fields ...

  // NEW: Reasoning control
  reasoningEffort?: 'low' | 'medium' | 'high';
  enableThinkMode?: boolean;
}
```

### New Event Types

```typescript
enum AgentEventType {
  // ... existing types ...
  TokenUsage,     // Token usage information
  ReasoningStep,  // Reasoning/thinking step (Grok Think Mode)
}
```

---

## Rollback Plan

If issues arise:
1. Each enhancement is isolated to specific files
2. Git revert individual commits if needed
3. Token fields are optional (null by default)
4. New event types are additive (backward compatible)

---

## References

- [Anthropic Extended Thinking Docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Google GenAI SDK](https://cloud.google.com/blog/topics/developers-practitioners/introducing-google-gen-ai-net-sdk)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OllamaSharp Tool Support](https://awaescher.github.io/OllamaSharp/docs/tool-support.html)
- [Grok Think Mode](https://x.ai/news/grok-4-1/)

---

**Last Updated**: December 10, 2025
