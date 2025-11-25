namespace SecondBrain.Infrastructure.Exceptions;

/// <summary>
/// Exception thrown when a repository operation fails
/// </summary>
public class RepositoryException : Exception
{
    public RepositoryException(string message) : base(message)
    {
    }

    public RepositoryException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }
}

