class AgentError(Exception):
    """Base exception for all agent-related errors"""
    pass

class ToolExecutionError(AgentError):
    """Raised when a tool execution fails"""
    pass

class SearchError(AgentError):
    """Base class for search-related errors"""
    pass

class WebSearchError(SearchError):
    """Raised when web search fails"""
    pass

class NewsSearchError(SearchError):
    """Raised when news search fails"""
    pass

class AcademicSearchError(SearchError):
    """Raised when academic search fails"""
    pass

class PatentSearchError(SearchError):
    """Raised when patent search fails"""
    pass

class ExpertSearchError(SearchError):
    """Raised when expert search fails"""
    pass

class ValidationError(AgentError):
    """Raised when validation fails"""
    pass

class ConfigurationError(AgentError):
    """Raised when there's a configuration error"""
    pass

class APIError(AgentError):
    """Raised when an API call fails"""
    def __init__(self, message: str, status_code: int = None, response: str = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response

class RateLimitError(APIError):
    """Raised when rate limit is exceeded"""
    pass

class MemoryError(AgentError):
    """Raised when there's an error with conversation memory or context management"""
    pass

class ProcessingError(AgentError):
    """Raised when there's an error processing content"""
    pass

class AuthenticationError(AgentError):
    """Raised when there's an authentication error"""
    pass

class TokenError(AgentError):
    """Raised when there's an error with token counting or management"""
    pass

class ContextError(AgentError):
    """Raised when there's an error with context management or window operations"""
    pass 