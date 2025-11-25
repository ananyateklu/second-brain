namespace SecondBrain.Application.Configuration;

public class PineconeSettings
{
    public const string SectionName = "Pinecone";

    public string ApiKey { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string IndexName { get; set; } = string.Empty;
    public string Model { get; set; } = "text-embedding-3-small";
    public int Dimensions { get; set; } = 1536;
}
