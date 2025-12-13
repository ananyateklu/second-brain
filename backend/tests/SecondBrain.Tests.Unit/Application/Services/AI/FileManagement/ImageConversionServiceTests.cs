using SecondBrain.Application.Services.AI.FileManagement;

namespace SecondBrain.Tests.Unit.Application.Services.AI.FileManagement;

public class ImageConversionServiceTests
{
    private readonly ImageConversionService _sut;

    public ImageConversionServiceTests()
    {
        _sut = new ImageConversionService();
    }

    #region Base64ToBytes Tests

    [Fact]
    public void Base64ToBytes_WithValidBase64_ReturnsCorrectBytes()
    {
        // Arrange
        var originalBytes = new byte[] { 0x48, 0x65, 0x6C, 0x6C, 0x6F }; // "Hello"
        var base64 = Convert.ToBase64String(originalBytes);

        // Act
        var result = _sut.Base64ToBytes(base64);

        // Assert
        result.Should().BeEquivalentTo(originalBytes);
    }

    [Fact]
    public void Base64ToBytes_WithWhitespace_HandlesCorrectly()
    {
        // Arrange
        var originalBytes = new byte[] { 0x48, 0x65, 0x6C, 0x6C, 0x6F };
        var base64 = Convert.ToBase64String(originalBytes);
        var base64WithWhitespace = base64.Insert(2, "\n ").Insert(5, "\r");

        // Act
        var result = _sut.Base64ToBytes(base64WithWhitespace);

        // Assert
        result.Should().BeEquivalentTo(originalBytes);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Base64ToBytes_WithNullOrEmpty_ThrowsArgumentException(string? input)
    {
        // Act & Assert
        var act = () => _sut.Base64ToBytes(input!);
        act.Should().Throw<ArgumentException>();
    }

    #endregion

    #region BytesToBase64 Tests

    [Fact]
    public void BytesToBase64_WithValidBytes_ReturnsCorrectBase64()
    {
        // Arrange
        var bytes = new byte[] { 0x48, 0x65, 0x6C, 0x6C, 0x6F };

        // Act
        var result = _sut.BytesToBase64(bytes);

        // Assert
        result.Should().Be(Convert.ToBase64String(bytes));
    }

    [Fact]
    public void BytesToBase64_WithEmptyArray_ReturnsEmptyString()
    {
        // Act
        var result = _sut.BytesToBase64([]);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void BytesToBase64_WithNull_ThrowsArgumentNullException()
    {
        // Act & Assert
        var act = () => _sut.BytesToBase64(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region ExtractBase64FromDataUri Tests

    [Fact]
    public void ExtractBase64FromDataUri_WithValidDataUri_ExtractsBase64()
    {
        // Arrange
        var base64Data = "SGVsbG8gV29ybGQ=";
        var dataUri = $"data:image/png;base64,{base64Data}";

        // Act
        var result = _sut.ExtractBase64FromDataUri(dataUri);

        // Assert
        result.Should().Be(base64Data);
    }

    [Fact]
    public void ExtractBase64FromDataUri_WithoutDataPrefix_ReturnsOriginal()
    {
        // Arrange
        var base64Data = "SGVsbG8gV29ybGQ=";

        // Act
        var result = _sut.ExtractBase64FromDataUri(base64Data);

        // Assert
        result.Should().Be(base64Data);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ExtractBase64FromDataUri_WithNullOrEmpty_ReturnsInput(string? input)
    {
        // Act
        var result = _sut.ExtractBase64FromDataUri(input!);

        // Assert
        result.Should().Be(input);
    }

    [Fact]
    public void ExtractBase64FromDataUri_CaseInsensitive()
    {
        // Arrange
        var base64Data = "SGVsbG8gV29ybGQ=";
        var dataUri = $"DATA:image/png;BASE64,{base64Data}";

        // Act
        var result = _sut.ExtractBase64FromDataUri(dataUri);

        // Assert
        result.Should().Be(base64Data);
    }

    #endregion

    #region CreateDataUri Tests

    [Fact]
    public void CreateDataUri_WithValidInputs_CreatesCorrectUri()
    {
        // Arrange
        var base64Data = "SGVsbG8gV29ybGQ=";
        var mediaType = "image/png";

        // Act
        var result = _sut.CreateDataUri(base64Data, mediaType);

        // Assert
        result.Should().Be($"data:{mediaType};base64,{base64Data}");
    }

    [Theory]
    [InlineData(null, "image/png")]
    [InlineData("", "image/png")]
    [InlineData("SGVsbG8=", null)]
    [InlineData("SGVsbG8=", "")]
    public void CreateDataUri_WithNullOrEmptyInputs_ThrowsArgumentException(string? base64, string? mediaType)
    {
        // Act & Assert
        var act = () => _sut.CreateDataUri(base64!, mediaType!);
        act.Should().Throw<ArgumentException>();
    }

    #endregion

    #region DetectMediaType Tests

    [Fact]
    public void DetectMediaType_WithJpegMagicBytes_ReturnsJpegType()
    {
        // Arrange - JPEG magic bytes
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };

        // Act
        var result = _sut.DetectMediaType(jpegBytes);

        // Assert
        result.Should().Be("image/jpeg");
    }

    [Fact]
    public void DetectMediaType_WithPngMagicBytes_ReturnsPngType()
    {
        // Arrange - PNG magic bytes
        var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A };

        // Act
        var result = _sut.DetectMediaType(pngBytes);

        // Assert
        result.Should().Be("image/png");
    }

    [Fact]
    public void DetectMediaType_WithGifMagicBytes_ReturnsGifType()
    {
        // Arrange - GIF magic bytes (GIF87a or GIF89a)
        var gifBytes = new byte[] { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 };

        // Act
        var result = _sut.DetectMediaType(gifBytes);

        // Assert
        result.Should().Be("image/gif");
    }

    [Fact]
    public void DetectMediaType_WithWebpMagicBytes_ReturnsWebpType()
    {
        // Arrange - WebP magic bytes (RIFF....WEBP)
        var webpBytes = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50 };

        // Act
        var result = _sut.DetectMediaType(webpBytes);

        // Assert
        result.Should().Be("image/webp");
    }

    [Fact]
    public void DetectMediaType_WithBmpMagicBytes_ReturnsBmpType()
    {
        // Arrange - BMP magic bytes (BM)
        var bmpBytes = new byte[] { 0x42, 0x4D, 0x00, 0x00 };

        // Act
        var result = _sut.DetectMediaType(bmpBytes);

        // Assert
        result.Should().Be("image/bmp");
    }

    [Fact]
    public void DetectMediaType_WithPdfMagicBytes_ReturnsPdfType()
    {
        // Arrange - PDF magic bytes (%PDF)
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D };

        // Act
        var result = _sut.DetectMediaType(pdfBytes);

        // Assert
        result.Should().Be("application/pdf");
    }

    [Fact]
    public void DetectMediaType_WithUnknownBytes_ReturnsOctetStream()
    {
        // Arrange
        var unknownBytes = new byte[] { 0x00, 0x01, 0x02, 0x03 };

        // Act
        var result = _sut.DetectMediaType(unknownBytes);

        // Assert
        result.Should().Be("application/octet-stream");
    }

    [Fact]
    public void DetectMediaType_WithNull_ReturnsOctetStream()
    {
        // Act
        var result = _sut.DetectMediaType(null!);

        // Assert
        result.Should().Be("application/octet-stream");
    }

    [Fact]
    public void DetectMediaType_WithTooFewBytes_ReturnsOctetStream()
    {
        // Arrange
        var shortBytes = new byte[] { 0x89, 0x50 };

        // Act
        var result = _sut.DetectMediaType(shortBytes);

        // Assert
        result.Should().Be("application/octet-stream");
    }

    #endregion

    #region DetectMediaTypeFromBase64 Tests

    [Fact]
    public void DetectMediaTypeFromBase64_WithPngBase64_ReturnsPngType()
    {
        // Arrange - PNG magic bytes as base64
        var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var base64 = Convert.ToBase64String(pngBytes);

        // Act
        var result = _sut.DetectMediaTypeFromBase64(base64);

        // Assert
        result.Should().Be("image/png");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void DetectMediaTypeFromBase64_WithNullOrEmpty_ReturnsOctetStream(string? input)
    {
        // Act
        var result = _sut.DetectMediaTypeFromBase64(input!);

        // Assert
        result.Should().Be("application/octet-stream");
    }

    [Fact]
    public void DetectMediaTypeFromBase64_WithInvalidBase64_ReturnsOctetStream()
    {
        // Arrange
        var invalidBase64 = "not-valid-base64!!!";

        // Act
        var result = _sut.DetectMediaTypeFromBase64(invalidBase64);

        // Assert
        result.Should().Be("application/octet-stream");
    }

    #endregion

    #region Roundtrip Tests

    [Fact]
    public void Base64Roundtrip_PreservesOriginalData()
    {
        // Arrange
        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

        // Act
        var base64 = _sut.BytesToBase64(originalBytes);
        var roundtripBytes = _sut.Base64ToBytes(base64);

        // Assert
        roundtripBytes.Should().BeEquivalentTo(originalBytes);
    }

    [Fact]
    public void DataUriRoundtrip_PreservesOriginalData()
    {
        // Arrange
        var base64Data = "SGVsbG8gV29ybGQ=";
        var mediaType = "image/png";

        // Act
        var dataUri = _sut.CreateDataUri(base64Data, mediaType);
        var extractedBase64 = _sut.ExtractBase64FromDataUri(dataUri);

        // Assert
        extractedBase64.Should().Be(base64Data);
    }

    #endregion
}
