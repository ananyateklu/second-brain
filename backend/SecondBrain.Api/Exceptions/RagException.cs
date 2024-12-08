namespace SecondBrain.Api.Exceptions
{
    public class RagException : Exception
    {
        public RagException(string message) : base(message) { }
        public RagException(string message, Exception innerException) 
            : base(message, innerException) { }
    }
} 