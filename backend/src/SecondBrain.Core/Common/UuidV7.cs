namespace SecondBrain.Core.Common;

/// <summary>
/// Utility class for generating UUIDv7 identifiers.
/// UUIDv7 (RFC 9562) embeds a Unix timestamp in the first 48 bits, providing:
/// - Sequential inserts that append to end of B-tree indexes (4x faster insert performance)
/// - Better index scan locality
/// - Natural time-ordering without extra timestamp column
/// - Sortable by creation time
/// </summary>
public static class UuidV7
{
    /// <summary>
    /// Generates a new UUIDv7 as a string.
    /// Use this for string-based ID properties.
    /// </summary>
    /// <returns>A new UUIDv7 formatted as a string</returns>
    public static string NewId() => Guid.CreateVersion7().ToString();

    /// <summary>
    /// Generates a new UUIDv7 as a Guid.
    /// Use this when working with Guid-typed properties.
    /// </summary>
    /// <returns>A new UUIDv7 Guid</returns>
    public static Guid NewGuid() => Guid.CreateVersion7();

    /// <summary>
    /// Extracts the timestamp from a UUIDv7.
    /// </summary>
    /// <param name="uuidV7">The UUIDv7 to extract timestamp from</param>
    /// <returns>The timestamp embedded in the UUIDv7, or null if invalid</returns>
    public static DateTimeOffset? GetTimestamp(Guid uuidV7)
    {
        // UUIDv7 structure: first 48 bits are Unix timestamp in milliseconds
        var bytes = uuidV7.ToByteArray();

        // Check version (should be 7)
        var version = (bytes[7] >> 4) & 0x0F;
        if (version != 7)
            return null;

        // Extract timestamp (first 6 bytes in big-endian order)
        // Note: Guid.ToByteArray() returns bytes in mixed-endian format
        // Bytes 0-3 are little-endian, 4-5 and 6-7 are big-endian
        long timestamp = 0;
        timestamp |= (long)bytes[3] << 40;
        timestamp |= (long)bytes[2] << 32;
        timestamp |= (long)bytes[1] << 24;
        timestamp |= (long)bytes[0] << 16;
        timestamp |= (long)bytes[5] << 8;
        timestamp |= (long)bytes[4];

        return DateTimeOffset.FromUnixTimeMilliseconds(timestamp);
    }

    /// <summary>
    /// Extracts the timestamp from a UUIDv7 string.
    /// </summary>
    /// <param name="uuidV7String">The UUIDv7 string to extract timestamp from</param>
    /// <returns>The timestamp embedded in the UUIDv7, or null if invalid</returns>
    public static DateTimeOffset? GetTimestamp(string uuidV7String)
    {
        if (Guid.TryParse(uuidV7String, out var guid))
            return GetTimestamp(guid);
        return null;
    }

    /// <summary>
    /// Checks if a Guid is a valid UUIDv7 (version 7).
    /// </summary>
    /// <param name="guid">The Guid to check</param>
    /// <returns>True if the Guid is a UUIDv7</returns>
    public static bool IsUuidV7(Guid guid)
    {
        var bytes = guid.ToByteArray();
        var version = (bytes[7] >> 4) & 0x0F;
        return version == 7;
    }
}
