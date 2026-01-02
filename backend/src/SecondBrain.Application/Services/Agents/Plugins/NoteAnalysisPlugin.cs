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
/// AnalyzeNote (unified: full/tags/summary), CompareNotes, ViewNoteImages, AnalyzeImage.
/// </summary>
public class NoteAnalysisPlugin : NotePluginBase
{
    private readonly INoteImageRepository? _imageRepository;

    public NoteAnalysisPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteImageRepository? imageRepository = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService)
    {
        _imageRepository = imageRepository;
    }

    public override string CapabilityId => "notes-analysis";
    public override string DisplayName => "Notes Analysis";
    public override string Description => "AI-powered note analysis including summarization, tag suggestions, and note comparison";

    public override string GetPluginName() => "NotesAnalysis";

    public override string GetSystemPromptAddition() => @"
### AI-Powered Analysis Tools

- **AnalyzeNote**: Unified AI analysis tool with three modes (via `type` parameter):
  - `type='full'` (DEFAULT): Comprehensive analysis with tags, key points, sentiment, folder suggestions
    - Use for: 'analyze this note', 'what's this note about?', 'review my note'
  - `type='tags'`: Tag suggestions only, with current vs new tag comparison
    - Use for: 'suggest tags for note X', 'help me categorize this note', 'what tags should I add?'
  - `type='summary'`: Summaries at multiple levels (one-liner, short, detailed) + topics/takeaways
    - Use for: 'summarize this note', 'give me a quick overview', 'what are the key points?'
  - Also accepts `maxTags` parameter (default: 5) for 'tags' type

- **CompareNotes**: Compare two notes for similarities and differences
  - Identifies shared themes and unique aspects
  - Provides similarity score and recommendations
  - Use for finding connections between notes

- **ViewNoteImages**: List images attached to a note
  - Returns image metadata and URLs for viewing (small response, no base64)
  - Use first to discover what images exist on a note
  - Frontend displays the images in the tool execution card

- **AnalyzeImage**: Analyze a specific image's visual content
  - Use when you need to actually SEE and describe an image in detail
  - First call ViewNoteImages to get image IDs, then AnalyzeImage for the one you need
  - Only available for vision-capable models (Claude 3+, GPT-4o, Gemini)";

    [KernelFunction("AnalyzeNote")]
    [Description("AI analysis of note. type='full' (default) for comprehensive analysis with tags/keypoints/sentiment, 'tags' for tag suggestions only, 'summary' for summaries. Examples: 'analyze this note' -> full, 'suggest tags for note X' -> tags, 'summarize my notes' -> summary.")]
    public async Task<string> AnalyzeNoteAsync(
        [Description("Note ID to analyze")] string noteId,
        [Description("Analysis type: 'full'|'tags'|'summary'")] string type = "full",
        [Description("Max tags for 'tags' type (default: 5)")] int maxTags = 5)
    {
        var userError = ValidateUserContext("analyze note");
        if (userError != null) return userError;

        if (StructuredOutputService == null)
        {
            return "Error: Note analysis requires AI structured output service which is not available.";
        }

        // Normalize type parameter
        var analysisType = (type?.ToLowerInvariant() ?? "full") switch
        {
            "tags" => "tags",
            "summary" => "summary",
            _ => "full"
        };

        try
        {
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // Handle "tags" analysis type
            if (analysisType == "tags")
            {
                var tagsPrompt = $@"Suggest {maxTags} relevant tags for categorizing this note.

Note Title: {note.Title}

Note Content:
{note.Content}

Current Tags: {(note.Tags.Any() ? string.Join(", ", note.Tags) : "none")}

Suggest tags that:
- Capture the main topics and themes
- Would help with future searches
- Are concise (1-2 words each)
- Are different from existing tags when possible";

                var tagsOptions = new StructuredOutputOptions
                {
                    Temperature = 0.3f,
                    MaxTokens = 300,
                    SystemInstruction = "You are a note categorization assistant. Suggest concise, relevant tags for organizing notes."
                };

                var tagsAnalysis = await StructuredOutputService.GenerateAsync<NoteAnalysis>(tagsPrompt, tagsOptions);

                if (tagsAnalysis == null || !tagsAnalysis.Tags.Any())
                {
                    return "Error: Failed to generate tag suggestions.";
                }

                var suggestedTags = tagsAnalysis.Tags.Take(maxTags).ToList();
                var newTags = suggestedTags.Where(t => !note.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();

                return JsonSerializer.Serialize(new
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
                });
            }

            // Handle "summary" analysis type
            if (analysisType == "summary")
            {
                var summaryPrompt = $@"Create a comprehensive summary of this note.

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

                var summaryOptions = new StructuredOutputOptions
                {
                    Temperature = 0.3f,
                    MaxTokens = 1000,
                    SystemInstruction = "You are an expert summarization assistant. Create clear, comprehensive summaries that capture all essential information. Every field must be populated with meaningful content."
                };

                var summary = await StructuredOutputService.GenerateAsync<ContentSummary>(summaryPrompt, summaryOptions);

                if (summary == null)
                {
                    return "Error: Failed to generate summary.";
                }

                return JsonSerializer.Serialize(new
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
                });
            }

            // Default: "full" analysis type
            var fullPrompt = $@"Analyze the following note and extract structured information.

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

            var fullOptions = new StructuredOutputOptions
            {
                Temperature = 0.3f,
                MaxTokens = 800,
                SystemInstruction = "You are a note analysis assistant. Analyze notes to extract key information, suggest organization, and identify themes."
            };

            var fullAnalysis = await StructuredOutputService.GenerateAsync<NoteAnalysis>(fullPrompt, fullOptions);

            if (fullAnalysis == null)
            {
                return "Error: Failed to analyze the note. The AI service did not return a valid analysis.";
            }

            return JsonSerializer.Serialize(new
            {
                type = "analysis",
                message = $"Analysis complete for note \"{note.Title}\"",
                noteId = note.Id,
                noteTitle = note.Title,
                analysis = new
                {
                    suggestedTitle = fullAnalysis.Title,
                    summary = fullAnalysis.Summary,
                    suggestedTags = fullAnalysis.Tags,
                    currentTags = note.Tags,
                    keyPoints = fullAnalysis.KeyPoints,
                    sentiment = fullAnalysis.Sentiment,
                    suggestedFolder = fullAnalysis.SuggestedFolder,
                    currentFolder = note.Folder
                }
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("analyzing note", ex.Message);
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
            var note1 = await NoteRepository.GetByIdForUserAsync(noteId1, CurrentUserId);
            var note2 = await NoteRepository.GetByIdForUserAsync(noteId2, CurrentUserId);

            if (note1 == null)
            {
                return $"Note with ID \"{noteId1}\" not found or you don't have permission to access it.";
            }

            if (note2 == null)
            {
                return $"Note with ID \"{noteId2}\" not found or you don't have permission to access it.";
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

    [KernelFunction("ViewNoteImages")]
    [Description("List all images attached to a specific note. Returns image metadata and URLs for viewing (no base64 data). Use AnalyzeImage if you need to examine an image's visual content in detail.")]
    public async Task<string> ViewNoteImagesAsync(
        [Description("The ID of the note whose images you want to list")] string noteId)
    {
        var userError = ValidateUserContext("view note images");
        if (userError != null) return userError;

        if (_imageRepository == null)
        {
            return "Error: Image viewing service is not available.";
        }

        try
        {
            // First verify the note exists and user has access
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // Get all images for this note
            var images = await _imageRepository.GetByNoteIdAsync(noteId);

            if (images.Count == 0)
            {
                var response = new
                {
                    type = "images",
                    message = $"Note \"{note.Title}\" has no images attached.",
                    noteId = note.Id,
                    noteTitle = note.Title,
                    imageCount = 0,
                    images = Array.Empty<object>()
                };
                return JsonSerializer.Serialize(response);
            }

            // Return structured response with metadata + URLs only (no base64!)
            // Frontend prefixes with API base URL and fetches from /notes/images/{id} endpoint
            var imageResponse = new
            {
                type = "images",
                message = $"Found {images.Count} image(s) for note \"{note.Title}\". Use AnalyzeImage with an image ID if you need to see the visual content.",
                noteId = note.Id,
                noteTitle = note.Title,
                imageCount = images.Count,
                images = images.OrderBy(i => i.ImageIndex).Select(img => new
                {
                    id = img.Id,
                    url = $"/notes/images/{img.Id}",  // Relative path - frontend prefixes with API base URL
                    mediaType = img.MediaType,
                    fileName = img.FileName,
                    imageIndex = img.ImageIndex,
                    description = img.Description ?? "No description available - use AnalyzeImage to examine",
                    altText = img.AltText
                }).ToList()
            };

            return JsonSerializer.Serialize(imageResponse);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("viewing note images", ex.Message);
        }
    }

    [KernelFunction("AnalyzeImage")]
    [Description("Analyze a specific image's visual content. Use this when you need to actually SEE and describe what's in an image. First call ViewNoteImages to get the image IDs.")]
    public async Task<string> AnalyzeImageAsync(
        [Description("The ID of the image to analyze (get this from ViewNoteImages)")] string imageId)
    {
        var userError = ValidateUserContext("analyze image");
        if (userError != null) return userError;

        if (_imageRepository == null)
        {
            return "Error: Image analysis service is not available.";
        }

        try
        {
            var image = await _imageRepository.GetByIdAsync(imageId);

            if (image == null || image.UserId != CurrentUserId)
            {
                return $"Image with ID \"{imageId}\" not found or you don't have permission to access it.";
            }

            // IMPORTANT: Return two parts:
            // 1. __IMAGE_DATA__ section - parsed by streaming strategy, NOT stored in history
            // 2. Lightweight text result - this is what gets stored in conversation history
            //
            // The streaming strategy will:
            // - Extract and remove __IMAGE_DATA__ from the result before storing
            // - Use the image data to inject into the model's immediate context
            // - Store only the lightweight text in conversation history
            var imageDataSection = $"__IMAGE_DATA__{image.MediaType}|{image.Base64Data}__END_IMAGE_DATA__";

            var textResult = new
            {
                type = "image_analysis",
                message = $"Image loaded: {image.FileName ?? imageId}. I can now see and analyze this image.",
                imageId = image.Id,
                mediaType = image.MediaType,
                fileName = image.FileName,
                existingDescription = image.Description,
                altText = image.AltText
            };

            // Combine: image data marker + JSON result
            // Strategy will strip __IMAGE_DATA__...__END_IMAGE_DATA__ before storing
            return imageDataSection + JsonSerializer.Serialize(textResult);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("analyzing image", ex.Message);
        }
    }
}
