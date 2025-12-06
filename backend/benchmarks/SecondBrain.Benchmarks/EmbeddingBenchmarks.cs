using System.Security.Cryptography;
using System.Text;
using BenchmarkDotNet.Attributes;
using Microsoft.Extensions.Caching.Memory;

namespace SecondBrain.Benchmarks;

/// <summary>
/// Benchmarks for embedding generation and caching operations.
/// Measures cache hit/miss performance and hash computation overhead.
/// 
/// Run with: dotnet run -c Release -- --filter *EmbeddingBenchmarks*
/// </summary>
[MemoryDiagnoser]
[SimpleJob(warmupCount: 3, iterationCount: 10)]
public class EmbeddingBenchmarks
{
    private IMemoryCache _memoryCache = null!;
    private string[] _testTexts = null!;
    private float[][] _cachedEmbeddings = null!;

    private const int EmbeddingDimensions = 1536; // OpenAI text-embedding-3-small

    [GlobalSetup]
    public void Setup()
    {
        _memoryCache = new MemoryCache(new MemoryCacheOptions
        {
            SizeLimit = 1000
        });

        // Generate test texts of varying lengths
        _testTexts = Enumerable.Range(0, 100)
            .Select(i => GenerateTestText(i))
            .ToArray();

        // Pre-generate embeddings for cache tests
        _cachedEmbeddings = _testTexts
            .Select(_ => GenerateMockEmbedding())
            .ToArray();

        // Pre-populate cache for cache hit tests
        for (int i = 0; i < _testTexts.Length; i++)
        {
            var cacheKey = ComputeCacheKey(_testTexts[i]);
            _memoryCache.Set(cacheKey, _cachedEmbeddings[i], new MemoryCacheEntryOptions
            {
                Size = 1,
                SlidingExpiration = TimeSpan.FromMinutes(30)
            });
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _memoryCache.Dispose();
    }

    #region Cache Key Generation Benchmarks

    [Benchmark(Description = "SHA256 cache key generation")]
    public string ComputeCacheKey_SHA256()
    {
        return ComputeCacheKey(_testTexts[0]);
    }

    [Benchmark(Description = "SHA256 cache key - long text")]
    public string ComputeCacheKey_SHA256_LongText()
    {
        return ComputeCacheKey(_testTexts[50]); // Longer text
    }

    [Benchmark(Description = "MD5 cache key generation (faster, less secure)")]
    public string ComputeCacheKey_MD5()
    {
        return ComputeCacheKeyMD5(_testTexts[0]);
    }

    #endregion

    #region Cache Lookup Benchmarks

    [Benchmark(Baseline = true, Description = "Cache hit - single lookup")]
    public float[]? CacheHit_SingleLookup()
    {
        var cacheKey = ComputeCacheKey(_testTexts[0]);
        _memoryCache.TryGetValue(cacheKey, out float[]? embedding);
        return embedding;
    }

    [Benchmark(Description = "Cache miss - single lookup")]
    public float[]? CacheMiss_SingleLookup()
    {
        var cacheKey = ComputeCacheKey("this text is not in cache " + Guid.NewGuid());
        _memoryCache.TryGetValue(cacheKey, out float[]? embedding);
        return embedding;
    }

    [Benchmark(Description = "Cache hit - 10 sequential lookups")]
    public int CacheHit_TenLookups()
    {
        var hitCount = 0;
        for (int i = 0; i < 10; i++)
        {
            var cacheKey = ComputeCacheKey(_testTexts[i % _testTexts.Length]);
            if (_memoryCache.TryGetValue(cacheKey, out float[]? _))
            {
                hitCount++;
            }
        }
        return hitCount;
    }

    #endregion

    #region Embedding Generation Benchmarks (Mock)

    [Benchmark(Description = "Mock embedding generation")]
    public float[] GenerateEmbedding_Mock()
    {
        return GenerateMockEmbedding();
    }

    [Benchmark(Description = "Embedding copy to new array")]
    public float[] EmbeddingCopy()
    {
        return _cachedEmbeddings[0].ToArray();
    }

    [Benchmark(Description = "Embedding span copy")]
    public float[] EmbeddingSpanCopy()
    {
        var result = new float[EmbeddingDimensions];
        _cachedEmbeddings[0].AsSpan().CopyTo(result);
        return result;
    }

    #endregion

    #region Batch Operations Benchmarks

    [Benchmark(Description = "Batch cache lookup - 10 items")]
    [Arguments(10)]
    [Arguments(50)]
    [Arguments(100)]
    public int BatchCacheLookup(int batchSize)
    {
        var hitCount = 0;
        for (int i = 0; i < batchSize; i++)
        {
            var cacheKey = ComputeCacheKey(_testTexts[i % _testTexts.Length]);
            if (_memoryCache.TryGetValue(cacheKey, out float[]? _))
            {
                hitCount++;
            }
        }
        return hitCount;
    }

    [Benchmark(Description = "Parallel batch cache lookup - 100 items")]
    public int ParallelBatchCacheLookup()
    {
        var hitCount = 0;
        Parallel.For(0, 100, i =>
        {
            var cacheKey = ComputeCacheKey(_testTexts[i % _testTexts.Length]);
            if (_memoryCache.TryGetValue(cacheKey, out float[]? _))
            {
                Interlocked.Increment(ref hitCount);
            }
        });
        return hitCount;
    }

    #endregion

    #region Cache Set Operations Benchmarks

    [Benchmark(Description = "Cache set with size limit")]
    public void CacheSet_WithSize()
    {
        var newEmbedding = GenerateMockEmbedding();
        var cacheKey = "benchmark_set_" + Guid.NewGuid().ToString("N");

        _memoryCache.Set(cacheKey, newEmbedding, new MemoryCacheEntryOptions
        {
            Size = 1,
            SlidingExpiration = TimeSpan.FromMinutes(30),
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
        });
    }

    [Benchmark(Description = "GetOrCreate pattern")]
    public float[] GetOrCreate_Pattern()
    {
        var cacheKey = ComputeCacheKey(_testTexts[0]);

        return _memoryCache.GetOrCreate(cacheKey, entry =>
        {
            entry.Size = 1;
            entry.SlidingExpiration = TimeSpan.FromMinutes(30);
            return GenerateMockEmbedding();
        })!;
    }

    #endregion

    #region Helper Methods

    private static string ComputeCacheKey(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return $"embedding:{Convert.ToHexString(bytes)[..32]}";
    }

    private static string ComputeCacheKeyMD5(string input)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
        return $"embedding:{Convert.ToHexString(bytes)}";
    }

    private static float[] GenerateMockEmbedding()
    {
        var embedding = new float[EmbeddingDimensions];
        var random = Random.Shared;

        for (int i = 0; i < EmbeddingDimensions; i++)
        {
            embedding[i] = (float)(random.NextDouble() * 2 - 1); // -1 to 1
        }

        // Normalize the embedding
        var magnitude = MathF.Sqrt(embedding.Sum(x => x * x));
        for (int i = 0; i < EmbeddingDimensions; i++)
        {
            embedding[i] /= magnitude;
        }

        return embedding;
    }

    private static string GenerateTestText(int index)
    {
        var baseText = $"Test document number {index} with content for embedding generation. ";
        var multiplier = (index % 10) + 1; // 1-10x base length
        return string.Concat(Enumerable.Repeat(baseText, multiplier));
    }

    #endregion
}
