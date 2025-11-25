namespace SecondBrain.Application.Services.AI;

/// <summary>
/// Utility class for estimating token counts from text
/// </summary>
public static class TokenEstimator
{
    /// <summary>
    /// Estimates the number of tokens in a given text
    /// Uses a conservative estimate of 1 token ≈ 3.5 characters
    /// </summary>
    /// <param name="text">The text to estimate tokens for</param>
    /// <returns>Estimated token count</returns>
    public static int EstimateTokenCount(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        // Rough estimation: 1 token ≈ 3.5 characters
        // This is a conservative estimate that works well for mixed content
        return (int)Math.Ceiling(text.Length / 3.5);
    }
}

