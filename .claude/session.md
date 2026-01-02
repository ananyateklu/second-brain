# Current Session Context

> **Last Updated**: 2026-01-02 09:05:50
> **Focus**: Grok Voice Custom App Functions - Tool Context Fix

---

## Session Summary

### Current Work

**Grok Voice Tool Context Enhancement** - Fixed issue where Grok Voice agent didn't understand it had note tools available. The agent would answer easy questions but wouldn't use the custom tools (notes CRUD, semantic search) because the system prompt didn't clearly communicate the available tools.

### Previous Work (Same Session)

**Grok Voice Custom App Functions** - Wired up custom app functions (Notes CRUD, Semantic Search) to Grok Voice, similar to the existing agent mode. Grok Voice now has access to the same note tools as the Standard voice agent, alongside its built-in `web_search` and `x_search` tools.

---

## Tool Context Fix (Latest Change)

### Problem
Grok Voice agent would say "I don't have access to your notes" even though custom tools were registered. The model didn't understand it had tools available because:
1. Default system prompt only mentioned web_search/x_search
2. Tool names weren't explicitly listed in the prompt
3. No examples of when to use each tool

### Solution
Enhanced `GrokVoiceHandler.BuildSystemPrompt()`:

1. **New dynamic default prompt** - When note tools are enabled, uses a prompt that says "You have access to the user's personal notes system" instead of just mentioning web search

2. **Explicit tool listing** - Lists all available tool names:
   ```
   ### Tool Functions You Can Call:
   - **AppendToNote**
   - **CreateNote**
   - **GetNote**
   - **SemanticSearch**
   ...
   ```

3. **Usage examples** - Clear examples of when to use each tool:
   ```
   **SemanticSearch** - Use for finding notes by meaning/concept:
     - "What do my notes say about..."
     - "Find information about..."
   ```

4. **Critical rules** - Explicit instructions:
   ```
   1. ALWAYS call a search tool when the user asks about their notes
   2. NEVER say "I don't have access to your notes" - you DO through these tools
   ```

5. **Debug logging** - Added logging to see system prompt and registered tools

### Files Changed
- `GrokVoiceHandler.cs`:
  - `BuildSystemPrompt()` - Enhanced with tool listing and examples
  - `GetDefaultSystemPrompt(bool hasNoteTools)` - Now context-aware
  - Added debug logging for prompt and tools

---

## What Was Implemented (Original Session)

### Architecture: Custom Functions for Grok Voice

```text
User speaks → Grok Voice (xAI Realtime) → Decides to call custom tool (e.g., CreateNote)
                                              ↓
                         response.function_call_arguments.done event
                                              ↓
                         GrokVoiceHandler executes tool via IToolExecutor
                                              ↓
                         Send result back via conversation.item.create (function_call_output)
                                              ↓
                         Trigger response.create → Grok speaks the result
```

### Key Difference from Built-in Tools

| Aspect | Built-in Tools (web_search, x_search) | Custom Function Tools |
|--------|---------------------------------------|----------------------|
| **Definition** | Type only: `"web_search"` | Type + Name + Description + Parameters schema |
| **Execution** | xAI executes internally | We execute locally via `IToolExecutor` |
| **Results** | Integrated into response automatically | Must send back via `conversation.item.create` |
| **Available Tools** | Web search, X/Twitter search | Notes CRUD, Semantic Search, etc. |

---

## Files Modified

### Backend (5 files)

| File | Changes |
|------|---------|
| `GrokRealtimeModels.cs` | Added `GrokFunctionCallOutputItem`, `GrokFunctionCallOutputMessage`, `CustomFunction()` factory |
| `GrokVoiceHandler.cs` | Injected `IToolExecutor` + plugins, added `BuildCustomFunctionTools()`, updated `HandleFunctionCallDoneAsync()` to execute custom tools |
| `GrokRealtimeClient.cs` | Added `SendFunctionCallOutputAsync()` method |
| `IGrokRealtimeClient.cs` | Added interface method |
| `ServiceCollectionExtensions.cs` | Registered `NoteCrudPlugin` and `NoteSearchPlugin` as `IAgentPlugin` |

### Frontend (3 files)

| File | Changes |
|------|---------|
| `VoiceAgentInterface.tsx` | Fixed: Pass `agentEnabled` and `capabilities` to backend (was hardcoded `false`/`[]`) |
| `VoiceSettings.tsx` | Moved agent capabilities to show for BOTH Standard and Grok Voice modes, Grok Voice now first in switcher |
| `voice-slice.ts` | Default `voiceProviderType` changed to `'GrokVoice'`, default capabilities to `['notes-crud', 'notes-search']` |

---

## How Custom Tools Work in Grok Voice

### 1. Tool Definition (BuildCustomFunctionTools)

```csharp
// Tools are built from plugins at session initialization
var (customTools, pluginMethods) = BuildCustomFunctionTools(session);
tools.AddRange(customTools);
_pluginMethods = pluginMethods;  // Maps toolName → (plugin, method)
```

### 2. Tool Registration in Session Config

```json
{
  "type": "session.update",
  "session": {
    "tools": [
      { "type": "web_search" },
      { "type": "x_search" },
      { "type": "function", "name": "CreateNote", "description": "...", "parameters": {...} },
      { "type": "function", "name": "SemanticSearch", "description": "...", "parameters": {...} }
    ]
  }
}
```

### 3. Tool Execution Flow

```csharp
private async Task HandleFunctionCallDoneAsync(GrokFunctionCallArgumentsDoneEvent evt, CancellationToken ct)
{
    // Built-in tools (web_search, x_search) - xAI handles
    if (toolName is "web_search" or "x_search") { ... return; }

    // Custom function tools - execute locally
    if (_pluginMethods.TryGetValue(toolName, out var pluginMethod))
    {
        // Execute via IToolExecutor
        var result = await _toolExecutor.ExecuteAsync(pendingCall, pluginMethod.Plugin, pluginMethod.Method, ct);

        // Send result back to xAI
        await _realtimeClient.SendFunctionCallOutputAsync(callId, result.Result, ct);

        // Trigger new response
        await _realtimeClient.CreateResponseAsync(ct);
    }
}
```

### 4. Function Output Message

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "function_call_output",
    "call_id": "call_abc123",
    "output": "{\"success\": true, \"noteId\": \"123\", \"message\": \"Note created\"}"
  }
}
```

---

## Available Capabilities

| Capability ID | Plugin | Tools Provided |
|---------------|--------|----------------|
| `notes-crud` | NoteCrudPlugin | CreateNote, GetNote, UpdateNote, DeleteNote, AppendToNote, DuplicateNote |
| `notes-search` | NoteSearchPlugin | SearchNotes, SemanticSearch, SearchByTags, GetNotesByDateRange, FindRelatedNotes |

---

## Frontend UI Changes

### Voice Provider Switcher (Grok Voice First)

```
[Grok Voice (selected)] [Standard]
```

### App Functions Section (Visible for Both Modes)

```
App Functions
├── [✓] Enable App Functions
├── [✓] Notes CRUD - Create, read, update, delete notes
├── [✓] Notes Search - Semantic & keyword search
└── (Web Search - Only for Standard mode)
```

---

## Bug Fixed

### Issue: Grok Voice Agent Didn't Know About Custom Tools

**Symptom**: "I'm sorry, but I don't have access to your personal notes"

**Cause**: `VoiceAgentInterface.tsx` hardcoded for Grok Voice:
```tsx
// WRONG - was hardcoded
agentEnabled: false,
capabilities: [],
```

**Fix**: Use actual values from store:
```tsx
// CORRECT - uses store values
agentEnabled,
capabilities: agentEnabled ? capabilities : [],
```

---

## Testing

1. Start backend: `cd backend/src/SecondBrain.API && dotnet run`
2. Start frontend: `cd frontend && pnpm dev`
3. Navigate to `/voice`
4. Grok Voice should be selected by default with App Functions enabled
5. Try: "Create a note called 'Test' with content 'Hello from voice'"
6. Check backend logs for:
   ```
   Initializing Grok Voice session. AgentEnabled=True, Capabilities=[notes-crud, notes-search], PluginsAvailable=2
   ```

---

## Quick Commands

```bash
# Backend
cd backend/src/SecondBrain.API && dotnet watch run

# Frontend
cd frontend && pnpm dev

# Build check
cd backend && dotnet build
cd frontend && pnpm exec tsc --noEmit
```

---

**Remember**: This file is for current session work. Long-term learnings go in `.claude/memory.md`.
