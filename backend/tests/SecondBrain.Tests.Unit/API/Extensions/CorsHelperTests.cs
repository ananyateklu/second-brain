namespace SecondBrain.Tests.Unit.API.Extensions;

using SecondBrain.API.Extensions;

public class CorsHelperTests
{
    #region Null and Empty Origin Tests

    [Fact]
    public void IsLocalNetworkOrigin_WhenOriginIsNull_ReturnsFalse()
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(null!);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsLocalNetworkOrigin_WhenOriginIsEmpty_ReturnsFalse()
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin("");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsLocalNetworkOrigin_WhenOriginIsWhitespace_ReturnsFalse()
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin("   ");

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Localhost Tests

    [Theory]
    [InlineData("http://localhost:3000")]
    [InlineData("http://localhost:5000")]
    [InlineData("http://localhost:8080")]
    [InlineData("http://localhost:5173")]
    public void IsLocalNetworkOrigin_WhenLocalhost_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("http://LOCALHOST:3000")]
    [InlineData("http://LocalHost:5000")]
    [InlineData("http://LOCALHOST:8080")]
    public void IsLocalNetworkOrigin_WhenLocalhostWithDifferentCasing_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region 127.0.0.1 Tests

    [Theory]
    [InlineData("http://127.0.0.1:3000")]
    [InlineData("http://127.0.0.1:5000")]
    [InlineData("http://127.0.0.1:8080")]
    public void IsLocalNetworkOrigin_When127001_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region 192.168.x.x Tests

    [Theory]
    [InlineData("http://192.168.1.1:3000")]
    [InlineData("http://192.168.0.100:5000")]
    [InlineData("http://192.168.255.255:8080")]
    [InlineData("http://192.168.1.1")]
    public void IsLocalNetworkOrigin_When192168Range_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region 10.x.x.x Tests

    [Theory]
    [InlineData("http://10.0.0.1:3000")]
    [InlineData("http://10.1.1.1:5000")]
    [InlineData("http://10.255.255.255:8080")]
    [InlineData("http://10.0.0.1")]
    public void IsLocalNetworkOrigin_When10Range_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region 172.16-31.x.x Tests

    [Theory]
    [InlineData("http://172.16.0.1:3000")]
    [InlineData("http://172.20.1.1:5000")]
    [InlineData("http://172.31.255.255:8080")]
    [InlineData("http://172.24.100.50")]
    public void IsLocalNetworkOrigin_When172ValidRange_ReturnsTrue(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("http://172.15.0.1:3000")]  // Below 16
    [InlineData("http://172.32.0.1:5000")]  // Above 31
    [InlineData("http://172.0.0.1:8080")]   // Below 16
    [InlineData("http://172.100.1.1")]      // Above 31
    public void IsLocalNetworkOrigin_When172OutOfRange_ReturnsFalse(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Public IP Tests

    [Theory]
    [InlineData("http://8.8.8.8:3000")]
    [InlineData("http://1.1.1.1:5000")]
    [InlineData("http://203.0.113.1:8080")]
    [InlineData("https://example.com")]
    [InlineData("https://api.example.com:443")]
    public void IsLocalNetworkOrigin_WhenPublicIpOrDomain_ReturnsFalse(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region HTTPS Tests

    [Theory]
    [InlineData("https://localhost:3000")]
    [InlineData("https://127.0.0.1:5000")]
    [InlineData("https://192.168.1.1:8080")]
    public void IsLocalNetworkOrigin_WhenHttps_ReturnsFalse(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        // The method only checks for http:// prefix, not https://
        result.Should().BeFalse();
    }

    #endregion

    #region Edge Cases

    [Theory]
    [InlineData("ftp://localhost:21")]
    [InlineData("ws://localhost:8080")]
    [InlineData("localhost:3000")]
    public void IsLocalNetworkOrigin_WhenNotHttpProtocol_ReturnsFalse(string origin)
    {
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin(origin);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsLocalNetworkOrigin_When172WithInvalidSecondOctet_ReturnsFalse()
    {
        // This tests the case where parsing the second octet fails
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin("http://172.abc.0.1:3000");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsLocalNetworkOrigin_When172WithOnlyOneOctet_ReturnsFalse()
    {
        // Edge case: only one part after split
        // Act
        var result = CorsHelper.IsLocalNetworkOrigin("http://172");

        // Assert
        result.Should().BeFalse();
    }

    #endregion
}

