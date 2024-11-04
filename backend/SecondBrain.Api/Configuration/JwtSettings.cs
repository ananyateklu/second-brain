namespace SecondBrain.Api.Configuration;

public sealed record JwtSettings
{
    public required string Secret { get; init; }
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required double AccessTokenExpirationMinutes { get; init; }
    public required double RefreshTokenExpirationDays { get; init; }
}
