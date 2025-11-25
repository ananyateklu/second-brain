namespace SecondBrain.API.Configuration;

/// <summary>
/// Configuration settings for CORS
/// </summary>
public class CorsSettings
{
    /// <summary>
    /// List of allowed origins for CORS
    /// </summary>
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Allow local network IPs
    /// </summary>
    public bool AllowLocalNetworkIps { get; set; } = true;
}

