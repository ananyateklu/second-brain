# Claude to Anthropic Provider Rename

**Date:** January 14, 2026
**Branch:** optimizations
**Summary:** Renamed all "Claude" provider references to "Anthropic" for consistency. Model names (e.g., `claude-3-opus`) remain unchanged as they are official Anthropic model identifiers.

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
9. [Comment Updates](#comment-updates)
10. [Test File Changes](#test-file-changes)
11. [What Was NOT Changed](#what-was-not-changed)
12. [Verification](#verification)

---

## Overview

This change standardizes the AI provider naming convention:

| Before | After |
|--------|-------|
| Provider name: `"claude"` or `"anthropic"` | Provider name: `"anthropic"` only |
| Class names: `ClaudeProvider`, `ClaudeSchemaAdapter`, etc. | Class names: `AnthropicProvider`, `AnthropicSchemaAdapter`, etc. |
| File names: `ClaudeProvider.cs`, etc. | File names: `AnthropicProvider.cs`, etc. |

**Important:** Model names like `claude-3-opus`, `claude-3-5-sonnet`, `claude-sonnet-4` remain unchanged because these are the official model identifiers from Anthropic's API.

---

## Files Renamed

### Backend Source Files

| Original Path | New Path |
|---------------|----------|
| `src/SecondBrain.Application/Services/AI/Providers/ClaudeProvider.cs` | `src/SecondBrain.Application/Services/AI/Providers/AnthropicProvider.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/Adapters/ClaudeSchemaAdapter.cs` | `src/SecondBrain.Application/Services/AI/StructuredOutput/Adapters/AnthropicSchemaAdapter.cs` |
| `src/SecondBrain.Application/Services/AI/StructuredOutput/ClaudeStructuredOutputService.cs` | `src/SecondBrain.Application/Services/AI/StructuredOutput/AnthropicStructuredOutputService.cs` |

### Test Files

| Original Path | New Path |
|---------------|----------|
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/ClaudeProviderTests.cs` | `tests/SecondBrain.Tests.Unit/Application/Services/AI/AnthropicProviderTests.cs` |
| `tests/SecondBrain.Tests.Unit/Application/Services/AI/Providers/ClaudeProviderTests.cs` | `tests/SecondBrain.Tests.Unit/Application/Services/AI/Providers/AnthropicProviderTests.cs` |

---

## Class and Type Renames

### Provider Classes

```csharp
// Before
public class ClaudeProvider : IAIProvider
{
    public const string HttpClientName = "Claude";
    public string ProviderName => "Claude";
}

// After
public class AnthropicProvider : IAIProvider
{
    public const string HttpClientName = "Anthropic";
    public string ProviderName => "Anthropic";
}
```

### Schema Adapter

```csharp
// Before
public static class ClaudeSchemaAdapter { ... }

// After
public static class AnthropicSchemaAdapter { ... }
```

### Structured Output Service

```csharp
// Before
public class ClaudeStructuredOutputService : IStructuredOutputService { ... }

// After
public class AnthropicStructuredOutputService : IStructuredOutputService { ... }
```

### Interface Factory

```csharp
// Before
public interface IAnthropicClientFactory
{
    AnthropicClient? CreateClient(string apiKey);
}

// After (unchanged - was already correct)
public interface IAnthropicClientFactory
{
    AnthropicClient? CreateClient(string apiKey);
}
```

---

## Provider Registration Changes

### AIProviderFactory.cs

**Location:** `src/SecondBrain.Application/Services/AI/AIProviderFactory.cs`

```csharp
// Before - supported both "claude" and "anthropic"
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "openai", typeof(Providers.OpenAIProvider) },
    { "gemini", typeof(Providers.GeminiProvider) },
    { "anthropic", typeof(Providers.ClaudeProvider) },
    { "claude", typeof(Providers.ClaudeProvider) },  // Alias removed
    { "ollama", typeof(Providers.OllamaProvider) },
    { "grok", typeof(Providers.GrokProvider) },
    { "xai", typeof(Providers.GrokProvider) },
    { "cohere", typeof(Providers.CohereProvider) }
};

// After - only "anthropic" supported
_providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
{
    { "openai", typeof(Providers.OpenAIProvider) },
    { "gemini", typeof(Providers.GeminiProvider) },
    { "anthropic", typeof(Providers.AnthropicProvider) },
    { "ollama", typeof(Providers.OllamaProvider) },
    { "grok", typeof(Providers.GrokProvider) },
    { "xai", typeof(Providers.GrokProvider) },
    { "cohere", typeof(Providers.CohereProvider) }
};
```

### ServiceCollectionExtensions.cs

**Location:** `src/SecondBrain.Application/Configuration/ServiceCollectionExtensions.cs`

```csharp
// Before
services.AddScoped<ClaudeProvider>();
services.AddScoped<ClaudeStructuredOutputService>();

// After
services.AddScoped<AnthropicProvider>();
services.AddScoped<AnthropicStructuredOutputService>();
```

---

## Strategy Pattern Changes

### AnthropicStreamingStrategy.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Strategies/AnthropicStreamingStrategy.cs`

```csharp
// Before - supported both "claude" and "anthropic"
public override IReadOnlyList<string> SupportedProviders => new[] { "claude", "anthropic" };

// After - only "anthropic" supported
public override IReadOnlyList<string> SupportedProviders => new[] { "anthropic" };
```

### SemanticKernelStreamingStrategy.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Strategies/SemanticKernelStreamingStrategy.cs`

```csharp
// Before
case "claude":
case "anthropic":
    throw new InvalidOperationException("Anthropic provider should be handled by AnthropicStreamingStrategy");

// After
case "anthropic":
    throw new InvalidOperationException("Anthropic provider should be handled by AnthropicStreamingStrategy");
```

---

## Helper and Utility Changes

### ThinkingExtractor.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Helpers/ThinkingExtractor.cs`

```csharp
// Before
public static bool SupportsNativeThinking(string provider, string model)
{
    var isAnthropic = provider.Equals("anthropic", StringComparison.OrdinalIgnoreCase) ||
                      provider.Equals("claude", StringComparison.OrdinalIgnoreCase);
    // ...
}

// After
public static bool SupportsNativeThinking(string provider, string model)
{
    var isAnthropic = provider.Equals("anthropic", StringComparison.OrdinalIgnoreCase);
    // ...
}
```

### ProviderCapabilities.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Helpers/ProviderCapabilities.cs`

All instances of `"anthropic" or "claude"` pattern matching changed to just `"anthropic"`:

```csharp
// Before (8 occurrences)
return providerLower switch
{
    "anthropic" or "claude" => IsClaudeThinkingModel(modelLower),
    // ...
};

// After
return providerLower switch
{
    "anthropic" => IsClaudeThinkingModel(modelLower),
    // ...
};
```

**Methods updated:**
- `SupportsNativeThinking()`
- `SupportsFunctionCalling()`
- `SupportsEffortControl()`
- `GetValidEffortLevels()`
- `SupportsPromptCaching()`
- `GetMinCachingTokens()`
- `GetMaxThinkingBudget()`
- `GetMinThinkingBudget()`

---

## Service Changes

### ImageDescriptionService.cs

**Location:** `src/SecondBrain.Application/Services/RAG/ImageDescriptionService.cs`

```csharp
// Before
/// Prioritizes Gemini for cost-effectiveness, falls back to OpenAI/Claude.
private static readonly string[] ProviderPriority = { "gemini", "openai", "claude" };
private static readonly Dictionary<string, string> PreferredVisionModels = new()
{
    ["gemini"] = "gemini-2.5-flash",
    ["openai"] = "gpt-4o-mini",
    ["claude"] = "claude-3-haiku-20240307"
};

// After
/// Prioritizes Gemini for cost-effectiveness, falls back to OpenAI/Anthropic.
private static readonly string[] ProviderPriority = { "gemini", "openai", "anthropic" };
private static readonly Dictionary<string, string> PreferredVisionModels = new()
{
    ["gemini"] = "gemini-2.5-flash",
    ["openai"] = "gpt-4o-mini",
    ["anthropic"] = "claude-3-haiku-20240307"
};
```

---

## Validator Changes

### CreateConversationCommandValidator.cs

**Location:** `src/SecondBrain.Application/Commands/Chat/CreateConversation/CreateConversationCommandValidator.cs`

```csharp
// Before
private static readonly string[] ValidProviders = { "openai", "anthropic", "claude", "gemini", "ollama", "grok", "xai" };

// After
private static readonly string[] ValidProviders = { "openai", "anthropic", "gemini", "ollama", "grok", "xai" };
```

---

## Comment Updates

### IAgentStreamingStrategy.cs

**Location:** `src/SecondBrain.Application/Services/Agents/Strategies/IAgentStreamingStrategy.cs`

```csharp
// Before
/// Provider name(s) this strategy handles (e.g., "claude", "anthropic").

// After
/// Provider name(s) this strategy handles (e.g., "anthropic", "openai", "gemini").
```

### ChatConversation.cs

**Location:** `src/SecondBrain.Core/Entities/ChatConversation.cs`

```csharp
// Before
/// AI provider that generated this thinking (claude, grok, gemini, ollama, etc.)

// After
/// AI provider that generated this thinking (anthropic, grok, gemini, ollama, etc.)
```

---

## Test File Changes

### Unit Tests Updated

#### AnthropicProviderTests.cs (both files)

- Class references updated from `ClaudeProvider` to `AnthropicProvider`
- `HttpClientName` test updated to expect `"Anthropic"` instead of `"Claude"`

#### AnthropicStreamingStrategyTests.cs

```csharp
// Before - multiple tests
var request = new AgentRequest { Provider = "claude" };
_sut.SupportedProviders.Should().Contain("claude");
_sut.SupportedProviders.Should().HaveCount(2);

// After
var request = new AgentRequest { Provider = "anthropic" };
_sut.SupportedProviders.Should().Contain("anthropic");
_sut.SupportedProviders.Should().HaveCount(1);
```

**Tests updated:**
- `SupportedProviders_ContainsClaude` → Removed (replaced by `SupportedProviders_ContainsAnthropic`)
- `SupportedProviders_HasTwoProviders` → `SupportedProviders_HasOneProvider`
- `CanHandle_WhenProviderDisabled_ReturnsFalse` - Provider changed to "anthropic"
- `CanHandle_WhenApiKeyMissing_ReturnsFalse` - Provider changed to "anthropic"
- `CanHandle_WhenAllConditionsMet_ReturnsTrue` - Provider changed to "anthropic"
- `CreateContext()` helper - Provider changed to "anthropic"

#### ThinkingExtractorTests.cs

```csharp
// Before
[InlineData("claude", "claude-opus-4-20250514", true)]
ThinkingExtractor.SupportsNativeThinking("claude", model);

// After
[InlineData("anthropic", "claude-opus-4-20250514", true)]
ThinkingExtractor.SupportsNativeThinking("anthropic", model);
```

#### AIProviderFactoryTests.cs

```csharp
// Before
[InlineData("claude")]
[InlineData("anthropic")]

// After
[InlineData("anthropic")]
// "claude" InlineData removed from all test methods
```

#### Other Strategy Tests (removed "claude" from InlineData)

- `OpenAIStreamingStrategyTests.cs`
- `GeminiStreamingStrategyTests.cs`
- `OllamaStreamingStrategyTests.cs`
- `GrokStreamingStrategyTests.cs`
- `SemanticKernelStreamingStrategyTests.cs`

#### ImageDescriptionServiceTests.cs

```csharp
// Before
public void IsAvailable_WhenClaudeEnabled_ReturnsTrue()
_mockProviderFactory.Setup(f => f.GetProvider("claude"))
result.Provider.Should().Be("claude");

// After
public void IsAvailable_WhenAnthropicEnabled_ReturnsTrue()
_mockProviderFactory.Setup(f => f.GetProvider("anthropic"))
result.Provider.Should().Be("anthropic");
```

#### ChatConversationServiceTests.cs

```csharp
// Before
provider: "claude",

// After
provider: "anthropic",
```

#### ChatControllerTests.cs

```csharp
// Before
Provider = "claude",
cmd.Provider == "claude"

// After
Provider = "anthropic",
cmd.Provider == "anthropic"
```

### Integration Tests Updated

#### UserRepositoryTests.cs

```csharp
// Before
user.Preferences = new UserPreferences { ChatProvider = "claude" };
retrieved.Preferences!.ChatProvider.Should().Be("claude");

// After
user.Preferences = new UserPreferences { ChatProvider = "anthropic" };
retrieved.Preferences!.ChatProvider.Should().Be("anthropic");
```

#### ChatRepositoryTests.cs

```csharp
// Before
updateConversation.Provider = "claude";
updated.Provider.Should().Be("claude");

// After
updateConversation.Provider = "anthropic";
updated.Provider.Should().Be("anthropic");
```

---

## What Was NOT Changed

The following items intentionally remain unchanged:

### 1. Model Names (Official Anthropic Identifiers)

These are the actual model names from Anthropic's API:

```
claude-opus-4-20250514
claude-sonnet-4-20250514
claude-3-7-sonnet-20250219
claude-3-5-sonnet-20241022
claude-3-5-sonnet-20240620
claude-3-5-haiku-20241022
claude-3-opus-20240229
claude-3-sonnet-20240229
claude-3-haiku-20240307
claude-2.1
claude-2
```

### 2. Internal Variable Names

Variable names like `claudeMessages`, `claudeJson`, `claudeParams` in internal code remain unchanged as they're implementation details.

### 3. Claude-Specific Feature Names

Similar to how `GrokSearchSource` refers to Grok's search feature:

- `ClaudeSearchSource` - Type for Claude's web search results
- `ClaudeSearchSourcesCard` - React component for displaying Claude search
- `claude_search` - SSE event name for streaming
- `ClaudeSearchSources` property in `AgentStreamEvent`

These refer to Claude model family features, not the provider name.

### 4. Model Context Database

`ModelContextDatabase.cs` contains model name mappings which correctly use `claude-*` model identifiers.

### 5. Multimodal Config Patterns

`MultimodalConfig.cs` contains glob patterns for model matching:

```csharp
"claude-3*"
"claude-4*"
"claude-sonnet*"
"claude-opus*"
"claude-haiku*"
```

### 6. Configuration Files

`appsettings.json` and `appsettings.Development.json` contain model names in the Anthropic settings section which correctly use `claude-*` identifiers.

### 7. Documentation Examples

Doc comments that use model names as examples remain unchanged:

```csharp
/// AI model identifier (e.g., "claude-3-5-sonnet", "gemini-2.0-flash")
```

---

## Verification

### Test Results

```
Passed!  - Failed: 0, Passed: 2693, Skipped: 0, Total: 2693 - SecondBrain.Tests.Unit.dll
Passed!  - Failed: 0, Passed:  251, Skipped: 0, Total:  251 - SecondBrain.Tests.Integration.dll
```

**Total: 2,944 tests passing**

### Build Status

```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

### Grep Verification

No remaining `"claude"` provider references in backend code:

```bash
grep -rn "provider.*claude\|Provider.*claude\|\"claude\"" backend --include="*.cs" | grep -v "claude-" | grep -v "claudeMessages\|claudeJson\|claudeParams\|ClaudeSearch"
# Returns empty - all provider references are now "anthropic"
```

---

## Migration Notes

### For API Consumers

If you were using `"claude"` as a provider name in API requests, update to use `"anthropic"`:

```json
// Before
{
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022"
}

// After
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

### For Database Records

Existing database records with `provider = 'claude'` should be migrated:

```sql
UPDATE chat_conversations SET provider = 'anthropic' WHERE provider = 'claude';
UPDATE user_preferences SET chat_provider = 'anthropic' WHERE chat_provider = 'claude';
```

---

## Files Changed Summary

| Category | Count |
|----------|-------|
| Files Renamed | 5 |
| Source Files Modified | 12 |
| Unit Test Files Modified | 15 |
| Integration Test Files Modified | 2 |
| **Total Files Affected** | **34** |

---

*Document generated: January 14, 2026*
