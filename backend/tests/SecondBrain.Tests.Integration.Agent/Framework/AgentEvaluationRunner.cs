using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SecondBrain.Tests.Integration.Agent.Framework;

/// <summary>
/// Runs agent evaluation test cases and generates reports.
/// This is a mock-based evaluator that validates tool selection without calling actual AI providers.
/// </summary>
public class AgentEvaluationRunner
{
    private readonly IToolSelectionValidator _toolValidator;

    public AgentEvaluationRunner(IToolSelectionValidator toolValidator)
    {
        _toolValidator = toolValidator;
    }

    /// <summary>
    /// Run all evaluation cases and generate a report.
    /// </summary>
    public async Task<EvaluationReport> RunAsync(
        IEnumerable<EvaluationCase> cases,
        CancellationToken cancellationToken = default)
    {
        var startedAt = DateTime.UtcNow;
        var results = new List<EvaluationResult>();

        foreach (var testCase in cases)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var result = await EvaluateCaseAsync(testCase, cancellationToken);
            results.Add(result);
        }

        return GenerateReport(startedAt, results);
    }

    /// <summary>
    /// Run evaluation cases for a specific category.
    /// </summary>
    public async Task<EvaluationReport> RunCategoryAsync(
        IEnumerable<EvaluationCase> cases,
        EvaluationCategory category,
        CancellationToken cancellationToken = default)
    {
        var filteredCases = cases.Where(c => c.Category == category);
        return await RunAsync(filteredCases, cancellationToken);
    }

    private async Task<EvaluationResult> EvaluateCaseAsync(
        EvaluationCase testCase,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Validate tool selection using the validator
            var validationResult = await _toolValidator.ValidateToolSelectionAsync(
                testCase.UserInput,
                testCase.ConversationHistory,
                cancellationToken);

            stopwatch.Stop();

            // Check if the selected tool matches expected
            var toolSelectionCorrect = testCase.ExpectedTools.Contains(
                validationResult.SelectedTool,
                StringComparer.OrdinalIgnoreCase);

            // Check parameters if specified
            bool? parametersCorrect = null;
            if (testCase.ExpectedParameters != null && validationResult.Parameters != null)
            {
                parametersCorrect = ValidateParameters(
                    testCase.ExpectedParameters,
                    validationResult.Parameters);
            }

            // Check response keywords if specified
            var responseValid = true;
            if (testCase.ExpectedResponseKeywords != null && validationResult.ResponseContent != null)
            {
                responseValid = testCase.ExpectedResponseKeywords.All(
                    keyword => validationResult.ResponseContent.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            }

            // Check forbidden keywords
            if (testCase.ForbiddenResponseKeywords != null && validationResult.ResponseContent != null)
            {
                responseValid = responseValid && !testCase.ForbiddenResponseKeywords.Any(
                    keyword => validationResult.ResponseContent.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            }

            var passed = toolSelectionCorrect &&
                         (parametersCorrect ?? true) &&
                         responseValid &&
                         (testCase.ExpectSuccess == validationResult.Success);

            return new EvaluationResult
            {
                Case = testCase,
                Passed = passed,
                ToolSelectionCorrect = toolSelectionCorrect,
                ParametersCorrect = parametersCorrect,
                ActualTool = validationResult.SelectedTool,
                ActualParameters = validationResult.Parameters,
                ResponseContent = validationResult.ResponseContent,
                ErrorMessage = passed ? null : GenerateErrorMessage(testCase, validationResult),
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new EvaluationResult
            {
                Case = testCase,
                Passed = false,
                ToolSelectionCorrect = false,
                ErrorMessage = $"Exception during evaluation: {ex.Message}",
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private static bool ValidateParameters(
        Dictionary<string, object> expected,
        Dictionary<string, object> actual)
    {
        foreach (var (key, expectedValue) in expected)
        {
            if (!actual.TryGetValue(key, out var actualValue))
                return false;

            // Handle JsonElement comparison
            var expectedStr = expectedValue?.ToString() ?? "";
            var actualStr = actualValue?.ToString() ?? "";

            if (!expectedStr.Equals(actualStr, StringComparison.OrdinalIgnoreCase))
                return false;
        }
        return true;
    }

    private static string GenerateErrorMessage(
        EvaluationCase testCase,
        ToolValidationResult result)
    {
        var messages = new List<string>();

        if (!testCase.ExpectedTools.Contains(result.SelectedTool, StringComparer.OrdinalIgnoreCase))
        {
            messages.Add($"Expected tool: [{string.Join(", ", testCase.ExpectedTools)}], Actual: {result.SelectedTool}");
        }

        if (testCase.ExpectedParameters != null && result.Parameters != null)
        {
            foreach (var (key, expected) in testCase.ExpectedParameters)
            {
                if (!result.Parameters.TryGetValue(key, out var actual) ||
                    !expected.ToString()!.Equals(actual?.ToString(), StringComparison.OrdinalIgnoreCase))
                {
                    messages.Add($"Parameter '{key}': expected '{expected}', got '{actual}'");
                }
            }
        }

        return string.Join("; ", messages);
    }

    private static EvaluationReport GenerateReport(DateTime startedAt, List<EvaluationResult> results)
    {
        var completedAt = DateTime.UtcNow;

        // Calculate category summaries
        var byCategory = results
            .GroupBy(r => r.Case.Category)
            .ToDictionary(
                g => g.Key,
                g => new CategorySummary
                {
                    Category = g.Key,
                    Total = g.Count(),
                    Passed = g.Count(r => r.Passed)
                });

        // Calculate specific rates
        var toolSelectionResults = results.Where(r => r.Case.Category == EvaluationCategory.ToolSelection).ToList();
        var multiStepResults = results.Where(r => r.Case.Category == EvaluationCategory.MultiStep).ToList();
        var errorRecoveryResults = results.Where(r => r.Case.Category == EvaluationCategory.ErrorRecovery).ToList();
        var contextResults = results.Where(r => r.Case.Category == EvaluationCategory.ContextRetention).ToList();
        var securityResults = results.Where(r => r.Case.Category == EvaluationCategory.Security).ToList();

        return new EvaluationReport
        {
            StartedAt = startedAt,
            CompletedAt = completedAt,
            TotalCases = results.Count,
            PassedCases = results.Count(r => r.Passed),
            ToolSelectionAccuracy = CalculateRate(results, r => r.ToolSelectionCorrect),
            ParameterAccuracy = CalculateRate(results.Where(r => r.ParametersCorrect.HasValue), r => r.ParametersCorrect == true),
            MultiStepSuccessRate = CalculateRate(multiStepResults, r => r.Passed),
            ErrorRecoveryRate = CalculateRate(errorRecoveryResults, r => r.Passed),
            ContextRetentionRate = CalculateRate(contextResults, r => r.Passed),
            SecurityPassRate = CalculateRate(securityResults, r => r.Passed),
            AverageDurationMs = results.Count > 0 ? results.Average(r => r.DurationMs) : 0,
            ByCategory = byCategory,
            Failures = results.Where(r => !r.Passed).ToList(),
            AllResults = results
        };
    }

    private static double CalculateRate<T>(IEnumerable<T> items, Func<T, bool> predicate)
    {
        var list = items.ToList();
        return list.Count > 0 ? (double)list.Count(predicate) / list.Count : 0;
    }
}

/// <summary>
/// Interface for validating tool selection.
/// Implementations can be mock-based or use actual AI providers.
/// </summary>
public interface IToolSelectionValidator
{
    /// <summary>
    /// Validate what tool would be selected for a given input.
    /// </summary>
    Task<ToolValidationResult> ValidateToolSelectionAsync(
        string userInput,
        List<ConversationTurn>? history,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of tool selection validation.
/// </summary>
public record ToolValidationResult
{
    /// <summary>
    /// The tool that was selected.
    /// </summary>
    public required string SelectedTool { get; init; }

    /// <summary>
    /// Parameters passed to the tool.
    /// </summary>
    public Dictionary<string, object>? Parameters { get; init; }

    /// <summary>
    /// The response content from the agent.
    /// </summary>
    public string? ResponseContent { get; init; }

    /// <summary>
    /// Whether the tool execution succeeded.
    /// </summary>
    public bool Success { get; init; } = true;
}
