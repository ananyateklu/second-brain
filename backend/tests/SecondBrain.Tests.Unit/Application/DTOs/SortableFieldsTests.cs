using FluentAssertions;
using SecondBrain.Application.DTOs.Common;

namespace SecondBrain.Tests.Unit.Application.DTOs;

public class SortableFieldsTests
{
    #region Constants Tests

    [Fact]
    public void Constants_ShouldHaveExpectedValues()
    {
        SortableFields.CreatedAt.Should().Be("createdAt");
        SortableFields.UpdatedAt.Should().Be("updatedAt");
        SortableFields.Title.Should().Be("title");
        SortableFields.Default.Should().Be(SortableFields.UpdatedAt);
    }

    #endregion

    #region IsValidNoteField Tests

    [Theory]
    [InlineData("createdAt", true)]
    [InlineData("updatedAt", true)]
    [InlineData("title", true)]
    [InlineData("CreatedAt", true)]  // Case insensitive
    [InlineData("UPDATEDAT", true)]  // Case insensitive
    [InlineData("TITLE", true)]      // Case insensitive
    [InlineData("invalid", false)]
    [InlineData("content", false)]
    [InlineData("", true)]           // Empty string is considered valid (falls back to default)
    [InlineData(null, true)]         // Null is considered valid (falls back to default)
    public void IsValidNoteField_ShouldReturnExpectedResult(string? field, bool expected)
    {
        SortableFields.IsValidNoteField(field).Should().Be(expected);
    }

    #endregion

    #region IsValidConversationField Tests

    [Theory]
    [InlineData("createdAt", true)]
    [InlineData("updatedAt", true)]
    [InlineData("title", true)]
    [InlineData("CreatedAt", true)]  // Case insensitive
    [InlineData("UPDATEDAT", true)]  // Case insensitive
    [InlineData("TITLE", true)]      // Case insensitive
    [InlineData("invalid", false)]
    [InlineData("provider", false)]
    [InlineData("", true)]           // Empty string is considered valid (falls back to default)
    [InlineData(null, true)]         // Null is considered valid (falls back to default)
    public void IsValidConversationField_ShouldReturnExpectedResult(string? field, bool expected)
    {
        SortableFields.IsValidConversationField(field).Should().Be(expected);
    }

    #endregion

    #region Normalize Tests

    [Theory]
    [InlineData("createdAt", "createdat")]   // Lowercased
    [InlineData("CreatedAt", "createdat")]   // Lowercased
    [InlineData("CREATEDAT", "createdat")]   // Lowercased
    [InlineData("updatedAt", "updatedat")]   // Lowercased
    [InlineData("UpdatedAt", "updatedat")]   // Lowercased
    [InlineData("title", "title")]
    [InlineData("Title", "title")]           // Lowercased
    [InlineData("TITLE", "title")]           // Lowercased
    [InlineData(null, "updatedAt")]          // Default for null
    [InlineData("", "updatedAt")]            // Default for empty
    [InlineData("  ", "updatedAt")]          // Default for whitespace
    [InlineData("invalid", "invalid")]       // Just lowercased, not defaulted for invalid fields
    public void Normalize_ShouldReturnExpectedResult(string? field, string expected)
    {
        SortableFields.Normalize(field).Should().Be(expected);
    }

    #endregion
}

public class SortDirectionTests
{
    [Fact]
    public void SortDirection_ShouldHaveExpectedValues()
    {
        ((int)SortDirection.Ascending).Should().Be(0);
        ((int)SortDirection.Descending).Should().Be(1);
    }

    [Fact]
    public void SortDirection_ShouldContainOnlyTwoValues()
    {
        Enum.GetValues<SortDirection>().Should().HaveCount(2);
    }
}

public class PaginatedResultSortingTests
{
    [Fact]
    public void Create_WithSortingParameters_ShouldSetSortBy()
    {
        // Arrange
        var items = new List<string> { "a", "b", "c" };

        // Act
        var result = PaginatedResult<string>.Create(items, 1, 10, 3, "title", SortDirection.Ascending);

        // Assert
        result.SortBy.Should().Be("title");
        result.SortDirection.Should().Be(SortDirection.Ascending);
    }

    [Fact]
    public void Create_WithoutSortingParameters_ShouldUseDefaults()
    {
        // Arrange
        var items = new List<string> { "a", "b", "c" };

        // Act
        var result = PaginatedResult<string>.Create(items, 1, 10, 3);

        // Assert
        result.SortBy.Should().BeNull();
        result.SortDirection.Should().Be(SortDirection.Descending);
    }

    [Fact]
    public void Create_WithDescendingSortDirection_ShouldPreserveDirection()
    {
        // Arrange
        var items = new List<string> { "a", "b", "c" };

        // Act
        var result = PaginatedResult<string>.Create(items, 1, 10, 3, "createdAt", SortDirection.Descending);

        // Assert
        result.SortBy.Should().Be("createdAt");
        result.SortDirection.Should().Be(SortDirection.Descending);
    }

    [Fact]
    public void Create_WithNullSortBy_ShouldAllowNull()
    {
        // Arrange
        var items = new List<string> { "a", "b", "c" };

        // Act
        var result = PaginatedResult<string>.Create(items, 1, 10, 3, null, SortDirection.Ascending);

        // Assert
        result.SortBy.Should().BeNull();
        result.SortDirection.Should().Be(SortDirection.Ascending);
    }
}
