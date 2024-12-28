using Xunit;

namespace SecondBrain.Tests;

public class BasicTests
{
    [Fact]
    public void PassingTest()
    {
        Assert.True(true, "This test should always pass");
    }
}