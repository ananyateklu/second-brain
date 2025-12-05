using FluentValidation.TestHelper;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Validators;

namespace SecondBrain.Tests.Unit.Application.Validators;

public class CreateNoteRequestValidatorTests
{
    private readonly CreateNoteRequestValidator _sut;

    public CreateNoteRequestValidatorTests()
    {
        _sut = new CreateNoteRequestValidator();
    }

    #region Title Validation Tests

    [Fact]
    public void Title_WhenEmpty_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = "" };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
            .WithErrorMessage("Title is required");
    }

    [Fact]
    public void Title_WhenNull_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = null! };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Title_WhenWhitespace_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = "   " };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Title_WhenExceeds500Characters_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = new string('a', 501) };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
            .WithErrorMessage("Title must not exceed 500 characters");
    }

    [Fact]
    public void Title_WhenExactly500Characters_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Title = new string('a', 500);

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Title_WhenValid_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Title);
    }

    #endregion

    #region Content Validation Tests

    [Fact]
    public void Content_WhenNull_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = "Valid Title", Content = null! };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Content)
            .WithErrorMessage("Content cannot be null");
    }

    [Fact]
    public void Content_WhenExceedsMaxLength_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest
        {
            Title = "Valid Title",
            Content = new string('a', 1000001)
        };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Content)
            .WithErrorMessage("Content must not exceed 1,000,000 characters");
    }

    [Fact]
    public void Content_WhenExactly1000000Characters_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Content = new string('a', 1000000);

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Content);
    }

    [Fact]
    public void Content_WhenEmpty_ShouldNotHaveValidationError()
    {
        // Arrange - Empty content is allowed, only null is not
        var request = CreateValidRequest();
        request.Content = "";

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Content);
    }

    #endregion

    #region Tags Validation Tests

    [Fact]
    public void Tags_WhenNull_ShouldHaveValidationError()
    {
        // Arrange
        var request = new CreateNoteRequest { Title = "Valid", Content = "Valid", Tags = null! };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        // With CascadeMode.Stop, validation stops after NotNull fails and returns a proper error
        result.ShouldHaveValidationErrorFor(x => x.Tags)
            .WithErrorMessage("Tags list cannot be null");
    }

    [Fact]
    public void Tags_WhenExceeds50Tags_ShouldHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = Enumerable.Range(1, 51).Select(i => $"tag{i}").ToList();

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Tags)
            .WithErrorMessage("Maximum 50 tags allowed");
    }

    [Fact]
    public void Tags_WhenExactly50Tags_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = Enumerable.Range(1, 50).Select(i => $"tag{i}").ToList();

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void Tags_WhenContainsEmptyTag_ShouldHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = new List<string> { "valid-tag", "", "another-valid" };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Tags)
            .WithErrorMessage("Each tag must be non-empty and not exceed 100 characters");
    }

    [Fact]
    public void Tags_WhenContainsWhitespaceOnlyTag_ShouldHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = new List<string> { "valid-tag", "   ", "another-valid" };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void Tags_WhenTagExceeds100Characters_ShouldHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = new List<string> { new string('a', 101) };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Tags)
            .WithErrorMessage("Each tag must be non-empty and not exceed 100 characters");
    }

    [Fact]
    public void Tags_WhenTagExactly100Characters_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = new List<string> { new string('a', 100) };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void Tags_WhenEmpty_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Tags = new List<string>();

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    #endregion

    #region Folder Validation Tests

    [Fact]
    public void Folder_WhenExceeds200Characters_ShouldHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Folder = new string('a', 201);

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Folder)
            .WithErrorMessage("Folder name must not exceed 200 characters");
    }

    [Fact]
    public void Folder_WhenExactly200Characters_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Folder = new string('a', 200);

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Folder);
    }

    [Fact]
    public void Folder_WhenNull_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Folder = null;

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Folder);
    }

    [Fact]
    public void Folder_WhenEmpty_ShouldNotHaveValidationError()
    {
        // Arrange
        var request = CreateValidRequest();
        request.Folder = "";

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Folder);
    }

    #endregion

    #region Full Request Validation Tests

    [Fact]
    public void ValidRequest_ShouldNotHaveAnyErrors()
    {
        // Arrange
        var request = CreateValidRequest();

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void InvalidRequest_ShouldHaveMultipleErrors()
    {
        // Arrange
        var request = new CreateNoteRequest
        {
            Title = "",
            Content = null!,
            Tags = new List<string>() // Use empty list to avoid NullReferenceException
        };

        // Act
        var result = _sut.TestValidate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCountGreaterThanOrEqualTo(2);
    }

    #endregion

    #region Helper Methods

    private static CreateNoteRequest CreateValidRequest()
    {
        return new CreateNoteRequest
        {
            Title = "Valid Title",
            Content = "Valid Content",
            Tags = new List<string> { "tag1", "tag2" },
            IsArchived = false,
            Folder = "Work"
        };
    }

    #endregion
}

