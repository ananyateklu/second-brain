# Grok to xAI Provider Rename

**Date:** January 14, 2026
**Branch:** optimizations
**Summary:** Renamed all "Grok" provider references to "Xai" for consistency. Model names (e.g., `grok-2`, `grok-3`) remain unchanged as they are official xAI model identifiers.

---

## Table of Contents

1. [Overview](#overview)
2. [Files Renamed](#files-renamed)
3. [Class and Type Renames](#class-and-type-renames)
4. [Provider Registration Changes](#provider-registration-changes)
5. [Strategy Pattern Changes](#strategy-pattern-changes)
6. [Helper and Utility Changes](#helper-and-utility-changes)
7. [Frontend Changes](#frontend-changes)
8. [Test File Changes](#test-file-changes)
9. [What Was NOT Changed](#what-was-not-changed)
10. [Verification](#verification)

---

## Overview

This change standardizes the AI provider naming convention:

| Before | After |
|--------|-------|
| Provider name: `"grok"` or `"xai"` | Provider name: `"xai"` only |
| Class names: `GrokProvider`, `GrokSchemaAdapter`, etc. | Class names: `XaiProvider`, `XaiSchemaAdapter`, etc. |
| File names: `GrokProvider.cs`, etc. | File names: `XaiProvider.cs`, etc. |

**Important:** Model names like `grok-2`, `grok-3`, `grok-beta` remain unchanged because these are the official model identifiers from xAI's API.

---

## Files Renamed

### Backend Source Files

| Original Path | New Path |
|---------------|----------|
| `src/SecondBrain.Application/Services/AI/Providers/GrokProvider.cs` | `src/SecondBrain.Application/Services/AI/Providers/XaiProvider.cs` |
| `src/SecondBrain.Application/Services/Agents/Strategies/GrokStreamingStrategy.cs` | `src/SecondBrain.Application/Services/Agents/Strategies/XaiStreamingStrategy.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/Adapters/GrokSchemaAdapter.cs` | `src/SecondBrain.Application/Services/AI/StructuredOutput/Adapters/XaiSchemaAdapter.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/Providers/GrokStructuredOutputService.cs` | `src/SecondBrain.Application/Services/AI/StructuredOutput/Providers/XaiStructuredOutputService.cs` |

### Test Files

| Original Path | New Path |
|---------------|----------|
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/GrokProviderTests.cs` | `tests/SecondBrain.Tests.Unit/Application/Services/AI/XaiProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/Providers/GrokProviderTests.cs` | `tests/SecondBrain.Tests.Unit/Application/Services/AI/Providers/XaiProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/Agents/Strategies/GrokStreamingStrategyTests.cs` | `tests/SecondBrain.Tests.Unit/Application/Services/Agents/Strategies/XaiStreamingStrategyTests.cs` |

---

## Class and Type Renames

### Provider Classes

```csharp
// Before
public class GrokProvider : IAIProvider
{
    public const string HttpClientName = "Grok";
    public string ProviderName => "Grok";
}

// After
public class XaiProvider : IAIProvider
{
    public const string HttpClientName = "Xai";
    public string ProviderName => "Xai";
}
```

### Schema Adapter

```csharp
// Before
public static class GrokSchemaAdapter { ... }

// After
public static class XaiSchemaAdapter { ... }
```

### Structured Output Service

```csharp
// Before
public class GrokStructuredOutputService : IStructuredOutputService { ... }

// After
public class XaiStructuredOutputService : IStructuredOutputService { ... }
```

### Streaming Strategy

```csharp
// Before
public class GrokStreamingStrategy : BaseAgentStreamingStrategy { ... }

// After
public class XaiStreamingStrategy : BaseAgentStreamingStrategy { ... }
```

---

## Provider Registration Changes

### AIProviderFactory.cs

**Location:** `src/SecondBrain.Application/Services/AI/AIProviderFactory.cs`

```csharp
// Before - supported both "grok" and "xai"
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "openai", typeof(Providers.OpenAIProvider) },
    { "gemini", typeof(Providers.GeminiProvider) },
    { "anthropic", typeof(Providers.AnthropicProvider) },
    { "ollama", typeof(Providers.OllamaProvider) },
    { "grok", typeof(Providers.GrokProvider) },
    { "xai", typeof(Providers.GrokProvider) },  // Alias removed
    { "cohere", typeof(Providers.CohereProvider) }
};

// After - only "xai" supported
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "openai", typeof(Providers.OpenAIProvider) },
    { "gemini", typeof(Providers.GeminiProvider) },
    { "anthropic", typeof(Providers.AnthropicProvider) },
    { "ollama", typeof(Providers.OllamaProvider) },
    { "xai", typeof(Providers.XaiProvider) },
    { "cohere", typeof(Providers.CohereProvider) }
};
```

### ServiceCollectionExtensions.cs

**Location:** `src/SecondBrain.API/Extensions/ServiceCollectionExtensions.cs`

```csharp
// Before
services.AddSingleton<GrokProvider>();
services.AddScoped<IAgentStreamingStrategy, GrokStreamingStrategy>();
services.AddSingleton<IProviderStructuredOutputService, GrokStructuredOutputService>();

// After
services.AddSingleton<XaiProvider>();
services.AddScoped<IAgentStreamingStrategy, XaiStreamingStrategy>();
services.AddSingleton<IProviderStructuredOutputService, XaiStructuredOutputService>();
```

---

## Strategy Pattern Changes

### XaiStreamingStrategy.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Strategies/XaiStreamingStrategy.cs`

```csharp
// Before - supported both "grok" and "xai"
public override IReadOnlyList<string> SupportedProviders => new[] { "grok", "xai" };

// After - only "xai" supported
public override IReadOnlyList<string> SupportedProviders => new[] { "xai" };
```

### SemanticKernelStreamingStrategy.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Strategies/SemanticKernelStreamingStrategy.cs`

```csharp
// Before
public override IReadOnlyList<string> SupportedProviders => new[] { "openai", "gemini", "ollama", "grok", "xai" };
case "grok":
case "xai":
    throw new InvalidOperationException("xAI/Grok provider should be handled by XaiStreamingStrategy");

// After
public override IReadOnlyList<string> SupportedProviders => new[] { "openai", "gemini", "ollama", "xai" };
case "xai":
    throw new InvalidOperationException("xAI provider should be handled by XaiStreamingStrategy");
```

---

## Helper and Utility Changes

### ProviderCapabilities.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Helpers/ProviderCapabilities.cs`

All instances of `"grok" or "xai"` pattern matching changed to just `"xai"`:

```csharp
// Before (8 occurrences)
return providerLower switch
{
    "grok" or "xai" => true,
    // ...
};

// After
return providerLower switch
{
    "xai" => true,
    // ...
};
```

**Methods updated:**
- `SupportsNativeThinking()`
- `SupportsGrounding()`
- `SupportsXSearch()`
- `SupportsCodeExecution()`
- `SupportsFunctionCalling()`
- `SupportsEffortControl()`
- `GetValidEffortLevels()`
- `GetMaxThinkingBudget()`

### VoiceSession.cs

**Location:** `src/SecondBrain.Application/Services/Voice/Models/VoiceSession.cs`

```csharp
// Before
public bool IsGrokVoice =>
    Provider.Equals("grok", StringComparison.OrdinalIgnoreCase) ||
    Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);

// After
public bool IsGrokVoice =>
    Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);
```

### CreateConversationCommandValidator.cs

**Location:** `src/SecondBrain.Application/Commands/Chat/CreateConversation/CreateConversationCommandValidator.cs`

```csharp
// Before
private static readonly string[] ValidProviders = { "openai", "anthropic", "gemini", "ollama", "grok", "xai" };

// After
private static readonly string[] ValidProviders = { "openai", "anthropic", "gemini", "ollama", "xai" };
```

---

## Frontend Changes

### constants.ts

**Location:** `frontend/src/lib/constants.ts`

```typescript
// Before
export const AI_PROVIDERS = {
  XAI: 'Grok',
  // ...
};

// After
export const AI_PROVIDERS = {
  XAI: 'Xai',
  // ...
};
```

### multimodal-models.ts

**Location:** `frontend/src/utils/multimodal-models.ts`

```typescript
// Before
Grok: {
  provider: 'Grok',
  models: ['grok-2-vision-1212'],
}

// After
Xai: {
  provider: 'Xai',
  models: ['grok-2-vision-1212'],
}
```

### image-generation-models.ts

**Location:** `frontend/src/utils/image-generation-models.ts`

```typescript
// Before
Grok: {
  provider: 'Grok',
  models: ['grok-2-image', 'grok-2-image-1212'],
}

// After
Xai: {
  provider: 'Xai',
  models: ['grok-2-image', 'grok-2-image-1212'],
}
```

### Settings Components

Updated provider mappings in:
- `FocusSettings.tsx`
- `NoteSummarySettings.tsx`
- `rag-settings.constants.tsx`
- `ai/constants.ts`

---

## Test File Changes

### Unit Tests Updated

#### XaiProviderTests.cs (both files)

- Class references updated from `GrokProvider` to `XaiProvider`
- `HttpClientName` test updated to expect `"Xai"` instead of `"Grok"`
- `ProviderName` test updated to expect `"Xai"` instead of `"Grok"`

#### XaiStreamingStrategyTests.cs

```csharp
// Before - multiple tests
var request = new AgentRequest { Provider = "grok" };
_sut.SupportedProviders.Should().Contain("grok");
_sut.SupportedProviders.Should().HaveCount(2);

// After
var request = new AgentRequest { Provider = "xai" };
_sut.SupportedProviders.Should().Contain("xai");
_sut.SupportedProviders.Should().HaveCount(1);
```

#### Other Strategy Tests (removed "grok" from InlineData)

- `OpenAIStreamingStrategyTests.cs`
- `GeminiStreamingStrategyTests.cs`
- `OllamaStreamingStrategyTests.cs`
- `AnthropicStreamingStrategyTests.cs`
- `SemanticKernelStreamingStrategyTests.cs`

#### AIProviderFactoryTests.cs

- Removed `[InlineData("grok")]` entries
- Updated provider type expectations

#### ThinkingExtractorTests.cs

```csharp
// Before
[InlineData("grok", "grok-3")]

// After
[InlineData("xai", "grok-3")]
```

### Frontend Tests Updated

- `bound-store.test.ts` - Changed `chatProvider: 'Grok'` to `chatProvider: 'Xai'`
- `image-generation-models.test.ts` - Updated all 'Grok' assertions to 'Xai'
- `multimodal-models.test.ts` - Updated all 'Grok' assertions to 'Xai'
- `constants.test.ts` - Updated `AI_PROVIDERS.XAI` assertion

---

## What Was NOT Changed

The following items intentionally remain unchanged:

### 1. Model Names (Official xAI Identifiers)

These are the actual model names from xAI's API:

```
grok-2
grok-2-vision-1212
grok-2-image
grok-2-image-1212
grok-3
grok-3-mini
grok-beta
```

### 2. Internal Variable Names

Variable names like `grokMessages`, `grokParams`, `isGrok` in internal code remain unchanged as they're implementation details.

### 3. Grok-Specific Feature Names

Similar to how `ClaudeSearchSource` refers to Claude's search feature:

- `GrokSearchSource` - Type for Grok's web search results
- `GrokSearchSourcesCard` - React component for displaying Grok search
- `grok_search` - SSE event name for streaming
- `GrokSearchSources` property in `AgentStreamEvent`
- `GrokVoice` - Voice feature specific to xAI's realtime API
- `GrokImageProvider` - Image generation provider (feature-specific)

These refer to Grok model family features, not the provider name.

### 4. Model Context Database

`ModelContextDatabase.cs` contains model name mappings which correctly use `grok-*` model identifiers.

### 5. Multimodal Config Patterns

`MultimodalConfig.cs` contains glob patterns for model matching:

```csharp
"grok-2-vision*"
```

### 6. Configuration Files

`appsettings.json` and `appsettings.Development.json` contain model names in the XAI settings section which correctly use `grok-*` identifiers.

### 7. Data Model Types

Internal SDK types remain unchanged:
- `GrokToolStreamEvent`
- `GrokToolCallInfo`
- `GrokThinkModeOptions`
- `GrokFunctionCallingConfig`

---

## Verification

### Test Results

```
Passed!  - Failed: 0, Passed: 2686, Skipped: 0, Total: 2686 - SecondBrain.Tests.Unit.dll
Passed!  - Failed: 0, Passed:  251, Skipped: 0, Total:  251 - SecondBrain.Tests.Integration.dll
```

**Total: 2,937 tests passing**

### Build Status

```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

---

## Migration Notes

### For API Consumers

If you were using `"grok"` as a provider name in API requests, update to use `"xai"`:

```json
// Before
{
  "provider": "grok",
  "model": "grok-3"
}

// After
{
  "provider": "xai",
  "model": "grok-3"
}
```

### For Database Records

Existing database records with `provider = 'grok'` should be migrated:

```sql
UPDATE chat_conversations SET provider = 'xai' WHERE provider = 'grok';
UPDATE user_preferences SET chat_provider = 'xai' WHERE chat_provider = 'grok';
```

---

## Additional Changes (Second Pass)

After initial rename, the following additional changes were identified and fixed:

### Configuration Changes

**StructuredOutputSettings.cs** - Property renamed:
```csharp
// Before
public StructuredOutputProviderConfig Grok { get; set; }

// After
public StructuredOutputProviderConfig Xai { get; set; }
```

**XaiStructuredOutputService.cs** - Updated all references:
```csharp
// Before
_structuredSettings.Providers.Grok.Model
_structuredSettings.Providers.Grok.Enabled

// After
_structuredSettings.Providers.Xai.Model
_structuredSettings.Providers.Xai.Enabled
```

### Telemetry Changes

**ServiceCollectionExtensions.cs** - Telemetry tag updated:
```csharp
// Before
activity.SetTag("ai.provider", "Grok");

// After
activity.SetTag("ai.provider", "Xai");
```

### Controller Changes

**AgentController.cs** - Hardcoded provider list updated:
```csharp
// Before
new() { Name = "Grok", Supported = true, ... }

// After
new() { Name = "Xai", Supported = true, ... }
```

### Multimodal Config Changes

**MultimodalConfig.cs** - Dictionary keys updated:
```csharp
// Before
["Grok"] = new List<string> { ... }
["Grok"] = new HashSet<string> { ... }

// After
["Xai"] = new List<string> { ... }
["Xai"] = new HashSet<string> { ... }
```

### Frontend Provider Logo

**provider-logos.ts** - Removed 'grok' fallback:
```typescript
// Before
else if (normalizedName === 'xai' || normalizedName === 'grok')

// After
else if (normalizedName === 'xai')
```

### Documentation Comments Updated

Updated doc comments mentioning "Grok" as example provider in:
- `VoiceSession.cs`
- `GenerateImageRequest.cs`
- `IProviderStructuredOutputService.cs`
- `IStructuredOutputService.cs`
- `IImageGenerationProviderFactory.cs`
- `IImageGenerationProvider.cs`

---

## Files Changed Summary

| Category | Count |
|----------|-------|
| Files Renamed | 7 |
| Backend Source Files Modified | 18 |
| Backend Unit Test Files Modified | 13 |
| Frontend Source Files Modified | 9 |
| Frontend Test Files Modified | 4 |
| **Total Files Affected** | **51** |

---

*Document generated: January 14, 2026*
*Updated: January 14, 2026 (second pass)*
