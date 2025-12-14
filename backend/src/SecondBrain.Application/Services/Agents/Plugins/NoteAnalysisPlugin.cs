using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling AI-powered analysis operations for notes:
/// AnalyzeNote, SuggestTags, SummarizeNote, CompareNotes.
/// </summary>
public class NoteAnalysisPlugin : NotePluginBase
{
    public NoteAnalysisPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService)
    {
    }

    public override string CapabilityId => "notes-analysis";
    public override string DisplayName => "Notes Analysis";
    public override string Description => "AI-powered note analysis including summarization, tag suggestions, and note comparison";

    public override string GetPluginName() => "NotesAnalysis";

    public override string GetSystemPromptAddition() => @"
### AI-Powered Analysis Tools

- **AnalyzeNote**: Deep analysis of a note using AI
  - Extracts key information, suggests tags, identifies themes
  - Determines sentiment and suggests organization
  - Use when user wants insights about a specific note

- **SuggestTags**: Get AI-powered tag suggestions for a note
  - Based on content analysis
  - Helps with organization and categorization
  - Returns both suggested and new tags (not already on the note)

- **SummarizeNote**: Generate comprehensive summaries
  - Includes one-liner, short summary, and detailed summary
  - Identifies key topics and takeaways
  - Use when user wants a quick overview of a note

- **CompareNotes**: Compare two notes for similarities and differences
  - Identifies shared themes and unique aspects
  - Provides similarity score and recommendations
  - Use for finding connections between notes";

    [KernelFunction("AnalyzeNote")]
    [Description("Analyzes a note using AI to extract key information, suggest tags, identify key points, and determine sentiment. Requires AI structured output service to be available.")]
    public async Task<string> AnalyzeNoteAsync(
        [Description("The ID of the note to analyze")] string noteId)
    {
        var userError = ValidateUserContext("analyze note");
        if (userError != null) return userError;

        if (StructuredOutputService == null)
        {
            return "Error: Note analysis requires AI structured output service which is not available.";
        }

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to analyze this note.";
            }

            var prompt = $@"Analyze the following note and extract structured information.

Note Title: {note.Title}

Note Content:
{note.Content}

Current Tags: {(note.Tags.Any() ? string.Join(", ", note.Tags) : "none")}
Current Folder: {note.Folder ?? "none"}

Provide a comprehensive analysis including:
- A brief summary
- Suggested tags for categorization
- Key points or main ideas
- Overall sentiment
- Suggested folder for organization";

            var options = new StructuredOutputOptions
            {
                Temperature = 0.3f,
                MaxTokens = 800,
                SystemInstruction = "You are a note analysis assistant. Analyze notes to extract key information, suggest organization, and identify themes."
            };

            var analysis = await StructuredOutputService.GenerateAsync<NoteAnalysis>(prompt, options);

            if (analysis == null)
            {
                return "Error: Failed to analyze the note. The AI service did not return a valid analysis.";
            }

            var response = new
            {
                type = "analysis",
                message = $"Analysis complete for note \"{note.Title}\"",
                noteId = note.Id,
                noteTitle = note.Title,
                analysis = new
                {
                    suggestedTitle = analysis.Title,
                    summary = analysis.Summary,
                    suggestedTags = analysis.Tags,
                    currentTags = note.Tags,
                    keyPoints = analysis.KeyPoints,
                    sentiment = analysis.Sentiment,
                    suggestedFolder = analysis.SuggestedFolder,
                    currentFolder = note.Folder
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("analyzing note", ex.Message);
        }
    }

    [KernelFunction("SuggestTags")]
    [Description("Uses AI to suggest relevant tags for a note based on its content. Helpful for organizing and categorizing notes.")]
    public async Task<string> SuggestTagsAsync(
        [Description("The ID of the note to suggest tags for")] string noteId,
        [Description("Maximum number of tags to suggest (default: 5)")] int maxTags = 5)
    {
        var userError = ValidateUserContext("suggest tags");
        if (userError != null) return userError;

        if (StructuredOutputService == null)
        {
            return "Error: Tag suggestion requires AI structured output service which is not available.";
        }

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to access this note.";
            }

            var prompt = $@"Suggest {maxTags} relevant tags for categorizing this note.

Note Title: {note.Title}

Note Content:
{note.Content}

Current Tags: {(note.Tags.Any() ? string.Join(", ", note.Tags) : "none")}

Suggest tags that:
- Capture the main topics and themes
- Would help with future searches
- Are concise (1-2 words each)
- Are different from existing tags when possible";

            var options = new StructuredOutputOptions
            {
                Temperature = 0.3f,
                MaxTokens = 300,
                SystemInstruction = "You are a note categorization assistant. Suggest concise, relevant tags for organizing notes."
            };

            var analysis = await StructuredOutputService.GenerateAsync<NoteAnalysis>(prompt, options);

            if (analysis == null || !analysis.Tags.Any())
            {
                return "Error: Failed to generate tag suggestions.";
            }

            var suggestedTags = analysis.Tags.Take(maxTags).ToList();
            var newTags = suggestedTags.Where(t => !note.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();

            var response = new
            {
                type = "tags",
                message = $"Suggested tags for note \"{note.Title}\"",
                noteId = note.Id,
                noteTitle = note.Title,
                currentTags = note.Tags,
                suggestedTags = suggestedTags,
                newTags = newTags,
                hint = newTags.Any()
                    ? $"Use UpdateNote to add these tags: {string.Join(", ", newTags)}"
                    : "All suggested tags are already present on this note."
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("suggesting tags", ex.Message);
        }
    }

    [KernelFunction("SummarizeNote")]
    [Description("Generates a comprehensive summary of a note using AI, including a one-liner, short summary, and key takeaways.")]
    public async Task<string> SummarizeNoteAsync(
        [Description("The ID of the note to summarize")] string noteId)
    {
        var userError = ValidateUserContext("summarize note");
        if (userError != null) return userError;

        if (StructuredOutputService == null)
        {
            return "Error: Note summarization requires AI structured output service which is not available.";
        }

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to access this note.";
            }

            var prompt = $@"Create a comprehensive summary of this note.

**Note Title:** {note.Title}

**Note Content:**
{note.Content}

**Instructions:**
You MUST provide responses for ALL of the following fields:

1. **oneLiner** (required, string): A single sentence that captures the essence of the note (like a headline).

2. **shortSummary** (required, string): A brief 2-4 sentence summary of the main points.

3. **detailedSummary** (required, string): A thorough paragraph explaining the key content, purpose, and value of the note.

4. **topics** (required, list of strings): List 3-5 main topics or themes covered in the note.

5. **keyTakeaways** (required, list of strings): List 2-5 actionable takeaways, insights, or important points from the note.

Do NOT leave any field empty. Every field must have meaningful content.";

            var options = new StructuredOutputOptions
            {
                Temperature = 0.3f,
                MaxTokens = 1000,
                SystemInstruction = "You are an expert summarization assistant. Create clear, comprehensive summaries that capture all essential information. Every field must be populated with meaningful content."
            };

            var summary = await StructuredOutputService.GenerateAsync<ContentSummary>(prompt, options);

            if (summary == null)
            {
                return "Error: Failed to generate summary.";
            }

            var response = new
            {
                type = "summary",
                status = "complete",
                message = $"Summary complete for note \"{note.Title}\"",
                noteId = note.Id,
                noteTitle = note.Title,
                summary = new
                {
                    oneLiner = summary.OneLiner,
                    shortSummary = summary.ShortSummary,
                    detailedSummary = summary.DetailedSummary,
                    topics = summary.Topics,
                    keyTakeaways = summary.KeyTakeaways
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("summarizing note", ex.Message);
        }
    }

    [KernelFunction("CompareNotes")]
    [Description("Compares two notes using AI to identify similarities, differences, and relationships between them.")]
    public async Task<string> CompareNotesAsync(
        [Description("The ID of the first note")] string noteId1,
        [Description("The ID of the second note")] string noteId2)
    {
        var userError = ValidateUserContext("compare notes");
        if (userError != null) return userError;

        if (StructuredOutputService == null)
        {
            return "Error: Note comparison requires AI structured output service which is not available.";
        }

        try
        {
            var note1 = await NoteRepository.GetByIdAsync(noteId1);
            var note2 = await NoteRepository.GetByIdAsync(noteId2);

            if (note1 == null)
            {
                return $"Note with ID \"{noteId1}\" not found.";
            }

            if (note2 == null)
            {
                return $"Note with ID \"{noteId2}\" not found.";
            }

            if (note1.UserId != CurrentUserId || note2.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to access one or both notes.";
            }

            // Truncate content if too long
            var content1 = note1.Content.Length > 2000 ? note1.Content.Substring(0, 2000) + "..." : note1.Content;
            var content2 = note2.Content.Length > 2000 ? note2.Content.Substring(0, 2000) + "..." : note2.Content;

            var prompt = $@"Compare these two notes and provide a structured analysis.

**Note 1:**
- Title: {note1.Title}
- Tags: {(note1.Tags.Any() ? string.Join(", ", note1.Tags) : "none")}
- Content: {content1}

**Note 2:**
- Title: {note2.Title}
- Tags: {(note2.Tags.Any() ? string.Join(", ", note2.Tags) : "none")}
- Content: {content2}

**Instructions:**
You MUST provide responses for ALL of the following fields:

1. **similarities** (required, list of strings): List 3-7 specific things these notes have in common. Consider shared themes, topics, target audience, purpose, terminology, or structure.

2. **differences** (required, list of strings): List 3-7 specific ways these notes differ. Consider different focus areas, features, target users, use cases, technical approaches, or scope. Even similar products have differences - find them.

3. **similarityScore** (required, float 0.0-1.0): Overall similarity score where 0.0 means completely different and 1.0 means identical.

4. **recommendation** (required, string): A specific actionable recommendation for how these notes could be organized, linked, merged, or used together. Be specific and helpful.

Do NOT leave any field empty. Every field must have meaningful content.";

            var options = new StructuredOutputOptions
            {
                Temperature = 0.4f,
                MaxTokens = 1000,
                SystemInstruction = "You are an expert note comparison assistant. Your job is to thoroughly analyze notes and identify BOTH similarities AND differences. Never leave the differences field empty - every pair of notes has differences. Provide actionable recommendations."
            };

            var comparison = await StructuredOutputService.GenerateAsync<ComparisonResult>(prompt, options);

            if (comparison == null)
            {
                return "Error: Failed to generate comparison.";
            }

            // Ensure we have meaningful data (fallback if model still returns empty)
            var differences = comparison.Differences.Any()
                ? comparison.Differences
                : new List<string> { "Notes have different primary focuses", "Content structure varies between the two" };

            var recommendation = !string.IsNullOrWhiteSpace(comparison.Recommendation)
                ? comparison.Recommendation
                : $"Consider linking these notes together as they share common themes. Create a parent folder or tag to group related {(note1.Tags.Any() ? note1.Tags.First() : "topics")}.";

            var response = new
            {
                type = "comparison",
                status = "complete",
                message = $"Comparison complete: \"{note1.Title}\" vs \"{note2.Title}\"",
                notes = new[]
                {
                    new { id = note1.Id, title = note1.Title },
                    new { id = note2.Id, title = note2.Title }
                },
                comparison = new
                {
                    similarities = comparison.Similarities,
                    differences = differences,
                    similarityScore = comparison.SimilarityScore,
                    recommendation = recommendation
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("comparing notes", ex.Message);
        }
    }
}
