using System.Text.RegularExpressions;
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

    // Regex patterns for semantic boundary detection
    private static readonly Regex MarkdownHeaderRegex = new(@"^#{1,6}\s+.+$", RegexOptions.Multiline | RegexOptions.Compiled);
    private static readonly Regex CodeBlockRegex = new(@"```[\s\S]*?```", RegexOptions.Compiled);
    private static readonly Regex ListItemRegex = new(@"^[\s]*[-*+]\s+.+$|^[\s]*\d+\.\s+.+$", RegexOptions.Multiline | RegexOptions.Compiled);
    private static readonly Regex BlockQuoteRegex = new(@"^>\s+.+$", RegexOptions.Multiline | RegexOptions.Compiled);

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

        // Use semantic chunking if enabled, otherwise fall back to basic chunking
        if (_settings.EnableSemanticChunking)
        {
            return SemanticChunkText(enrichedContent, note.Title);
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

    /// <summary>
    /// Semantic chunking that respects document structure (headers, code blocks, lists)
    /// </summary>
    private List<NoteChunk> SemanticChunkText(string text, string noteTitle)
    {
        var chunks = new List<NoteChunk>();
        var estimatedTokens = EstimateTokenCount(text);

        // If text is small enough, return as single chunk
        if (estimatedTokens <= _settings.MaxChunkSize)
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

        // First, identify and extract code blocks (preserve them as units)
        var codeBlocks = new List<(int Start, int End, string Content)>();
        foreach (Match match in CodeBlockRegex.Matches(text))
        {
            codeBlocks.Add((match.Index, match.Index + match.Length, match.Value));
        }

        // Split by semantic sections (headers)
        var sections = SplitBySemanticSections(text, noteTitle);

        var chunkIndex = 0;
        var currentPosition = 0;

        foreach (var section in sections)
        {
            var sectionChunks = ProcessSection(section, ref chunkIndex, ref currentPosition);
            chunks.AddRange(sectionChunks);
        }

        // Merge small chunks to avoid fragmentation
        chunks = MergeSmallChunks(chunks);

        _logger.LogInformation(
            "Semantic chunking complete. Sections: {Sections}, Chunks: {Chunks}",
            sections.Count, chunks.Count);

        return chunks;
    }

    /// <summary>
    /// Splits text into semantic sections based on markdown headers
    /// </summary>
    private List<SemanticSection> SplitBySemanticSections(string text, string noteTitle)
    {
        var sections = new List<SemanticSection>();
        var headerMatches = MarkdownHeaderRegex.Matches(text);

        if (headerMatches.Count == 0)
        {
            // No headers, treat entire text as one section
            sections.Add(new SemanticSection
            {
                Header = noteTitle,
                Content = text,
                Level = 0,
                StartPosition = 0
            });
            return sections;
        }

        // Add content before first header (if any)
        var firstHeaderIndex = headerMatches[0].Index;
        if (firstHeaderIndex > 0)
        {
            var preHeaderContent = text.Substring(0, firstHeaderIndex).Trim();
            if (!string.IsNullOrWhiteSpace(preHeaderContent))
            {
                sections.Add(new SemanticSection
                {
                    Header = noteTitle,
                    Content = preHeaderContent,
                    Level = 0,
                    StartPosition = 0
                });
            }
        }

        // Process each header section
        for (int i = 0; i < headerMatches.Count; i++)
        {
            var match = headerMatches[i];
            var headerLevel = match.Value.TakeWhile(c => c == '#').Count();
            var headerText = match.Value.TrimStart('#').Trim();

            var contentStart = match.Index + match.Length;
            var contentEnd = i < headerMatches.Count - 1
                ? headerMatches[i + 1].Index
                : text.Length;

            var sectionContent = text.Substring(contentStart, contentEnd - contentStart).Trim();

            sections.Add(new SemanticSection
            {
                Header = headerText,
                Content = sectionContent,
                Level = headerLevel,
                StartPosition = match.Index,
                ParentHeader = GetParentHeader(sections, headerLevel)
            });
        }

        return sections;
    }

    private string? GetParentHeader(List<SemanticSection> sections, int currentLevel)
    {
        // Find the most recent section with a lower level (higher in hierarchy)
        for (int i = sections.Count - 1; i >= 0; i--)
        {
            if (sections[i].Level < currentLevel && sections[i].Level > 0)
            {
                return sections[i].Header;
            }
        }
        return null;
    }

    /// <summary>
    /// Process a semantic section into chunks, respecting the section context
    /// </summary>
    private List<NoteChunk> ProcessSection(SemanticSection section, ref int chunkIndex, ref int currentPosition)
    {
        var chunks = new List<NoteChunk>();
        var sectionTokens = EstimateTokenCount(section.Content);

        // Build context header for this section
        var contextHeader = BuildContextHeader(section);

        // If section fits in one chunk, return it
        if (sectionTokens + EstimateTokenCount(contextHeader) <= _settings.MaxChunkSize)
        {
            var content = string.IsNullOrEmpty(contextHeader)
                ? section.Content
                : $"{contextHeader}\n\n{section.Content}";

            chunks.Add(new NoteChunk
            {
                Content = content,
                ChunkIndex = chunkIndex++,
                StartPosition = currentPosition,
                EndPosition = currentPosition + content.Length,
                TokenCount = EstimateTokenCount(content),
                SectionHeader = section.Header
            });
            currentPosition += content.Length;
            return chunks;
        }

        // Section is too large, need to split further
        var subChunks = ChunkLargeSection(section, contextHeader, ref chunkIndex, ref currentPosition);
        chunks.AddRange(subChunks);

        return chunks;
    }

    /// <summary>
    /// Builds a context header that includes hierarchy information
    /// </summary>
    private string BuildContextHeader(SemanticSection section)
    {
        if (string.IsNullOrWhiteSpace(section.Header))
            return string.Empty;

        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(section.ParentHeader))
        {
            parts.Add($"Section: {section.ParentHeader}");
        }

        if (section.Level > 0)
        {
            var headerPrefix = new string('#', section.Level);
            parts.Add($"{headerPrefix} {section.Header}");
        }
        else
        {
            parts.Add($"Context: {section.Header}");
        }

        return string.Join(" > ", parts);
    }

    /// <summary>
    /// Chunks a large section while preserving semantic units (lists, code blocks, paragraphs)
    /// </summary>
    private List<NoteChunk> ChunkLargeSection(
        SemanticSection section,
        string contextHeader,
        ref int chunkIndex,
        ref int currentPosition)
    {
        var chunks = new List<NoteChunk>();
        var contextHeaderTokens = EstimateTokenCount(contextHeader);
        var maxContentTokens = _settings.MaxChunkSize - contextHeaderTokens - 10; // Buffer

        // Split content into semantic units (paragraphs, lists, code blocks)
        var units = SplitIntoSemanticUnits(section.Content);

        var currentChunkUnits = new List<string>();
        var currentTokenCount = 0;

        foreach (var unit in units)
        {
            var unitTokens = EstimateTokenCount(unit);

            // If single unit exceeds max, we need to split it further
            if (unitTokens > maxContentTokens)
            {
                // Flush current chunk if we have content
                if (currentChunkUnits.Any())
                {
                    chunks.Add(CreateChunk(contextHeader, currentChunkUnits, section.Header, ref chunkIndex, ref currentPosition));
                    currentChunkUnits.Clear();
                    currentTokenCount = 0;
                }

                // Split the large unit by sentences
                var subUnits = SplitLargeUnit(unit, maxContentTokens);
                foreach (var subUnit in subUnits)
                {
                    chunks.Add(CreateChunk(contextHeader, new List<string> { subUnit }, section.Header, ref chunkIndex, ref currentPosition));
                }
                continue;
            }

            // Check if adding this unit would exceed the limit
            if (currentTokenCount + unitTokens > maxContentTokens && currentChunkUnits.Any())
            {
                // Create chunk from current content
                chunks.Add(CreateChunk(contextHeader, currentChunkUnits, section.Header, ref chunkIndex, ref currentPosition));

                // Start new chunk with overlap
                var overlapUnits = GetOverlapUnits(currentChunkUnits, _settings.ChunkOverlap);
                currentChunkUnits = overlapUnits.ToList();
                currentTokenCount = overlapUnits.Sum(u => EstimateTokenCount(u));
            }

            currentChunkUnits.Add(unit);
            currentTokenCount += unitTokens;
        }

        // Add remaining content
        if (currentChunkUnits.Any())
        {
            chunks.Add(CreateChunk(contextHeader, currentChunkUnits, section.Header, ref chunkIndex, ref currentPosition));
        }

        return chunks;
    }

    /// <summary>
    /// Splits content into semantic units (paragraphs, list blocks, code blocks)
    /// </summary>
    private List<string> SplitIntoSemanticUnits(string content)
    {
        var units = new List<string>();
        var remaining = content;

        // Extract code blocks first (they should not be split)
        var codeBlockMatches = CodeBlockRegex.Matches(remaining);
        var codeBlocks = new Dictionary<string, string>();
        var placeholderIndex = 0;

        foreach (Match match in codeBlockMatches)
        {
            var placeholder = $"__CODE_BLOCK_{placeholderIndex++}__";
            codeBlocks[placeholder] = match.Value;
            remaining = remaining.Replace(match.Value, placeholder);
        }

        // Split by double newlines (paragraph boundaries)
        var paragraphs = remaining.Split(new[] { "\n\n", "\r\n\r\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var paragraph in paragraphs)
        {
            var trimmedParagraph = paragraph.Trim();
            if (string.IsNullOrWhiteSpace(trimmedParagraph))
                continue;

            // Check if this paragraph contains a code block placeholder
            foreach (var kvp in codeBlocks)
            {
                if (trimmedParagraph.Contains(kvp.Key))
                {
                    trimmedParagraph = trimmedParagraph.Replace(kvp.Key, kvp.Value);
                }
            }

            // Check if this is a list (multiple list items should stay together if possible)
            if (IsListBlock(trimmedParagraph))
            {
                units.Add(trimmedParagraph);
            }
            else
            {
                units.Add(trimmedParagraph);
            }
        }

        return units;
    }

    private bool IsListBlock(string text)
    {
        var lines = text.Split('\n');
        var listLineCount = lines.Count(l => ListItemRegex.IsMatch(l));
        return listLineCount > lines.Length / 2; // More than half are list items
    }

    /// <summary>
    /// Splits a large unit (paragraph) into smaller pieces by sentences
    /// </summary>
    private List<string> SplitLargeUnit(string unit, int maxTokens)
    {
        var pieces = new List<string>();
        var sentences = SplitIntoSentences(unit);

        var currentPiece = new List<string>();
        var currentTokens = 0;

        foreach (var sentence in sentences)
        {
            var sentenceTokens = EstimateTokenCount(sentence);

            if (currentTokens + sentenceTokens > maxTokens && currentPiece.Any())
            {
                pieces.Add(string.Join(" ", currentPiece));
                currentPiece.Clear();
                currentTokens = 0;
            }

            currentPiece.Add(sentence);
            currentTokens += sentenceTokens;
        }

        if (currentPiece.Any())
        {
            pieces.Add(string.Join(" ", currentPiece));
        }

        return pieces;
    }

    private NoteChunk CreateChunk(
        string contextHeader,
        List<string> contentUnits,
        string? sectionHeader,
        ref int chunkIndex,
        ref int currentPosition)
    {
        var contentText = string.Join("\n\n", contentUnits);
        var fullContent = string.IsNullOrEmpty(contextHeader)
            ? contentText
            : $"{contextHeader}\n\n{contentText}";

        var chunk = new NoteChunk
        {
            Content = fullContent,
            ChunkIndex = chunkIndex++,
            StartPosition = currentPosition,
            EndPosition = currentPosition + fullContent.Length,
            TokenCount = EstimateTokenCount(fullContent),
            SectionHeader = sectionHeader
        };

        currentPosition += fullContent.Length;
        return chunk;
    }

    private List<string> GetOverlapUnits(List<string> units, int overlapTokens)
    {
        var overlapUnits = new List<string>();
        var tokenCount = 0;

        for (int i = units.Count - 1; i >= 0; i--)
        {
            var unitTokens = EstimateTokenCount(units[i]);
            if (tokenCount + unitTokens > overlapTokens)
                break;

            overlapUnits.Insert(0, units[i]);
            tokenCount += unitTokens;
        }

        return overlapUnits;
    }

    /// <summary>
    /// Merges small chunks to avoid fragmentation and improve retrieval quality
    /// </summary>
    private List<NoteChunk> MergeSmallChunks(List<NoteChunk> chunks)
    {
        if (chunks.Count <= 1)
            return chunks;

        var mergedChunks = new List<NoteChunk>();
        var minChunkTokens = _settings.MinChunkSize;

        NoteChunk? pendingChunk = null;

        foreach (var chunk in chunks)
        {
            if (pendingChunk == null)
            {
                if (chunk.TokenCount < minChunkTokens)
                {
                    pendingChunk = chunk;
                }
                else
                {
                    mergedChunks.Add(chunk);
                }
                continue;
            }

            // We have a pending small chunk, try to merge
            var combinedTokens = pendingChunk.TokenCount + chunk.TokenCount;

            if (combinedTokens <= _settings.MaxChunkSize)
            {
                // Merge them
                pendingChunk = new NoteChunk
                {
                    Content = $"{pendingChunk.Content}\n\n{chunk.Content}",
                    ChunkIndex = pendingChunk.ChunkIndex,
                    StartPosition = pendingChunk.StartPosition,
                    EndPosition = chunk.EndPosition,
                    TokenCount = combinedTokens,
                    SectionHeader = pendingChunk.SectionHeader ?? chunk.SectionHeader
                };

                // If merged chunk is now large enough, add it
                if (pendingChunk.TokenCount >= minChunkTokens)
                {
                    mergedChunks.Add(pendingChunk);
                    pendingChunk = null;
                }
            }
            else
            {
                // Can't merge, add pending chunk as-is
                mergedChunks.Add(pendingChunk);
                
                if (chunk.TokenCount < minChunkTokens)
                {
                    pendingChunk = chunk;
                }
                else
                {
                    mergedChunks.Add(chunk);
                    pendingChunk = null;
                }
            }
        }

        // Don't forget the last pending chunk
        if (pendingChunk != null)
        {
            mergedChunks.Add(pendingChunk);
        }

        // Re-index chunks
        for (int i = 0; i < mergedChunks.Count; i++)
        {
            mergedChunks[i].ChunkIndex = i;
        }

        if (mergedChunks.Count < chunks.Count)
        {
            _logger.LogDebug(
                "Merged small chunks: {Original} -> {Merged}",
                chunks.Count, mergedChunks.Count);
        }

        return mergedChunks;
    }

    // Legacy method for backward compatibility
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
        string chunkContent = string.Join("\n", contentParts);

        chunks.Add(new NoteChunk
        {
            Content = chunkContent,
            ChunkIndex = chunkIndex++,
            StartPosition = startPosition,
            EndPosition = startPosition + chunkContent.Length,
            TokenCount = tokenCount
        });

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

    /// <summary>
    /// Internal class representing a semantic section of a document
    /// </summary>
    private class SemanticSection
    {
        public string Header { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int Level { get; set; }
        public int StartPosition { get; set; }
        public string? ParentHeader { get; set; }
    }
}
