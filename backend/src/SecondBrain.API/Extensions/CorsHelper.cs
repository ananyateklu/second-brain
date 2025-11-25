namespace SecondBrain.API.Extensions;

/// <summary>
/// Helper class for CORS origin validation
/// </summary>
public static class CorsHelper
{
    /// <summary>
    /// Checks if an origin is a local network IP
    /// </summary>
    public static bool IsLocalNetworkOrigin(string origin)
    {
        if (string.IsNullOrEmpty(origin))
            return false;

        // Allow localhost and 127.0.0.1
        if (origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase) || 
            origin.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase))
            return true;

        // Allow local network IP ranges
        if (origin.StartsWith("http://192.168.", StringComparison.OrdinalIgnoreCase) ||
            origin.StartsWith("http://10.", StringComparison.OrdinalIgnoreCase))
            return true;

        // Allow 172.16.0.0 - 172.31.255.255 range
        if (origin.StartsWith("http://172.", StringComparison.OrdinalIgnoreCase))
        {
            // Extract the second octet
            var parts = origin.Split('.');
            if (parts.Length >= 2)
            {
                var secondOctetStr = parts[1];
                if (int.TryParse(secondOctetStr, out var secondOctet))
                {
                    return secondOctet >= 16 && secondOctet <= 31;
                }
            }
        }

        return false;
    }
}

