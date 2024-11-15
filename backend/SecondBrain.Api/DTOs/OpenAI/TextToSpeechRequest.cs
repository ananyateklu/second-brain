using System.Text.Json.Serialization;

public class TextToSpeechRequest
{
    [JsonPropertyName("input")]
    public string Input { get; set; }

    [JsonPropertyName("model")]
    public string Model { get; set; }

    [JsonPropertyName("voice")]
    public string Voice { get; set; } = "alloy";
} 