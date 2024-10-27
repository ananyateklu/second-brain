namespace SecondBrain.Api.Services
    {
        public class AnthropicException : System.Exception
        {
            public AnthropicException(string message) : base(message) { }
        }
    }