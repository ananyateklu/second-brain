using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Exceptions;

public class RepositoryExceptionTests
{
    [Fact]
    public void Constructor_WithMessage_SetsMessageProperty()
    {
        // Arrange
        var expectedMessage = "Test error message";

        // Act
        var exception = new RepositoryException(expectedMessage);

        // Assert
        exception.Message.Should().Be(expectedMessage);
        exception.InnerException.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithMessageAndInnerException_SetsBothProperties()
    {
        // Arrange
        var expectedMessage = "Outer error message";
        var innerException = new InvalidOperationException("Inner error");

        // Act
        var exception = new RepositoryException(expectedMessage, innerException);

        // Assert
        exception.Message.Should().Be(expectedMessage);
        exception.InnerException.Should().Be(innerException);
        exception.InnerException.Should().BeOfType<InvalidOperationException>();
    }

    [Fact]
    public void Constructor_WithEmptyMessage_AcceptsEmptyMessage()
    {
        // Act
        var exception = new RepositoryException(string.Empty);

        // Assert
        exception.Message.Should().Be(string.Empty);
    }

    [Fact]
    public void RepositoryException_IsException()
    {
        // Act
        var exception = new RepositoryException("Test");

        // Assert
        exception.Should().BeAssignableTo<Exception>();
    }

    [Fact]
    public void Constructor_WithNullInnerException_AllowsNull()
    {
        // Act
        var exception = new RepositoryException("Test message", null!);

        // Assert
        exception.Message.Should().Be("Test message");
        exception.InnerException.Should().BeNull();
    }

    [Fact]
    public void Exception_CanBeCaughtAsException()
    {
        // Arrange
        var expectedMessage = "Repository operation failed";

        // Act & Assert
        Action act = () => throw new RepositoryException(expectedMessage);
        
        act.Should().Throw<Exception>()
            .WithMessage(expectedMessage);
    }

    [Fact]
    public void Exception_CanBeCaughtAsRepositoryException()
    {
        // Arrange
        var expectedMessage = "Repository operation failed";

        // Act & Assert
        Action act = () => throw new RepositoryException(expectedMessage);
        
        act.Should().Throw<RepositoryException>()
            .WithMessage(expectedMessage);
    }

    [Fact]
    public void Exception_PreservesStackTrace()
    {
        // Arrange
        RepositoryException? caughtException = null;

        // Act
        try
        {
            ThrowRepositoryException();
        }
        catch (RepositoryException ex)
        {
            caughtException = ex;
        }

        // Assert
        caughtException.Should().NotBeNull();
        caughtException!.StackTrace.Should().Contain(nameof(ThrowRepositoryException));
    }

    private static void ThrowRepositoryException()
    {
        throw new RepositoryException("Test exception");
    }

    [Fact]
    public void InnerException_CanBeChained()
    {
        // Arrange
        var level3 = new ArgumentException("Deepest error");
        var level2 = new InvalidOperationException("Middle error", level3);
        var level1 = new RepositoryException("Top level error", level2);

        // Assert
        level1.InnerException.Should().Be(level2);
        level1.InnerException!.InnerException.Should().Be(level3);
    }
}

