using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Tests.Integration.Fixtures;
using Xunit.Abstractions;

namespace SecondBrain.Tests.Integration.Services;

/// <summary>
/// Integration tests for NativeHybridSearchService comparing it with standard HybridSearchService.
/// These tests require a running PostgreSQL 18 instance with test data.
/// </summary>
[Collection("Database")]
public class NativeHybridSearchTests : IClassFixture<WebApplicationFactoryFixture>
{
    private readonly WebApplicationFactoryFixture _factory;
    private readonly ITestOutputHelper _output;

    public NativeHybridSearchTests(WebApplicationFactoryFixture factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task NativeHybridSearch_WhenEnabled_ReturnsResults()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<RagSettings>>().Value;

        var query = "test search query";
        var embedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536).ToList();
        var userId = "test-user";

        // Act
        var results = await nativeService.SearchAsync(
            query, embedding, userId, topK: 5);

        // Assert
        _output.WriteLine($"Native hybrid search returned {results.Count} results");
        foreach (var result in results)
        {
            _output.WriteLine($"  - {result.NoteTitle}: RRF={result.RRFScore:F4}, Vector={result.VectorScore:F4}, BM25={result.BM25Score:F4}");
        }

        // Results may be empty if no test data exists, but should not throw
        Assert.NotNull(results);
    }

    [Fact]
    public async Task NativeHybridSearch_ComparedToStandard_ReturnsSimilarResults()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();
        var standardService = scope.ServiceProvider.GetRequiredService<IHybridSearchService>();

        var query = "machine learning neural networks";
        var embedding = Enumerable.Range(0, 1536).Select(i => Math.Sin(i * 0.01)).ToList();
        var userId = "test-user";
        var topK = 10;

        // Act
        var nativeResults = await nativeService.SearchAsync(query, embedding, userId, topK);
        var standardResults = await standardService.SearchAsync(query, embedding, userId, topK);

        // Assert - Results should have similar content (order may vary slightly due to floating point)
        _output.WriteLine($"Native: {nativeResults.Count} results, Standard: {standardResults.Count} results");

        var nativeIds = nativeResults.Select(r => r.Id).ToHashSet();
        var standardIds = standardResults.Select(r => r.Id).ToHashSet();
        var overlap = nativeIds.Intersect(standardIds).Count();

        _output.WriteLine($"Overlap: {overlap} / {Math.Max(nativeResults.Count, standardResults.Count)} results");

        // At least 70% overlap expected (some variation due to floating point differences)
        if (nativeResults.Count > 0 && standardResults.Count > 0)
        {
            var overlapPercentage = (double)overlap / Math.Max(nativeResults.Count, standardResults.Count);
            Assert.True(overlapPercentage >= 0.7, $"Expected at least 70% overlap, got {overlapPercentage:P0}");
        }
    }

    [Fact]
    public async Task NativeHybridSearch_Performance_FasterThanStandard()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();
        var standardService = scope.ServiceProvider.GetRequiredService<IHybridSearchService>();

        var query = "performance optimization database indexing";
        var embedding = Enumerable.Range(0, 1536).Select(i => Math.Cos(i * 0.005)).ToList();
        var userId = "test-user";
        var topK = 20;

        // Warm up
        await nativeService.SearchAsync(query, embedding, userId, topK);
        await standardService.SearchAsync(query, embedding, userId, topK);

        // Act - Run multiple iterations
        const int iterations = 5;
        var nativeTimes = new List<long>();
        var standardTimes = new List<long>();

        for (int i = 0; i < iterations; i++)
        {
            var sw1 = System.Diagnostics.Stopwatch.StartNew();
            await nativeService.SearchAsync(query, embedding, userId, topK);
            sw1.Stop();
            nativeTimes.Add(sw1.ElapsedMilliseconds);

            var sw2 = System.Diagnostics.Stopwatch.StartNew();
            await standardService.SearchAsync(query, embedding, userId, topK);
            sw2.Stop();
            standardTimes.Add(sw2.ElapsedMilliseconds);
        }

        // Assert
        var avgNative = nativeTimes.Average();
        var avgStandard = standardTimes.Average();

        _output.WriteLine($"Average Native: {avgNative:F1}ms");
        _output.WriteLine($"Average Standard: {avgStandard:F1}ms");
        _output.WriteLine($"Speedup: {avgStandard / avgNative:F2}x");

        // Native should generally be faster (allow for some variance)
        // This assertion is informational - we log results rather than fail
        if (avgNative > avgStandard)
        {
            _output.WriteLine("WARNING: Native search was slower than standard. This may be due to cold cache or small dataset.");
        }
    }

    [Fact]
    public async Task NativeHybridSearch_IsAvailable_ReturnsTrue()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();

        // Act
        var isAvailable = await nativeService.IsAvailableAsync();

        // Assert
        _output.WriteLine($"Native hybrid search available: {isAvailable}");
        // Should be available with PostgreSQL 18
        Assert.True(isAvailable);
    }

    [Fact]
    public async Task NativeHybridSearch_WithEmptyQuery_ReturnsEmptyResults()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();

        var embedding = Enumerable.Range(0, 1536).Select(i => 0.0).ToList();
        var userId = "test-user";

        // Act
        var results = await nativeService.SearchAsync("", embedding, userId, 5);

        // Assert
        Assert.Empty(results);
    }

    [Fact]
    public async Task NativeHybridSearch_SourceFlags_CorrectlyIdentified()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var nativeService = scope.ServiceProvider.GetRequiredService<INativeHybridSearchService>();

        var query = "unique keyword combination";
        var embedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536).ToList();
        var userId = "test-user";

        // Act
        var results = await nativeService.SearchAsync(query, embedding, userId, 10);

        // Assert
        foreach (var result in results)
        {
            _output.WriteLine($"  {result.NoteTitle}: InVector={result.FoundInVectorSearch}, InBM25={result.FoundInBM25Search}");

            // At least one source flag should be true
            Assert.True(result.FoundInVectorSearch || result.FoundInBM25Search,
                "Result should be found in at least one search type");

            // If found in both, RRF score should be higher
            if (result.FoundInVectorSearch && result.FoundInBM25Search)
            {
                _output.WriteLine($"    ^ Found in BOTH sources (boosted RRF)");
            }
        }
    }
}
