namespace SecondBrain.Api.Exceptions
{
    public class OllamaException : Exception
    {
        public OllamaException(string message) : base(message) { }
        public OllamaException(string message, Exception innerException) 
            : base(message, innerException) { }
    }
} 