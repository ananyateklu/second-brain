using System.Linq.Expressions;
using BenchmarkDotNet.Attributes;
using SecondBrain.Core.Entities;

namespace SecondBrain.Benchmarks;

/// <summary>
/// Benchmarks for repository query patterns.
/// Compares compiled vs non-compiled query expression tree building.
/// 
/// Note: These benchmarks measure the expression tree compilation overhead,
/// not the actual database execution time. For database benchmarks, 
/// use integration tests with a real database.
/// 
/// Run with: dotnet run -c Release -- --filter *RepositoryBenchmarks*
/// </summary>
[MemoryDiagnoser]
[SimpleJob(warmupCount: 3, iterationCount: 10)]
public class RepositoryBenchmarks
{
    private List<Note> _mockNotes = null!;
    private string _testUserId = null!;
    private string _testNoteId = null!;

    // Pre-compiled delegate (simulates EF.CompileQuery behavior)
    private static readonly Func<List<Note>, string, IEnumerable<Note>> CompiledGetByUserId =
        (notes, userId) => notes.Where(n => n.UserId == userId).OrderByDescending(n => n.UpdatedAt);

    private static readonly Func<List<Note>, string, Note?> CompiledGetById =
        (notes, noteId) => notes.FirstOrDefault(n => n.Id == noteId);

    private static readonly Func<List<Note>, string, string, Note?> CompiledGetByUserIdAndExternalId =
        (notes, userId, externalId) => notes.FirstOrDefault(n => n.UserId == userId && n.ExternalId == externalId);

    [GlobalSetup]
    public void Setup()
    {
        _testUserId = "user-benchmark-test";
        _testNoteId = "note-50";

        // Generate mock notes
        _mockNotes = Enumerable.Range(0, 1000)
            .Select(i => new Note
            {
                Id = $"note-{i}",
                Title = $"Note {i}",
                Content = $"Content for note {i} with some additional text for realistic sizing.",
                UserId = i % 10 == 0 ? _testUserId : $"user-{i % 5}",
                ExternalId = $"ext-{i}",
                Tags = new List<string> { "tag1", "tag2" },
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow.AddHours(-i),
                IsArchived = i % 20 == 0,
                IsDeleted = false
            })
            .ToList();
    }

    #region Query Pattern Benchmarks

    [Benchmark(Baseline = true, Description = "Non-compiled: GetByUserId with OrderBy")]
    public List<Note> NonCompiled_GetByUserId()
    {
        // This simulates building the expression tree each time
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .OrderByDescending(n => n.UpdatedAt)
            .ToList();
    }

    [Benchmark(Description = "Pre-compiled: GetByUserId with OrderBy")]
    public List<Note> Compiled_GetByUserId()
    {
        // Uses pre-compiled delegate
        return CompiledGetByUserId(_mockNotes, _testUserId).ToList();
    }

    [Benchmark(Description = "Non-compiled: GetById")]
    public Note? NonCompiled_GetById()
    {
        return _mockNotes.FirstOrDefault(n => n.Id == _testNoteId);
    }

    [Benchmark(Description = "Pre-compiled: GetById")]
    public Note? Compiled_GetById()
    {
        return CompiledGetById(_mockNotes, _testNoteId);
    }

    [Benchmark(Description = "Non-compiled: GetByUserIdAndExternalId")]
    public Note? NonCompiled_GetByUserIdAndExternalId()
    {
        return _mockNotes.FirstOrDefault(n => n.UserId == _testUserId && n.ExternalId == "ext-50");
    }

    [Benchmark(Description = "Pre-compiled: GetByUserIdAndExternalId")]
    public Note? Compiled_GetByUserIdAndExternalId()
    {
        return CompiledGetByUserIdAndExternalId(_mockNotes, _testUserId, "ext-50");
    }

    #endregion

    #region Expression Tree Building Benchmarks

    [Benchmark(Description = "Build predicate expression tree")]
    public Expression<Func<Note, bool>> BuildPredicateExpression()
    {
        // This simulates what LINQ does internally
        return n => n.UserId == _testUserId && !n.IsDeleted;
    }

    [Benchmark(Description = "Build and compile predicate")]
    public Func<Note, bool> BuildAndCompilePredicate()
    {
        Expression<Func<Note, bool>> expr = n => n.UserId == _testUserId && !n.IsDeleted;
        return expr.Compile();
    }

    [Benchmark(Description = "Use pre-compiled predicate")]
    public Note? UsePreCompiledPredicate()
    {
        // Pre-compiled - no expression tree building
        Func<Note, bool> predicate = n => n.UserId == _testUserId && !n.IsDeleted;
        return _mockNotes.FirstOrDefault(predicate);
    }

    #endregion

    #region Projection Benchmarks

    [Benchmark(Description = "Full entity fetch")]
    public List<Note> FullEntityFetch()
    {
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .Take(10)
            .ToList();
    }

    [Benchmark(Description = "Projection to DTO")]
    public List<NoteListItemDto> ProjectionFetch()
    {
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .Take(10)
            .Select(n => new NoteListItemDto
            {
                Id = n.Id,
                Title = n.Title,
                UpdatedAt = n.UpdatedAt,
                IsArchived = n.IsArchived
            })
            .ToList();
    }

    #endregion

    #region Collection Size Impact Benchmarks

    [Benchmark(Description = "Query small collection (100 items)")]
    public List<Note> QuerySmallCollection()
    {
        return _mockNotes.Take(100)
            .Where(n => n.UserId == _testUserId)
            .ToList();
    }

    [Benchmark(Description = "Query medium collection (500 items)")]
    public List<Note> QueryMediumCollection()
    {
        return _mockNotes.Take(500)
            .Where(n => n.UserId == _testUserId)
            .ToList();
    }

    [Benchmark(Description = "Query large collection (1000 items)")]
    public List<Note> QueryLargeCollection()
    {
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .ToList();
    }

    #endregion

    #region Ordering Benchmarks

    [Benchmark(Description = "OrderBy single property")]
    public List<Note> OrderBySingleProperty()
    {
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .OrderByDescending(n => n.UpdatedAt)
            .ToList();
    }

    [Benchmark(Description = "OrderBy multiple properties")]
    public List<Note> OrderByMultipleProperties()
    {
        return _mockNotes
            .Where(n => n.UserId == _testUserId)
            .OrderByDescending(n => n.UpdatedAt)
            .ThenBy(n => n.Title)
            .ToList();
    }

    #endregion

    #region Helper Types

    public sealed class NoteListItemDto
    {
        public required string Id { get; init; }
        public required string Title { get; init; }
        public DateTime UpdatedAt { get; init; }
        public bool IsArchived { get; init; }
    }

    #endregion
}
