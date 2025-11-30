namespace SecondBrain.Tests.Unit.API.Configuration;

using SecondBrain.API.Configuration;

public class ApiSettingsTests
{
    #region Default Values Tests

    [Fact]
    public void DefaultVersion_ShouldBe2Point0Point0()
    {
        // Arrange & Act
        var settings = new ApiSettings();

        // Assert
        settings.Version.Should().Be("2.0.0");
    }

    [Fact]
    public void DefaultAppName_ShouldBeSecondBrainAPI()
    {
        // Arrange & Act
        var settings = new ApiSettings();

        // Assert
        settings.AppName.Should().Be("SecondBrain API");
    }

    [Fact]
    public void DefaultDatabaseProvider_ShouldBeFirestore()
    {
        // Arrange & Act
        var settings = new ApiSettings();

        // Assert
        settings.DatabaseProvider.Should().Be("Firestore");
    }

    #endregion

    #region Property Setters Tests

    [Fact]
    public void Version_CanBeSet()
    {
        // Arrange
        var settings = new ApiSettings();

        // Act
        settings.Version = "3.0.0";

        // Assert
        settings.Version.Should().Be("3.0.0");
    }

    [Fact]
    public void AppName_CanBeSet()
    {
        // Arrange
        var settings = new ApiSettings();

        // Act
        settings.AppName = "Custom API Name";

        // Assert
        settings.AppName.Should().Be("Custom API Name");
    }

    [Fact]
    public void DatabaseProvider_CanBeSet()
    {
        // Arrange
        var settings = new ApiSettings();

        // Act
        settings.DatabaseProvider = "PostgreSQL";

        // Assert
        settings.DatabaseProvider.Should().Be("PostgreSQL");
    }

    [Theory]
    [InlineData("1.0.0")]
    [InlineData("2.1.0-beta")]
    [InlineData("10.0.0-rc1")]
    public void Version_AcceptsVariousFormats(string version)
    {
        // Arrange
        var settings = new ApiSettings();

        // Act
        settings.Version = version;

        // Assert
        settings.Version.Should().Be(version);
    }

    [Theory]
    [InlineData("PostgreSQL")]
    [InlineData("MongoDB")]
    [InlineData("Firestore")]
    [InlineData("SQLite")]
    public void DatabaseProvider_AcceptsVariousProviders(string provider)
    {
        // Arrange
        var settings = new ApiSettings();

        // Act
        settings.DatabaseProvider = provider;

        // Assert
        settings.DatabaseProvider.Should().Be(provider);
    }

    #endregion
}

