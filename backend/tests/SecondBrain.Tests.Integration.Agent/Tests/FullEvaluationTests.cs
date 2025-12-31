using FluentAssertions;
using SecondBrain.Tests.Integration.Agent.Framework;
using SecondBrain.Tests.Integration.Agent.TestCases;
using Xunit;
using Xunit.Abstractions;

namespace SecondBrain.Tests.Integration.Agent.Tests;

/// <summary>
/// Full evaluation tests that run all test cases and generate comprehensive reports.
/// </summary>
public class FullEvaluationTests
{
    private readonly AgentEvaluationRunner _runner;
    private readonly ITestOutputHelper _output;

    public FullEvaluationTests(ITestOutputHelper output)
    {
        _output = output;
        var validator = new MockToolSelectionValidator();
        _runner = new AgentEvaluationRunner(validator);
    }

    [Fact]
    public async Task FullEvaluation_ShouldMeetOverallTargets()
    {
        // Arrange
        var allCases = EvaluationTestCases.GetAllCases().ToList();

        // Act
        var report = await _runner.RunAsync(allCases);

        // Assert & Report
        _output.WriteLine("=== AGENT EVALUATION REPORT ===");
        _output.WriteLine($"Started: {report.StartedAt:O}");
        _output.WriteLine($"Completed: {report.CompletedAt:O}");
        _output.WriteLine($"Duration: {(report.CompletedAt - report.StartedAt).TotalMilliseconds:F0}ms");
        _output.WriteLine("");
        _output.WriteLine($"Total Cases: {report.TotalCases}");
        _output.WriteLine($"Passed: {report.PassedCases}");
        _output.WriteLine($"Failed: {report.FailedCases}");
        _output.WriteLine($"Pass Rate: {report.PassRate:P1}");
        _output.WriteLine("");
        _output.WriteLine("=== METRICS ===");
        _output.WriteLine($"Tool Selection Accuracy: {report.ToolSelectionAccuracy:P1}");
        _output.WriteLine($"Parameter Accuracy: {report.ParameterAccuracy:P1}");
        _output.WriteLine($"Multi-Step Success Rate: {report.MultiStepSuccessRate:P1}");
        _output.WriteLine($"Error Recovery Rate: {report.ErrorRecoveryRate:P1}");
        _output.WriteLine($"Context Retention Rate: {report.ContextRetentionRate:P1}");
        _output.WriteLine($"Security Pass Rate: {report.SecurityPassRate:P1}");
        _output.WriteLine($"Average Duration: {report.AverageDurationMs:F2}ms");
        _output.WriteLine("");
        _output.WriteLine("=== BY CATEGORY ===");
        foreach (var (category, summary) in report.ByCategory)
        {
            _output.WriteLine($"  {category}: {summary.Passed}/{summary.Total} ({summary.PassRate:P1})");
        }

        if (report.Failures.Any())
        {
            _output.WriteLine("");
            _output.WriteLine("=== FAILURES ===");
            foreach (var failure in report.Failures)
            {
                _output.WriteLine($"  [{failure.Case.Id}] {failure.Case.Description}");
                _output.WriteLine($"    Expected: {string.Join(", ", failure.Case.ExpectedTools)}");
                _output.WriteLine($"    Actual: {failure.ActualTool}");
                _output.WriteLine($"    Error: {failure.ErrorMessage}");
            }
        }

        // Assertions
        report.PassRate.Should().BeGreaterThanOrEqualTo(0.85,
            because: "overall pass rate should be at least 85%");
        report.ToolSelectionAccuracy.Should().BeGreaterThanOrEqualTo(0.90,
            because: "tool selection should be at least 90% accurate");
        report.SecurityPassRate.Should().Be(1.0,
            because: "all security tests must pass");
    }

    [Fact]
    public async Task HighPriorityCases_ShouldAllPass()
    {
        // Arrange
        var highPriorityCases = EvaluationTestCases.GetHighPriorityCases().ToList();

        // Act
        var report = await _runner.RunAsync(highPriorityCases);

        // Assert
        _output.WriteLine($"High Priority Cases: {report.TotalCases}");
        _output.WriteLine($"Passed: {report.PassedCases}");

        if (report.Failures.Any())
        {
            _output.WriteLine("Failures:");
            foreach (var failure in report.Failures)
            {
                _output.WriteLine($"  [{failure.Case.Id}] {failure.Case.Description}: {failure.ErrorMessage}");
            }
        }

        report.PassRate.Should().BeGreaterThanOrEqualTo(0.95,
            because: $"high priority cases should have 95%+ pass rate");
    }

    [Theory]
    [InlineData(EvaluationCategory.ToolSelection, 0.90)]
    [InlineData(EvaluationCategory.MultiStep, 0.70)]
    [InlineData(EvaluationCategory.ErrorRecovery, 0.60)]
    [InlineData(EvaluationCategory.ContextRetention, 0.70)]
    [InlineData(EvaluationCategory.Security, 1.0)]
    public async Task EachCategory_ShouldMeetMinimumThreshold(
        EvaluationCategory category,
        double minimumPassRate)
    {
        // Arrange
        var cases = EvaluationTestCases.GetCasesByCategory(category);

        // Act
        var report = await _runner.RunCategoryAsync(cases, category);

        // Assert
        _output.WriteLine($"{category}: {report.PassedCases}/{report.TotalCases} ({report.PassRate:P1})");

        report.PassRate.Should().BeGreaterThanOrEqualTo(minimumPassRate,
            because: $"{category} should have at least {minimumPassRate:P0} pass rate");
    }

    [Fact]
    public async Task PerformanceMetrics_ShouldBeAcceptable()
    {
        // Arrange
        var allCases = EvaluationTestCases.GetAllCases().ToList();

        // Act
        var report = await _runner.RunAsync(allCases);

        // Assert
        report.AverageDurationMs.Should().BeLessThan(100,
            because: "mock validation should be fast");

        // Individual cases should also be fast
        foreach (var result in report.AllResults)
        {
            result.DurationMs.Should().BeLessThan(500,
                because: $"case {result.Case.Id} should complete quickly");
        }
    }

    [Fact]
    public async Task SearchRelatedCases_ShouldHaveHighAccuracy()
    {
        // Arrange
        var searchCases = EvaluationTestCases.GetCasesByTag("search");

        // Act
        var report = await _runner.RunAsync(searchCases);

        // Assert
        _output.WriteLine($"Search Cases: {report.PassedCases}/{report.TotalCases} ({report.PassRate:P1})");

        report.PassRate.Should().BeGreaterThanOrEqualTo(0.90,
            because: "search tool selection is critical for user experience");
    }

    [Fact]
    public async Task CRUDOperationCases_ShouldHaveHighAccuracy()
    {
        // Arrange
        var crudCases = EvaluationTestCases.GetCasesByTag("crud");

        // Act
        var report = await _runner.RunAsync(crudCases);

        // Assert
        _output.WriteLine($"CRUD Cases: {report.PassedCases}/{report.TotalCases} ({report.PassRate:P1})");

        report.PassRate.Should().BeGreaterThanOrEqualTo(0.85,
            because: "CRUD operations are fundamental");
    }

    [Fact]
    public async Task ReportGeneration_ShouldIncludeAllMetrics()
    {
        // Arrange
        var allCases = EvaluationTestCases.GetAllCases().ToList();

        // Act
        var report = await _runner.RunAsync(allCases);

        // Assert
        report.TotalCases.Should().Be(allCases.Count);
        report.AllResults.Should().HaveCount(allCases.Count);
        report.ByCategory.Should().NotBeEmpty();
        report.StartedAt.Should().BeBefore(report.CompletedAt);

        // All categories should be represented
        report.ByCategory.Should().ContainKey(EvaluationCategory.ToolSelection);
        report.ByCategory.Should().ContainKey(EvaluationCategory.MultiStep);
        report.ByCategory.Should().ContainKey(EvaluationCategory.ErrorRecovery);
        report.ByCategory.Should().ContainKey(EvaluationCategory.ContextRetention);
        report.ByCategory.Should().ContainKey(EvaluationCategory.Security);
    }
}
