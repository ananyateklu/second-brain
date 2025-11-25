namespace SecondBrain.API.Configuration;

/// <summary>
/// General API configuration settings
/// </summary>
public class ApiSettings
{
    /// <summary>
    /// API version
    /// </summary>
    public string Version { get; set; } = "2.0.0";

    /// <summary>
    /// Application name
    /// </summary>
    public string AppName { get; set; } = "SecondBrain API";

    /// <summary>
    /// Database provider
    /// </summary>
    public string DatabaseProvider { get; set; } = "Firestore";
}

