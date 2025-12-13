namespace SecondBrain.Application.Services.AI.FileManagement;

/// <summary>
/// Service for image format conversions used by AI providers.
/// Centralizes Base64 encoding/decoding and byte array operations.
/// </summary>
public interface IImageConversionService
{
    /// <summary>
    /// Converts a Base64 string to byte array.
    /// </summary>
    /// <param name="base64Data">The Base64 encoded string (without data URI prefix)</param>
    /// <returns>The decoded byte array</returns>
    byte[] Base64ToBytes(string base64Data);

    /// <summary>
    /// Converts a byte array to Base64 string.
    /// </summary>
    /// <param name="bytes">The byte array to encode</param>
    /// <returns>The Base64 encoded string (without data URI prefix)</returns>
    string BytesToBase64(byte[] bytes);

    /// <summary>
    /// Extracts Base64 data from a data URI (e.g., "data:image/png;base64,...")
    /// </summary>
    /// <param name="dataUri">The data URI string</param>
    /// <returns>The Base64 data without the prefix, or the original string if not a data URI</returns>
    string ExtractBase64FromDataUri(string dataUri);

    /// <summary>
    /// Creates a data URI from Base64 data and media type.
    /// </summary>
    /// <param name="base64Data">The Base64 encoded data</param>
    /// <param name="mediaType">The media type (e.g., "image/png")</param>
    /// <returns>A data URI string</returns>
    string CreateDataUri(string base64Data, string mediaType);

    /// <summary>
    /// Detects the media type from byte array by examining magic bytes.
    /// </summary>
    /// <param name="bytes">The file bytes</param>
    /// <returns>The detected media type or "application/octet-stream" if unknown</returns>
    string DetectMediaType(byte[] bytes);

    /// <summary>
    /// Detects the media type from Base64 data.
    /// </summary>
    /// <param name="base64Data">The Base64 encoded data</param>
    /// <returns>The detected media type or "application/octet-stream" if unknown</returns>
    string DetectMediaTypeFromBase64(string base64Data);
}
