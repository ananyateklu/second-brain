namespace SecondBrain.Api.Services
    {
        public class AnthropicException : Exception
        {
            public AnthropicException(string message) : base(message) { }
            public AnthropicException(string message, Exception innerException) : base(message, innerException) { }
        }
    }