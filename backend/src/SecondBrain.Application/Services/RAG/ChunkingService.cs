using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.RAG;

public class ChunkingService : IChunkingService
{
    private readonly RagSettings _settings;
    private readonly ILogger<ChunkingService> _logger;

    public ChunkingService(
        IOptions<RagSettings> settings,
        ILogger<ChunkingService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public List<NoteChunk> ChunkNote(Note note)
    {
        // Build enriched content with metadata for better semantic search
        var enrichedContent = BuildEnrichedContent(note);

        if (!_settings.EnableChunking || string.IsNullOrWhiteSpace(note.Content))
        {
            // Return entire content as single chunk
            return new List<NoteChunk>
            {
                new NoteChunk
                {
                    Content = enrichedContent,
                    ChunkIndex = 0,
                    StartPosition = 0,
                    EndPosition = enrichedContent.Length,
                    TokenCount = EstimateTokenCount(enrichedContent)
                }
            };
        }

        return ChunkText(enrichedContent, _settings.ChunkSize, _settings.ChunkOverlap);
    }

    private string BuildEnrichedContent(Note note)
    {
        var contentParts = new List<string>();

        // Add title
        if (!string.IsNullOrWhiteSpace(note.Title))
        {
            contentParts.Add($"Title: {note.Title}");
        }

        // Add tags
        if (note.Tags != null && note.Tags.Any())
        {
            contentParts.Add($"Tags: {string.Join(", ", note.Tags)}");
        }

        // Add date information for temporal context
        if (note.CreatedAt != default)
        {
            contentParts.Add($"Created: {note.CreatedAt:yyyy-MM-dd}");
        }

        if (note.UpdatedAt != default)
        {
            contentParts.Add($"Last Updated: {note.UpdatedAt:yyyy-MM-dd}");
        }

        // Add main content
        if (!string.IsNullOrWhiteSpace(note.Content))
        {
            contentParts.Add($"\nContent:\n{note.Content}");
        }

        var enrichedContent = string.Join("\n", contentParts);

        _logger.LogDebug(
            "Built enriched content for note. NoteId: {NoteId}, Title: {Title}, TagCount: {TagCount}, HasDates: {HasDates}, TotalLength: {Length}",
            note.Id, note.Title, note.Tags?.Count ?? 0, note.CreatedAt != default, enrichedContent.Length);

        return enrichedContent;
    }

    public List<NoteChunk> ChunkText(string text, int maxChunkSize, int overlap)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new List<NoteChunk>();
        }

        var chunks = new List<NoteChunk>();
        var estimatedTokens = EstimateTokenCount(text);

        // If text is small enough, return as single chunk
        if (estimatedTokens <= maxChunkSize)
        {
            chunks.Add(new NoteChunk
            {
                Content = text,
                ChunkIndex = 0,
                StartPosition = 0,
                EndPosition = text.Length,
                TokenCount = estimatedTokens
            });
            return chunks;
        }

        // Split text into paragraphs first
        var paragraphs = text.Split(new[] { "\n\n", "\r\n\r\n" }, StringSplitOptions.RemoveEmptyEntries);

        var currentChunk = new List<string>();
        var currentTokenCount = 0;
        var chunkIndex = 0;
        var startPosition = 0;

        foreach (var paragraph in paragraphs)
        {
            // If a paragraph is too long, split it into sentences
            var paragraphTokens = EstimateTokenCount(paragraph);
            if (paragraphTokens > maxChunkSize)
            {
                // If we have accumulated content, flush it first
                if (currentChunk.Any())
                {
                    AddChunk(chunks, currentChunk, ref chunkIndex, ref startPosition, currentTokenCount);

                    // Handle overlap for the next chunk
                    var overlapSentences = GetOverlapSentences(currentChunk, overlap);
                    currentChunk = overlapSentences.ToList();
                    currentTokenCount = overlapSentences.Sum(s => EstimateTokenCount(s));
                }

                // Now process the large paragraph by sentences
                var sentences = SplitIntoSentences(paragraph);
                foreach (var sentence in sentences)
                {
                    var sentenceTokens = EstimateTokenCount(sentence);

                    if (currentTokenCount + sentenceTokens > maxChunkSize && currentChunk.Any())
                    {
                        AddChunk(chunks, currentChunk, ref chunkIndex, ref startPosition, currentTokenCount);

                        var overlapSentences = GetOverlapSentences(currentChunk, overlap);
                        currentChunk = overlapSentences.ToList();
                        currentTokenCount = overlapSentences.Sum(s => EstimateTokenCount(s));
                    }

                    currentChunk.Add(sentence);
                    currentTokenCount += sentenceTokens;
                }
            }
            else
            {
                // Paragraph fits, but does it fit in current chunk?
                if (currentTokenCount + paragraphTokens > maxChunkSize && currentChunk.Any())
                {
                    AddChunk(chunks, currentChunk, ref chunkIndex, ref startPosition, currentTokenCount);

                    // For paragraph-based chunks, overlap is harder to define perfectly without breaking paragraphs.
                    // We'll try to keep the last few sentences of the previous chunk as overlap if possible, 
                    // or just start fresh if it's a clean break.
                    // Ideally, we'd use the last paragraph, but it might be too big for overlap.
                    // Let's fallback to sentence-based overlap from the accumulated text.

                    var overlapSentences = GetOverlapSentences(currentChunk, overlap);
                    currentChunk = overlapSentences.ToList();
                    currentTokenCount = overlapSentences.Sum(s => EstimateTokenCount(s));
                }

                currentChunk.Add(paragraph);
                currentTokenCount += paragraphTokens;
            }
        }

        // Add remaining content
        if (currentChunk.Any())
        {
            AddChunk(chunks, currentChunk, ref chunkIndex, ref startPosition, currentTokenCount);
        }

        _logger.LogInformation("Chunked text into {ChunkCount} chunks", chunks.Count);
        return chunks;
    }

    private void AddChunk(List<NoteChunk> chunks, List<string> contentParts, ref int chunkIndex, ref int startPosition, int tokenCount)
    {
        // Join with newlines if parts look like paragraphs, or spaces if they look like sentences.
        // Since we mix them, we need to be careful. 
        // However, our inputs are strings. If we split by paragraph, we should probably join by newline.
        // If we split by sentence, we join by space.
        // To simplify, we can check if the parts contain newlines.

        string chunkContent;
        // Heuristic: if most parts are short, use space. If parts are long or contain newlines, use newline.
        // Or simpler: just join with space if it was sentence split, newline if paragraph.
        // But we mixed them. Let's use a specialized joiner.

        // Actually, we can just join with " " for now as embedding models are robust to whitespace, 
        // but preserving structure is better.
        // Let's join with "\n" if the parts were originally paragraphs, but we lost that distinction in the list.
        // We'll default to "\n" as it's safer for readability in the retrieved context.

        chunkContent = string.Join("\n", contentParts);

        chunks.Add(new NoteChunk
        {
            Content = chunkContent,
            ChunkIndex = chunkIndex++,
            StartPosition = startPosition,
            EndPosition = startPosition + chunkContent.Length,
            TokenCount = tokenCount
        });

        // Update start position logic is tricky with mixed joins. 
        // We'll approximate it or track it better if needed.
        // For RAG context, exact char position isn't critical, but uniqueness is.
        startPosition += chunkContent.Length;
    }

    private List<string> SplitIntoSentences(string text)
    {
        // Split on sentence boundaries (., !, ?) followed by whitespace
        var sentenceEndings = new[] { ". ", "! ", "? ", ".\n", "!\n", "?\n" };
        var sentences = new List<string>();
        var currentSentence = "";

        for (int i = 0; i < text.Length; i++)
        {
            currentSentence += text[i];

            // Check if we're at a sentence boundary
            foreach (var ending in sentenceEndings)
            {
                if (currentSentence.EndsWith(ending))
                {
                    sentences.Add(currentSentence.Trim());
                    currentSentence = "";
                    break;
                }
            }
        }

        // Add remaining text
        if (!string.IsNullOrWhiteSpace(currentSentence))
        {
            sentences.Add(currentSentence.Trim());
        }

        // If no sentences were found (no sentence boundaries), split by approximate token count
        if (sentences.Count == 0)
        {
            sentences.Add(text);
        }

        return sentences;
    }

    private List<string> GetOverlapSentences(List<string> sentences, int overlapTokens)
    {
        var overlapSentences = new List<string>();
        var tokenCount = 0;

        // Take sentences from the end until we reach the overlap token count
        for (int i = sentences.Count - 1; i >= 0; i--)
        {
            var sentenceTokens = EstimateTokenCount(sentences[i]);
            if (tokenCount + sentenceTokens > overlapTokens)
                break;

            overlapSentences.Insert(0, sentences[i]);
            tokenCount += sentenceTokens;
        }

        return overlapSentences;
    }

    private int EstimateTokenCount(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        // Rough estimation: 1 token ≈ 3.5 characters (conservative estimate for mixed content)
        // English is ~4 chars/token, code can be less. 3.5 is a safer average.
        return (int)Math.Ceiling(text.Length / 3.5);
    }
}

