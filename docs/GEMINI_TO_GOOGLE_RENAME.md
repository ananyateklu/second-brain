# Gemini to Google Provider Rename

**Date:** January 14, 2026
**Branch:** optimizations
**Summary:** Renamed all "Gemini" provider references to "Google" for consistency. Model names (e.g., `gemini-2.0-flash`) remain unchanged as they are official Google model identifiers.

---

## Table of Contents

1. [Overview](#overview)
2. [Files Renamed](#files-renamed)
3. [Class and Type Renames](#class-and-type-renames)
4. [Provider Registration Changes](#provider-registration-changes)
5. [Strategy Pattern Changes](#strategy-pattern-changes)
6. [Helper and Utility Changes](#helper-and-utility-changes)
7. [Service Changes](#service-changes)
8. [Validator Changes](#validator-changes)
9. [Frontend Changes](#frontend-changes)
10. [Test File Changes](#test-file-changes)
11. [What Was NOT Changed](#what-was-not-changed)
12. [Verification](#verification)

---

## Overview

This change standardizes the AI provider naming convention:

| Before | After |
|--------|-------|
| Provider name: `"gemini"` | Provider name: `"google"` |
| Class names: `GeminiProvider`, `GeminiSchemaAdapter`, etc. | Class names: `GoogleProvider`, `GoogleSchemaAdapter`, etc. |
| File names: `GeminiProvider.cs`, etc. | File names: `GoogleProvider.cs`, etc. |

**Important:** Model names like `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-pro` remain unchanged because these are the official model identifiers from Google's API.

---

## Files Renamed

### Backend Source Files

| Original Path | New Path |
|---------------|----------|
| `src/SecondBrain.Application/Services/AI/Providers/GeminiProvider.cs` | `GoogleProvider.cs` |
| `src/SecondBrain.Application/Services/AI/Providers/GeminiImageProvider.cs` | `GoogleImageProvider.cs` |
| `src/SecondBrain.Application/Services/Agents/Strategies/GeminiStreamingStrategy.cs` | `GoogleStreamingStrategy.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/Adapters/GeminiSchemaAdapter.cs` | `GoogleSchemaAdapter.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/IGeminiStructuredOutputService.cs` | `IGoogleStructuredOutputService.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/GeminiStructuredOutputService.cs` | `GoogleStructuredOutputService.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/Providers/GeminiStructuredOutputService.cs` | `GoogleStructuredOutputService.cs` |
| `src/SecondBrain.Application/Services/Embeddings/Providers/GeminiEmbeddingProvider.cs` | `GoogleEmbeddingProvider.cs` |

### Test Files

| Original Path | New Path |
|---------------|----------|
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/GeminiProviderTests.cs` | `GoogleProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/Providers/GeminiProviderTests.cs` | `GoogleProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/GeminiImageProviderTests.cs` | `GoogleImageProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/Agents/Strategies/GeminiStreamingStrategyTests.cs` | `GoogleStreamingStrategyTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/Embeddings/GeminiEmbeddingProviderTests.cs` | `GoogleEmbeddingProviderTests.cs` |

---

## Class and Type Renames

### Provider Classes

```csharp
// Before
public class GeminiProvider : IAIProvider
{
    public const string HttpClientName = "Gemini";
    public string ProviderName => "Gemini";
}

// After
public class GoogleProvider : IAIProvider
{
    public const string HttpClientName = "Google";
    public string ProviderName => "Google";
}
```

### Image Provider

```csharp
// Before
public class GeminiImageProvider : IImageGenerationProvider
{
    public string ProviderName => "Gemini";
}

// After
public class GoogleImageProvider : IImageGenerationProvider
{
    public string ProviderName => "Google";
}
```

### Embedding Provider

```csharp
// Before
public class GeminiEmbeddingProvider : IEmbeddingProvider
{
    public string ProviderName => "Gemini";
}

// After
public class GoogleEmbeddingProvider : IEmbeddingProvider
{
    public string ProviderName => "Google";
}
```

### Schema Adapter

```csharp
// Before
public static class GeminiSchemaAdapter { ... }

// After
public static class GoogleSchemaAdapter { ... }
```

### Structured Output Service

```csharp
// Before
public interface IGeminiStructuredOutputService { ... }
public class GeminiStructuredOutputService : IGeminiStructuredOutputService { ... }
public class GeminiStructuredOutputProviderService : IProviderStructuredOutputService { ... }

// After
public interface IGoogleStructuredOutputService { ... }
public class GoogleStructuredOutputService : IGoogleStructuredOutputService { ... }
public class GoogleStructuredOutputProviderService : IProviderStructuredOutputService { ... }
```

### Streaming Strategy

```csharp
// Before
public class GeminiStreamingStrategy : AgentStreamingStrategyBase { ... }

// After
public class GoogleStreamingStrategy : AgentStreamingStrategyBase { ... }
```

---

## Provider Registration Changes

### AIProviderFactory.cs

**Location:** `src/SecondBrain.Application/Services/AI/AIProviderFactory.cs`

```csharp
// Before
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "gemini", typeof(Providers.GeminiProvider) },
    // ...
};

// After
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "google", typeof(Providers.GoogleProvider) },
    // ...
};
```

### ServiceCollectionExtensions.cs

**Location:** `src/SecondBrain.API/Extensions/ServiceCollectionExtensions.cs`

```csharp
// Before
services.AddSingleton<GeminiProvider>();
services.AddSingleton<GeminiImageProvider>();
services.AddSingleton<GeminiEmbeddingProvider>();
services.AddScoped<IAgentStreamingStrategy, GeminiStreamingStrategy>();
services.AddSingleton<IGeminiStructuredOutputService, GeminiStructuredOutputService>();
services.AddSingleton<IProviderStructuredOutputService, GeminiStructuredOutputProviderService>();
activity.SetTag("ai.provider", "Gemini");

// After
services.AddSingleton<GoogleProvider>();
services.AddSingleton<GoogleImageProvider>();
services.AddSingleton<GoogleEmbeddingProvider>();
services.AddScoped<IAgentStreamingStrategy, GoogleStreamingStrategy>();
services.AddSingleton<IGoogleStructuredOutputService, GoogleStructuredOutputService>();
services.AddSingleton<IProviderStructuredOutputService, GoogleStructuredOutputProviderService>();
activity.SetTag("ai.provider", "Google");
```

---

## Strategy Pattern Changes

### GoogleStreamingStrategy.cs

```csharp
// Before
public override IReadOnlyList<string> SupportedProviders => new[] { "gemini" };

// After
public override IReadOnlyList<string> SupportedProviders => new[] { "google" };
```

### SemanticKernelStreamingStrategy.cs

```csharp
// Before
public override IReadOnlyList<string> SupportedProviders => new[] { "openai", "gemini", "ollama", "xai" };
case "gemini":

// After
public override IReadOnlyList<string> SupportedProviders => new[] { "openai", "google", "ollama", "xai" };
case "google":
```

---

## Helper and Utility Changes

### ProviderCapabilities.cs

All instances of `"gemini"` pattern matching changed to `"google"`:

```csharp
// Before (8 occurrences)
return providerLower switch
{
    "gemini" => IsGeminiThinkingModel(modelLower),
    // ...
};

// After
return providerLower switch
{
    "google" => IsGeminiThinkingModel(modelLower),
    // ...
};
```

### MultimodalConfig.cs

```csharp
// Before
["Gemini"] = new List<string> { ... }
["Gemini"] = new HashSet<string> { ... }

// After
["Google"] = new List<string> { ... }
["Google"] = new HashSet<string> { ... }
```

---

## Service Changes

### ImageDescriptionService.cs

```csharp
// Before
private static readonly string[] ProviderPriority = { "gemini", "openai", "anthropic" };
private static readonly Dictionary<string, string> PreferredVisionModels = new()
{
    ["gemini"] = "gemini-2.5-flash",
    // ...
};

// After
private static readonly string[] ProviderPriority = { "google", "openai", "anthropic" };
private static readonly Dictionary<string, string> PreferredVisionModels = new()
{
    ["google"] = "gemini-2.5-flash",
    // ...
};
```

---

## Validator Changes

### CreateConversationCommandValidator.cs

```csharp
// Before
private static readonly string[] ValidProviders = { "openai", "anthropic", "gemini", "ollama", "xai" };

// After
private static readonly string[] ValidProviders = { "openai", "anthropic", "google", "ollama", "xai" };
```

---

## Frontend Changes

### constants.ts

```typescript
// Before
GOOGLE: 'Gemini',

// After
GOOGLE: 'Google',
```

### ai/constants.ts

```typescript
// Before
export type EmbeddingProvider = 'OpenAI' | 'Gemini' | 'Ollama' | 'Cohere';
'Gemini': 'google',
'google': 'Gemini',

// After
export type EmbeddingProvider = 'OpenAI' | 'Google' | 'Ollama' | 'Cohere';
'Google': 'google',
'google': 'Google',
```

### types/rag.ts

```typescript
// Before
export type EmbeddingProvider = 'OpenAI' | 'Gemini' | 'Ollama' | 'Cohere';
Gemini: { name: 'Gemini', dimensions: 768, supportsPinecone: false },

// After
export type EmbeddingProvider = 'OpenAI' | 'Google' | 'Ollama' | 'Cohere';
Google: { name: 'Google', dimensions: 768, supportsPinecone: false },
```

### utils/image-generation-models.ts & multimodal-models.ts

```typescript
// Before
Gemini: { provider: 'Gemini', ... }

// After
Google: { provider: 'Google', ... }
```

### utils/default-models.ts

```typescript
// Before
gemini: 'gemini-2.5-flash',

// After
google: 'gemini-2.5-flash',
```

---

## Test File Changes

### Unit Tests Updated

All test files updated to use `"google"` instead of `"gemini"`:

- `AIProviderFactoryTests.cs` - InlineData changed to `"google"`, `"Google"`, `"GOOGLE"`
- `GoogleStreamingStrategyTests.cs` - All provider references updated
- `SemanticKernelStreamingStrategyTests.cs` - Provider references updated
- `OpenAIStreamingStrategyTests.cs` - Unsupported provider updated
- `OllamaStreamingStrategyTests.cs` - Unsupported provider updated
- `XaiStreamingStrategyTests.cs` - Unsupported provider updated
- `AnthropicStreamingStrategyTests.cs` - Unsupported provider updated
- `ImageDescriptionServiceTests.cs` - All mock setups updated
- `ThinkingExtractorTests.cs` - InlineData updated
- `AgentStreamingStrategyFactoryTests.cs` - Provider arrays updated
- `AgentServiceTests.cs` - Provider arrays updated
- `IndexingServiceTests.cs` - Custom provider updated

### Integration Tests Updated

- `UserRepositoryTests.cs` - ChatProvider updated
- `IndexingJobRepositoryTests.cs` - EmbeddingProvider updated

### Command Handler Tests Updated

- `CreateConversationCommandHandlerTests.cs` - Provider updated
- `StartIndexingCommandHandlerTests.cs` - EmbeddingProvider updated
- `SqlNoteImageRepositoryInMemoryTests.cs` - DescriptionProvider updated

---

## What Was NOT Changed

The following items intentionally remain unchanged:

### 1. Model Names (Official Google Identifiers)

These are the actual model names from Google's API:

```
gemini-2.5-flash
gemini-2.0-flash
gemini-2.0-flash-thinking
gemini-1.5-flash
gemini-1.5-pro
gemini-pro
gemini-exp-*
text-embedding-004
```

### 2. Gemini-Specific Services

These services are specific to Gemini's unique features:

- `GeminiFileService`, `IGeminiFileService` - Gemini's file upload API
- `GeminiCacheService`, `IGeminiCacheService` - Gemini's context caching
- `GeminiCacheEntry`, `GeminiContextCache` - Database entities
- `GeminiSchemaBuilder` - Gemini-specific schema building
- `GeminiFunctionDeclarationBuilder` - Gemini function calling
- `GeminiFilesController` - API controller for Gemini files

### 3. Configuration Settings

`GeminiSettings` class and `appsettings.json` Gemini section remain unchanged as they configure Gemini-specific features.

### 4. Model Pattern Matching

Pattern matching in `MultimodalConfig.cs` for model names:

```csharp
"gemini-1*", "gemini-2*", "gemini-3*", "gemini-pro*", etc.
```

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

If you were using `"gemini"` as a provider name in API requests, update to use `"google"`:

```json
// Before
{
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}

// After
{
  "provider": "google",
  "model": "gemini-2.5-flash"
}
```

### For Database Records

Existing database records with `provider = 'gemini'` should be migrated:

```sql
UPDATE chat_conversations SET provider = 'google' WHERE provider = 'gemini';
UPDATE user_preferences SET chat_provider = 'google' WHERE chat_provider = 'gemini';
UPDATE indexing_jobs SET embedding_provider = 'google' WHERE embedding_provider = 'gemini';
UPDATE note_images SET description_provider = 'google' WHERE description_provider = 'gemini';
```

---

## Files Changed Summary

| Category | Count |
|----------|-------|
| Files Renamed | 13 |
| Source Files Modified | 15 |
| Unit Test Files Modified | 20 |
| Integration Test Files Modified | 2 |
| Frontend Files Modified | 7 |
| **Total Files Affected** | **57** |

---

*Document generated: January 14, 2026*
