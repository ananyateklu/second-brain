from typing import TypedDict, Dict, Any, List, Optional, Union
from enum import Enum

class ToolType(Enum):
    """Types of tools"""
    API_CALL = "api_call"
    FUNCTION = "function"
    SEARCH = "search"
    FILE_OPERATION = "file_operation"
    DATABASE = "database"
    CUSTOM = "custom"

class Tool(TypedDict):
    """Tool configuration and metadata"""
    name: str
    type: str
    description: str
    parameters: Dict[str, Any]
    required_permissions: List[str]
    config: Optional[Dict[str, Any]]
    timeout: Optional[float]
    retry_config: Optional[Dict[str, Any]]

class ToolResult(TypedDict):
    """Result from tool execution"""
    success: bool
    data: Any
    error: Optional[str]
    execution_time: float
    metadata: Optional[Dict[str, Any]]

class ToolParameterType(Enum):
    """Types of tool parameters"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"

class ToolParameter(TypedDict):
    """Definition of a tool parameter"""
    type: str
    description: str
    required: bool
    default: Optional[Any]
    enum: Optional[List[Any]]

class APIToolConfig(TypedDict):
    """Configuration for API-based tools"""
    endpoint: str
    method: str
    headers: Optional[Dict[str, str]]
    query_params: Optional[Dict[str, Any]]
    body_template: Optional[Dict[str, Any]]
    response_mapping: Optional[Dict[str, str]]

class DatabaseToolConfig(TypedDict):
    """Configuration for database tools"""
    query_template: str
    parameters: Dict[str, str]
    result_mapping: Optional[Dict[str, str]]

class FileToolConfig(TypedDict):
    """Configuration for file operation tools"""
    operation: str
    file_pattern: str
    options: Optional[Dict[str, Any]]

class ToolConfig(TypedDict):
    """Complete tool configuration"""
    name: str
    type: str
    description: str
    parameters: Dict[str, ToolParameter]
    required_permissions: List[str]
    config: Union[APIToolConfig, DatabaseToolConfig, FileToolConfig]
    timeout: Optional[float]
    retry_config: Optional[Dict[str, Any]]

# Standard tool configurations
WEB_SEARCH_TOOL: Tool = {
    "name": "web_search",
    "type": "api_call",
    "description": "Search the web for information",
    "parameters": {
        "query": {
            "type": "string",
            "description": "Search query",
            "required": True,
            "default": None,
            "enum": None
        },
        "max_results": {
            "type": "integer",
            "description": "Maximum number of results",
            "required": False,
            "default": 5,
            "enum": None
        }
    },
    "required_permissions": ["web_access"],
    "config": {
        "endpoint": "https://api.duckduckgo.com/",
        "method": "GET",
        "headers": None,
        "query_params": None,
        "body_template": None,
        "response_mapping": None
    },
    "timeout": 30.0,
    "retry_config": {
        "max_retries": 3,
        "backoff_factor": 1.0
    }
}

NEWS_SEARCH_TOOL: Tool = {
    "name": "news_search",
    "type": "api_call",
    "description": "Search for news articles",
    "parameters": {
        "query": {
            "type": "string",
            "description": "Search query",
            "required": True,
            "default": None,
            "enum": None
        },
        "max_results": {
            "type": "integer",
            "description": "Maximum number of results",
            "required": False,
            "default": 3,
            "enum": None
        },
        "category": {
            "type": "string",
            "description": "News category",
            "required": False,
            "default": "general",
            "enum": ["technology", "science", "business", "general"]
        }
    },
    "required_permissions": ["news_api_access"],
    "config": {
        "endpoint": "https://newsapi.org/v2/everything",
        "method": "GET",
        "headers": None,
        "query_params": None,
        "body_template": None,
        "response_mapping": None
    },
    "timeout": 30.0,
    "retry_config": {
        "max_retries": 3,
        "backoff_factor": 1.0
    }
}

ACADEMIC_SEARCH_TOOL: Tool = {
    "name": "academic_search",
    "type": "api_call",
    "description": "Search academic papers",
    "parameters": {
        "query": {
            "type": "string",
            "description": "Search query",
            "required": True,
            "default": None,
            "enum": None
        },
        "max_results": {
            "type": "integer",
            "description": "Maximum number of results",
            "required": False,
            "default": 5,
            "enum": None
        },
        "year_range": {
            "type": "string",
            "description": "Publication year range",
            "required": False,
            "default": "5y",
            "enum": None
        }
    },
    "required_permissions": ["academic_access"],
    "config": {
        "endpoint": "https://api.semanticscholar.org/graph/v1/paper/search",
        "method": "GET",
        "headers": None,
        "query_params": None,
        "body_template": None,
        "response_mapping": None
    },
    "timeout": 30.0,
    "retry_config": {
        "max_retries": 3,
        "backoff_factor": 1.0
    }
}

# Dictionary of all standard tools
STANDARD_TOOLS: Dict[str, Tool] = {
    "web_search": WEB_SEARCH_TOOL,
    "news_search": NEWS_SEARCH_TOOL,
    "academic_search": ACADEMIC_SEARCH_TOOL
} 