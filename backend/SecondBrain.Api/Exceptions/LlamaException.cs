namespace SecondBrain.Api.Exceptions
{
    public class LlamaException : Exception
    {
        public LlamaException(string message) : base(message) { }
        public LlamaException(string message, Exception innerException) 
            : base(message, innerException) { }
    }
} 