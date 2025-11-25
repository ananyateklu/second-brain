namespace SecondBrain.Application.Exceptions;

/// <summary>
/// Exception thrown when a requested entity is not found
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message)
    {
    }

    public NotFoundException(string entityName, string entityId) 
        : base($"{entityName} with ID '{entityId}' was not found.")
    {
    }
}

