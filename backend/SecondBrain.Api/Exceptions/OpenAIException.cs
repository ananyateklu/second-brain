using System;

namespace SecondBrain.Api.Exceptions
{
    public class OpenAIException : Exception
    {
        public OpenAIException(string message) : base(message) { }
        public OpenAIException(string message, Exception innerException) 
            : base(message, innerException) { }
    }
} 