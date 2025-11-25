# Agent Context Memory Enhancement

## Overview

This document describes the improvements made to the agent system to enable better context awareness and memory across conversation turns. The agent can now track note IDs and understand references like "the note I just created" or "update that note."

## Changes Made

### 1. Enhanced System Prompt (`AgentService.cs`)

**Location**: `backend/src/SecondBrain.Application/Services/Agents/AgentService.cs`

The system prompt now explicitly instructs the agent to:
- Remember note IDs from tool execution results
- Track recent actions (created/updated notes)
- Understand contextual references ("the note", "that note", etc.)
- Use tool results as context for subsequent interactions
- Ask for clarification when ambiguous

**Key Addition**:
```text
## Critical: Context and Memory

**You must maintain context across the conversation.** When you execute tools, 
the results contain important information like note IDs that you need to remember 
and reference in subsequent interactions.

**Key context rules:**
1. **Remember note IDs**: When you create or retrieve a note, extract and remember its ID
2. **Track recent actions**: Keep track of what notes you've just created, updated, or retrieved
3. **Understand references**: When the user says "the note", "that note", etc., use history
4. **Use tool results as context**: Tool execution results contain structured data to reference
5. **Be smart about ambiguity**: Ask for clarification when needed
```

### 2. Message Context Enrichment (`AgentController.cs`)

**Location**: `backend/src/SecondBrain.API/Controllers/AgentController.cs`

Added a new method `EnrichMessageWithToolContext()` that:
- Appends tool execution results to message content
- Extracts and highlights note IDs for easy reference
- Formats tool calls in a structured, LLM-parseable format
- Ensures the agent has full context from previous interactions

**Implementation**:
```csharp
private static string EnrichMessageWithToolContext(ChatMessage message)
{
    if (message.ToolCalls == null || !message.ToolCalls.Any())
    {
        return message.Content;
    }

    var enrichedContent = new StringBuilder(message.Content);
    enrichedContent.AppendLine();
    enrichedContent.AppendLine("[Tool Executions Context - Use this information to maintain context:]");

    foreach (var toolCall in message.ToolCalls)
    {
        enrichedContent.AppendLine($"- Tool: {toolCall.ToolName}");
        enrichedContent.AppendLine($"  Arguments: {toolCall.Arguments}");
        enrichedContent.AppendLine($"  Result: {toolCall.Result}");
        
        // Extract and highlight note IDs
        if (toolCall.Result.Contains("(ID:"))
        {
            var noteIdMatch = Regex.Match(toolCall.Result, @"\(ID:\s*([a-zA-Z0-9-]+)\)");
            if (noteIdMatch.Success)
            {
                enrichedContent.AppendLine($"  → Note ID for reference: {noteIdMatch.Groups[1].Value}");
            }
        }
    }

    return enrichedContent.ToString();
}
```

**Modified Message Building** (lines 89-102):
Changed from passing only `Role` and `Content` to using the enriched content:
```csharp
Messages = conversation.Messages.Select(m => new AgentMessage
{
    Role = m.Role,
    Content = EnrichMessageWithToolContext(m)  // ← Enhanced with tool context
}).ToList(),
```

### 3. Enhanced Tool Response Messages (`NotesPlugin.cs`)

**Location**: `backend/src/SecondBrain.Application/Services/Agents/Plugins/NotesPlugin.cs`

#### CreateNote Enhancement
- Now explicitly mentions "Remember this note ID for future reference"
- Clearer formatting of note IDs in response

**Before**:
```csharp
return $"Successfully created note \"{created.Title}\" (ID: {created.Id}){tagInfo}";
```

**After**:
```csharp
return $"Successfully created note \"{created.Title}\" (ID: {created.Id}){tagInfo}. Remember this note ID for future reference in this conversation.";
```

#### UpdateNote Enhancement
- Tracks previous tags to show what changed
- Provides detailed feedback about tag additions/removals
- Clear indication of note ID in response

**New Features**:
```csharp
var previousTags = new List<string>(note.Tags);
// ... update logic ...
var added = note.Tags.Except(previousTags).ToList();
var removed = previousTags.Except(note.Tags).ToList();

if (added.Any())
    changeDetails.Add($"added tags: {string.Join(", ", added)}");
if (removed.Any())
    changeDetails.Add($"removed tags: {string.Join(", ", removed)}");
```

## How It Works

### Example Flow

**Turn 1: Create a Note**
```
User: "Create a note about pasta recipes with tags italian, dinner, pasta"

Agent executes: CreateNote(title="Pasta Recipes", content="...", tags="italian, dinner, pasta")

Tool returns: "Successfully created note 'Pasta Recipes' (ID: abc-123-def) with tags: italian, dinner, pasta. Remember this note ID for future reference in this conversation."

Agent response: "I've created a note titled 'Pasta Recipes' with tags: italian, dinner, pasta."
```

**Message saved to database includes**:
- Role: "assistant"
- Content: "I've created a note..."
- ToolCalls: [{ ToolName: "CreateNote", Arguments: {...}, Result: "Successfully created..." }]

**Turn 2: Update the Note**
```
User: "Remove the pasta tag from that note"

Agent receives enriched context:
- Previous user message: "Create a note..."
- Previous assistant message: "I've created a note..."
  [Tool Executions Context - Use this information to maintain context:]
  - Tool: CreateNote
    Arguments: title=Pasta Recipes, content=..., tags=italian, dinner, pasta
    Result: Successfully created note 'Pasta Recipes' (ID: abc-123-def)...
    → Note ID for reference: abc-123-def

Agent recognizes: "that note" = abc-123-def (from context)

Agent executes: UpdateNote(noteId="abc-123-def", tags="italian, dinner")

Tool returns: "Successfully updated note 'Pasta Recipes' (ID: abc-123-def). Changes: removed tags: pasta."

Agent response: "I've removed the pasta tag from your Pasta Recipes note."
```

## Testing Guide

### Test Scenario 1: Basic Context Tracking

1. **Start a new agent conversation**
2. **Say**: "Create a note about my favorite Italian restaurants with tags food, italian"
3. **Expected**: Agent creates the note and mentions the tags
4. **Say**: "Add the tag 'dining' to that note"
5. **Expected**: Agent should update the same note without asking for clarification

### Test Scenario 2: Multiple Notes Context

1. **Start a new agent conversation**
2. **Say**: "Create a note about pizza recipes with tag italian"
3. **Say**: "Create a note about sushi recipes with tag japanese"
4. **Say**: "Remove the italian tag from the first note"
5. **Expected**: Agent should update the pizza note (first one created)

### Test Scenario 3: Tag Management

1. **Start a new agent conversation**
2. **Say**: "Create a note about pasta with tags italian, dinner, pasta, recipes"
3. **Expected**: Agent creates note with all 4 tags
4. **Say**: "Remove the pasta tag"
5. **Expected**: Agent removes only the "pasta" tag, keeping the others
6. **Say**: "Add the tag vegetarian"
7. **Expected**: Agent adds the new tag while preserving existing ones

### Test Scenario 4: Ambiguous References

1. **Start a new agent conversation**
2. **Say**: "Create a note about burgers with tag american"
3. **Say**: "Create a note about hot dogs with tag american"
4. **Say**: "Update that note to add tag 'fast-food'"
5. **Expected**: Agent might ask for clarification OR update the most recent note (hot dogs)

## Benefits

1. **Natural Language Understanding**: Users can use pronouns and references naturally
2. **Reduced Friction**: No need to remember or copy-paste note IDs
3. **Multi-turn Workflows**: Complex note management tasks can be done conversationally
4. **Better UX**: Feels more like talking to an intelligent assistant
5. **Context Preservation**: Agent maintains awareness across the entire conversation

## Technical Details

### Context Window Management

The enriched context is added to messages that have tool calls. This means:
- User messages: No modification (as-is)
- Assistant messages WITH tool calls: Enhanced with structured tool context
- Assistant messages WITHOUT tool calls: No modification (as-is)

### Note ID Extraction

The system uses regex patterns to extract note IDs from tool results:
- Pattern 1: `(ID: abc-123-def)` - Standard format
- Pattern 2: `"id": "abc-123-def"` - JSON format

This ensures note IDs are clearly highlighted for the LLM to reference.

### Token Efficiency

While adding context increases token usage slightly, the benefit outweighs the cost:
- Context is only added to assistant messages with tool calls
- The structured format is concise and efficient
- LLMs can parse this format quickly and accurately

## Limitations

1. **Session Scope**: Context is maintained within a conversation, not across conversations
2. **Token Limits**: Very long conversations may hit context limits (mitigated by summarization)
3. **Model Dependency**: Works best with capable models (GPT-4, Claude 3+, etc.)
4. **Ambiguity**: Some references may still be ambiguous if many similar notes exist

## Future Enhancements

Potential improvements for future iterations:

1. **Semantic Understanding**: Use embeddings to find "similar" notes when references are vague
2. **Conversation Summarization**: Compress long contexts while preserving key note IDs
3. **Cross-Conversation Memory**: Remember frequently accessed notes across sessions
4. **Explicit Note Registry**: Maintain a "working set" of notes in the current conversation
5. **Smart Disambiguation**: Rank notes by recency, relevance, and context to resolve ambiguity

## Conclusion

These enhancements make the agent system significantly smarter and more user-friendly. Users can now have natural, multi-turn conversations about their notes without needing to remember or reference note IDs explicitly. The agent maintains context intelligently and provides detailed, helpful responses.

