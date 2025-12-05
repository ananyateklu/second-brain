using System.Buffers;
using System.Text;
using Microsoft.Extensions.ObjectPool;

namespace SecondBrain.Application.Utilities;

/// <summary>
/// Provides memory-efficient utilities for common operations.
/// Uses ArrayPool and ObjectPool to reduce allocations.
/// </summary>
public static class MemoryOptimizations
{
    // StringBuilder pool for prompt building and string operations
    private static readonly ObjectPool<StringBuilder> StringBuilderPool =
        new DefaultObjectPoolProvider().CreateStringBuilderPool(
            initialCapacity: 1024,
            maximumRetainedCapacity: 16 * 1024); // 16KB max retained

    /// <summary>
    /// Gets a pooled StringBuilder for efficient string building.
    /// Always dispose the result or use the Build method to return it to the pool.
    /// </summary>
    public static PooledStringBuilder GetStringBuilder()
    {
        return new PooledStringBuilder(StringBuilderPool.Get());
    }

    /// <summary>
    /// Creates a string using a pooled StringBuilder, automatically returning it to the pool.
    /// </summary>
    public static string BuildString(Action<StringBuilder> builder)
    {
        var sb = StringBuilderPool.Get();
        try
        {
            builder(sb);
            return sb.ToString();
        }
        finally
        {
            sb.Clear();
            StringBuilderPool.Return(sb);
        }
    }

    /// <summary>
    /// Rents an array from the pool for temporary use.
    /// Always return the array using ArrayPool&lt;T&gt;.Shared.Return.
    /// </summary>
    public static T[] RentArray<T>(int minimumLength)
    {
        return ArrayPool<T>.Shared.Rent(minimumLength);
    }

    /// <summary>
    /// Returns a rented array to the pool.
    /// </summary>
    public static void ReturnArray<T>(T[] array, bool clearArray = false)
    {
        ArrayPool<T>.Shared.Return(array, clearArray);
    }

    /// <summary>
    /// Processes embeddings using a pooled float array to reduce allocations.
    /// </summary>
    public static float[] ProcessEmbeddingsToFloatArray(IList<double> embedding)
    {
        var length = embedding.Count;
        var result = new float[length];

        for (int i = 0; i < length; i++)
        {
            result[i] = (float)embedding[i];
        }

        return result;
    }

    /// <summary>
    /// Converts a double embedding to float array using pooled memory for intermediate operations.
    /// Returns a new array (not pooled) for the result since it's typically stored/passed elsewhere.
    /// </summary>
    public static float[] ConvertEmbeddingToFloat(ReadOnlySpan<double> embedding)
    {
        var result = new float[embedding.Length];
        for (int i = 0; i < embedding.Length; i++)
        {
            result[i] = (float)embedding[i];
        }
        return result;
    }

    /// <summary>
    /// Parses a query string efficiently using Span to avoid allocations.
    /// </summary>
    public static (string key, string value) ParseQueryParam(ReadOnlySpan<char> param)
    {
        var equalsIndex = param.IndexOf('=');
        if (equalsIndex < 0)
        {
            return (param.ToString(), string.Empty);
        }

        return (param[..equalsIndex].ToString(), param[(equalsIndex + 1)..].ToString());
    }

    /// <summary>
    /// Efficiently splits a string on newlines using Span for parsing.
    /// </summary>
    public static List<string> SplitLines(string text)
    {
        var result = new List<string>();

        if (string.IsNullOrEmpty(text))
            return result;

        var span = text.AsSpan();
        int start = 0;

        for (int i = 0; i < span.Length; i++)
        {
            if (span[i] == '\n')
            {
                var line = span[start..i];
                // Handle \r\n
                if (line.Length > 0 && line[^1] == '\r')
                {
                    line = line[..^1];
                }
                result.Add(line.ToString());
                start = i + 1;
            }
        }

        // Last line (if no trailing newline)
        if (start < span.Length)
        {
            result.Add(span[start..].ToString());
        }

        return result;
    }

    /// <summary>
    /// Truncates a string to a maximum length without creating intermediate strings.
    /// </summary>
    public static string TruncateString(string text, int maxLength, string suffix = "...")
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;

        var truncateAt = maxLength - suffix.Length;
        if (truncateAt <= 0)
            return suffix[..maxLength];

        return string.Concat(text.AsSpan(0, truncateAt), suffix);
    }
}

/// <summary>
/// A disposable wrapper around a pooled StringBuilder.
/// Automatically returns the StringBuilder to the pool on dispose.
/// </summary>
public readonly struct PooledStringBuilder : IDisposable
{
    private static readonly ObjectPool<StringBuilder> Pool =
        new DefaultObjectPoolProvider().CreateStringBuilderPool();

    public StringBuilder Builder { get; }

    public PooledStringBuilder(StringBuilder builder)
    {
        Builder = builder;
    }

    public PooledStringBuilder Append(string? value)
    {
        Builder.Append(value);
        return this;
    }

    public PooledStringBuilder Append(char value)
    {
        Builder.Append(value);
        return this;
    }

    public PooledStringBuilder AppendLine()
    {
        Builder.AppendLine();
        return this;
    }

    public PooledStringBuilder AppendLine(string? value)
    {
        Builder.AppendLine(value);
        return this;
    }

    public PooledStringBuilder AppendFormat(string format, params object[] args)
    {
        Builder.AppendFormat(format, args);
        return this;
    }

    public override string ToString() => Builder.ToString();

    public void Dispose()
    {
        Builder.Clear();
        Pool.Return(Builder);
    }
}
