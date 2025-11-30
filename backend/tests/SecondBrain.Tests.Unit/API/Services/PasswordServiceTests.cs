using Microsoft.Extensions.Logging;
using SecondBrain.API.Services;

namespace SecondBrain.Tests.Unit.API.Services;

public class PasswordServiceTests
{
    private readonly Mock<ILogger<PasswordService>> _mockLogger;
    private readonly PasswordService _sut;

    public PasswordServiceTests()
    {
        _mockLogger = new Mock<ILogger<PasswordService>>();
        _sut = new PasswordService(_mockLogger.Object);
    }

    #region HashPassword Tests

    [Fact]
    public void HashPassword_WhenValidPassword_ReturnsNonEmptyHash()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void HashPassword_HashIsDifferentFromPlaintext()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBe(password);
    }

    [Fact]
    public void HashPassword_SamePasswordProducesDifferentHashes()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash1 = _sut.HashPassword(password);
        var hash2 = _sut.HashPassword(password);

        // Assert - BCrypt generates different salts each time
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void HashPassword_DifferentPasswordsProduceDifferentHashes()
    {
        // Arrange
        var password1 = "Password1";
        var password2 = "Password2";

        // Act
        var hash1 = _sut.HashPassword(password1);
        var hash2 = _sut.HashPassword(password2);

        // Assert
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void HashPassword_HashStartsWithBcryptPrefix()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert - BCrypt hashes start with $2a$, $2b$, or $2y$
        hash.Should().MatchRegex(@"^\$2[aby]\$");
    }

    [Fact]
    public void HashPassword_EmptyPasswordProducesHash()
    {
        // Arrange
        var password = "";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void HashPassword_LongPasswordIsSupported()
    {
        // Arrange
        var password = new string('a', 100);

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void HashPassword_SpecialCharactersAreSupported()
    {
        // Arrange
        var password = "P@$$w0rd!@#$%^&*()_+-=[]{}|;':\",./<>?";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void HashPassword_UnicodeCharactersAreSupported()
    {
        // Arrange
        var password = "密码🔐пароль";

        // Act
        var hash = _sut.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region VerifyPassword Tests

    [Fact]
    public void VerifyPassword_WhenCorrectPassword_ReturnsTrue()
    {
        // Arrange
        var password = "SecurePassword123!";
        var hash = _sut.HashPassword(password);

        // Act
        var result = _sut.VerifyPassword(password, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WhenIncorrectPassword_ReturnsFalse()
    {
        // Arrange
        var password = "SecurePassword123!";
        var wrongPassword = "WrongPassword456!";
        var hash = _sut.HashPassword(password);

        // Act
        var result = _sut.VerifyPassword(wrongPassword, hash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenCaseDifferent_ReturnsFalse()
    {
        // Arrange
        var password = "SecurePassword123!";
        var differentCase = "securepassword123!";
        var hash = _sut.HashPassword(password);

        // Act
        var result = _sut.VerifyPassword(differentCase, hash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenInvalidHash_ReturnsFalse()
    {
        // Arrange
        var password = "SecurePassword123!";
        var invalidHash = "not-a-valid-bcrypt-hash";

        // Act
        var result = _sut.VerifyPassword(password, invalidHash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenEmptyHash_ReturnsFalse()
    {
        // Arrange
        var password = "SecurePassword123!";
        var emptyHash = "";

        // Act
        var result = _sut.VerifyPassword(password, emptyHash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenEmptyPassword_VerifiesCorrectly()
    {
        // Arrange
        var password = "";
        var hash = _sut.HashPassword(password);

        // Act
        var result = _sut.VerifyPassword(password, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WhenPasswordWithSpaces_VerifiesCorrectly()
    {
        // Arrange
        var password = "password with spaces";
        var hash = _sut.HashPassword(password);

        // Act
        var resultWithSpaces = _sut.VerifyPassword(password, hash);
        var resultWithoutSpaces = _sut.VerifyPassword("passwordwithspaces", hash);

        // Assert
        resultWithSpaces.Should().BeTrue();
        resultWithoutSpaces.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenPasswordWithLeadingTrailingSpaces_VerifiesExactly()
    {
        // Arrange
        var password = " password ";
        var hash = _sut.HashPassword(password);

        // Act
        var resultExact = _sut.VerifyPassword(" password ", hash);
        var resultTrimmed = _sut.VerifyPassword("password", hash);

        // Assert
        resultExact.Should().BeTrue();
        resultTrimmed.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_WhenUnicodePassword_VerifiesCorrectly()
    {
        // Arrange
        var password = "密码🔐пароль";
        var hash = _sut.HashPassword(password);

        // Act
        var result = _sut.VerifyPassword(password, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WhenPartialHashMatch_ReturnsFalse()
    {
        // Arrange
        var password = "SecurePassword123!";
        var hash = _sut.HashPassword(password);
        var partialHash = hash.Substring(0, hash.Length - 5);

        // Act
        var result = _sut.VerifyPassword(password, partialHash);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Integration Tests

    [Fact]
    public void HashAndVerify_RoundTrip_WorksCorrectly()
    {
        // Arrange
        var passwords = new[]
        {
            "SimplePassword",
            "Complex!@#$%Password123",
            "12345678",
            "",
            "VeryLongPassword" + new string('x', 100)
        };

        foreach (var password in passwords)
        {
            // Act
            var hash = _sut.HashPassword(password);
            var verifyResult = _sut.VerifyPassword(password, hash);

            // Assert
            verifyResult.Should().BeTrue($"Password '{password}' should verify correctly");
        }
    }

    [Fact]
    public void HashAndVerify_MultipleInstances_WorkCorrectly()
    {
        // Arrange
        var password = "SecurePassword123!";
        var service1 = new PasswordService(_mockLogger.Object);
        var service2 = new PasswordService(Mock.Of<ILogger<PasswordService>>());

        // Act
        var hash = service1.HashPassword(password);
        var verifyResult = service2.VerifyPassword(password, hash);

        // Assert - BCrypt hashes are portable between instances
        verifyResult.Should().BeTrue();
    }

    #endregion
}

