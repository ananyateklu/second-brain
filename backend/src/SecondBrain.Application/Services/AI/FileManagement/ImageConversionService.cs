namespace SecondBrain.Application.Services.AI.FileManagement;

/// <summary>
/// Implementation of image conversion operations for AI providers.
/// </summary>
public class ImageConversionService : IImageConversionService
{
    // Magic bytes for common image formats
    private static readonly byte[] JpegMagic = [0xFF, 0xD8, 0xFF];
    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47];
    private static readonly byte[] GifMagic = [0x47, 0x49, 0x46];
    private static readonly byte[] WebpMagic = [0x52, 0x49, 0x46, 0x46]; // RIFF header
    private static readonly byte[] BmpMagic = [0x42, 0x4D];
    private static readonly byte[] PdfMagic = [0x25, 0x50, 0x44, 0x46]; // %PDF

    /// <inheritdoc />
    public byte[] Base64ToBytes(string base64Data)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(base64Data);

        // Remove any whitespace that might have been introduced
        var cleanBase64 = base64Data.Replace("\n", "").Replace("\r", "").Replace(" ", "");

        return Convert.FromBase64String(cleanBase64);
    }

    /// <inheritdoc />
    public string BytesToBase64(byte[] bytes)
    {
        ArgumentNullException.ThrowIfNull(bytes);

        return Convert.ToBase64String(bytes);
    }

    /// <inheritdoc />
    public string ExtractBase64FromDataUri(string dataUri)
    {
        if (string.IsNullOrWhiteSpace(dataUri))
            return dataUri;

        // Check if it's a data URI (e.g., "data:image/png;base64,...")
        const string dataUriPrefix = "data:";
        const string base64Marker = ";base64,";

        if (!dataUri.StartsWith(dataUriPrefix, StringComparison.OrdinalIgnoreCase))
            return dataUri;

        var base64Index = dataUri.IndexOf(base64Marker, StringComparison.OrdinalIgnoreCase);
        if (base64Index < 0)
            return dataUri;

        return dataUri[(base64Index + base64Marker.Length)..];
    }

    /// <inheritdoc />
    public string CreateDataUri(string base64Data, string mediaType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(base64Data);
        ArgumentException.ThrowIfNullOrWhiteSpace(mediaType);

        return $"data:{mediaType};base64,{base64Data}";
    }

    /// <inheritdoc />
    public string DetectMediaType(byte[] bytes)
    {
        if (bytes == null || bytes.Length < 4)
            return "application/octet-stream";

        // Check for JPEG
        if (bytes.Length >= 3 && bytes[0] == JpegMagic[0] && bytes[1] == JpegMagic[1] && bytes[2] == JpegMagic[2])
            return "image/jpeg";

        // Check for PNG
        if (bytes.Length >= 4 && bytes[0] == PngMagic[0] && bytes[1] == PngMagic[1] &&
            bytes[2] == PngMagic[2] && bytes[3] == PngMagic[3])
            return "image/png";

        // Check for GIF
        if (bytes.Length >= 3 && bytes[0] == GifMagic[0] && bytes[1] == GifMagic[1] && bytes[2] == GifMagic[2])
            return "image/gif";

        // Check for WebP (RIFF header followed by WEBP)
        if (bytes.Length >= 12 && bytes[0] == WebpMagic[0] && bytes[1] == WebpMagic[1] &&
            bytes[2] == WebpMagic[2] && bytes[3] == WebpMagic[3] &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
            return "image/webp";

        // Check for BMP
        if (bytes.Length >= 2 && bytes[0] == BmpMagic[0] && bytes[1] == BmpMagic[1])
            return "image/bmp";

        // Check for PDF
        if (bytes.Length >= 4 && bytes[0] == PdfMagic[0] && bytes[1] == PdfMagic[1] &&
            bytes[2] == PdfMagic[2] && bytes[3] == PdfMagic[3])
            return "application/pdf";

        return "application/octet-stream";
    }

    /// <inheritdoc />
    public string DetectMediaTypeFromBase64(string base64Data)
    {
        if (string.IsNullOrWhiteSpace(base64Data))
            return "application/octet-stream";

        try
        {
            // Only decode enough bytes to check magic numbers
            var bytes = Base64ToBytes(base64Data[..Math.Min(base64Data.Length, 24)]);
            return DetectMediaType(bytes);
        }
        catch
        {
            return "application/octet-stream";
        }
    }
}
