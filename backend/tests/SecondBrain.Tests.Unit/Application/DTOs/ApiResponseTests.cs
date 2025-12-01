using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Tests.Unit.Application.DTOs;

public class ApiResponseTests
{
    #region Ok Factory Method Tests

    [Fact]
    public void Ok_WithData_ReturnsSuccessfulResponse()
    {
        // Arrange
        var data = "test data";

        // Act
        var response = ApiResponse<string>.Ok(data);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().Be(data);
        response.Error.Should().BeNull();
        response.Metadata.Should().BeNull();
    }

    [Fact]
    public void Ok_WithNullData_ReturnsSuccessfulResponseWithNullData()
    {
        // Act
        var response = ApiResponse<string>.Ok(null!);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().BeNull();
        response.Error.Should().BeNull();
    }

    [Fact]
    public void Ok_WithDataAndMetadata_ReturnsSuccessfulResponseWithMetadata()
    {
        // Arrange
        var data = 42;
        var metadata = new Dictionary<string, object>
        {
            { "page", 1 },
            { "total", 100 }
        };

        // Act
        var response = ApiResponse<int>.Ok(data, metadata);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().Be(data);
        response.Metadata.Should().NotBeNull();
        response.Metadata.Should().ContainKey("page");
        response.Metadata!["page"].Should().Be(1);
        response.Metadata.Should().ContainKey("total");
        response.Metadata["total"].Should().Be(100);
    }

    [Fact]
    public void Ok_WithComplexType_ReturnsSuccessfulResponse()
    {
        // Arrange
        var data = new TestData { Id = 1, Name = "Test" };

        // Act
        var response = ApiResponse<TestData>.Ok(data);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(1);
        response.Data.Name.Should().Be("Test");
    }

    [Fact]
    public void Ok_WithList_ReturnsSuccessfulResponse()
    {
        // Arrange
        var data = new List<string> { "item1", "item2", "item3" };

        // Act
        var response = ApiResponse<List<string>>.Ok(data);

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().HaveCount(3);
        response.Data.Should().Contain("item1");
    }

    [Fact]
    public void Ok_WithEmptyMetadata_ReturnsResponseWithEmptyMetadata()
    {
        // Arrange
        var data = "test";
        var metadata = new Dictionary<string, object>();

        // Act
        var response = ApiResponse<string>.Ok(data, metadata);

        // Assert
        response.Success.Should().BeTrue();
        response.Metadata.Should().NotBeNull();
        response.Metadata.Should().BeEmpty();
    }

    #endregion

    #region Fail Factory Method Tests

    [Fact]
    public void Fail_WithErrorMessage_ReturnsFailedResponse()
    {
        // Arrange
        var error = "Something went wrong";

        // Act
        var response = ApiResponse<string>.Fail(error);

        // Assert
        response.Success.Should().BeFalse();
        response.Error.Should().Be(error);
        response.Data.Should().BeNull();
        response.Metadata.Should().BeNull();
    }

    [Fact]
    public void Fail_WithEmptyError_ReturnsFailedResponseWithEmptyError()
    {
        // Act
        var response = ApiResponse<string>.Fail(string.Empty);

        // Assert
        response.Success.Should().BeFalse();
        response.Error.Should().BeEmpty();
    }

    [Fact]
    public void Fail_WithNullError_ReturnsFailedResponseWithNullError()
    {
        // Act
        var response = ApiResponse<string>.Fail(null!);

        // Assert
        response.Success.Should().BeFalse();
        response.Error.Should().BeNull();
    }

    [Fact]
    public void Fail_WithErrorAndMetadata_ReturnsFailedResponseWithMetadata()
    {
        // Arrange
        var error = "Validation failed";
        var metadata = new Dictionary<string, object>
        {
            { "field", "email" },
            { "code", "INVALID_FORMAT" }
        };

        // Act
        var response = ApiResponse<object>.Fail(error, metadata);

        // Assert
        response.Success.Should().BeFalse();
        response.Error.Should().Be(error);
        response.Metadata.Should().NotBeNull();
        response.Metadata.Should().ContainKey("field");
        response.Metadata!["field"].Should().Be("email");
        response.Metadata.Should().ContainKey("code");
        response.Metadata["code"].Should().Be("INVALID_FORMAT");
    }

    [Fact]
    public void Fail_WithComplexTypeGeneric_ReturnsFailedResponseWithNullData()
    {
        // Arrange
        var error = "Not found";

        // Act
        var response = ApiResponse<TestData>.Fail(error);

        // Assert
        response.Success.Should().BeFalse();
        response.Error.Should().Be(error);
        response.Data.Should().BeNull();
    }

    #endregion

    #region Property Tests

    [Fact]
    public void Properties_CanBeSetDirectly()
    {
        // Arrange
        var response = new ApiResponse<string>();
        var metadata = new Dictionary<string, object> { { "key", "value" } };

        // Act
        response.Success = true;
        response.Data = "direct data";
        response.Error = "should be null but can be set";
        response.Metadata = metadata;

        // Assert
        response.Success.Should().BeTrue();
        response.Data.Should().Be("direct data");
        response.Error.Should().Be("should be null but can be set");
        response.Metadata.Should().BeSameAs(metadata);
    }

    [Fact]
    public void DefaultValues_AreCorrect()
    {
        // Act
        var response = new ApiResponse<int>();

        // Assert
        response.Success.Should().BeFalse();
        response.Data.Should().Be(default);
        response.Error.Should().BeNull();
        response.Metadata.Should().BeNull();
    }

    #endregion

    #region Helper Classes

    private class TestData
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    #endregion
}

