namespace SecondBrain.Application.Exceptions;

/// <summary>
/// Exception thrown when authentication or authorization fails
/// </summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message)
    {
    }

    public UnauthorizedException() : base("Unauthorized access.")
    {
    }
}

