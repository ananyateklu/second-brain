from typing import Dict, Any, Optional, List, TypedDict, Union
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class SearchType(Enum):
    """Types of search operations"""
    WEB = "web"
    NEWS = "news"
    ACADEMIC = "academic"
    PATENT = "patent"
    EXPERT = "expert"

class NewsCategory(Enum):
    """News categories"""
    TECHNOLOGY = "technology"
    SCIENCE = "science"
    BUSINESS = "business"
    GENERAL = "general"

class ToolType(Enum):
    """Types of tools"""
    API_CALL = "api_call"
    DATABASE = "database"
    FILE_OPERATION = "file_operation"

@dataclass
class ExecutionMetadata:
    """Metadata for tool execution"""
    timestamp: datetime
    model_id: str
    execution_time: float
    tools_used: List[str]
    status: str
    error: Optional[str] = None

class SearchParameters(TypedDict, total=False):
    """Common search parameters"""
    query: str
    max_results: int
    language: str
    region: str
    sort_by: str
    date_range: str

class SearchResult(TypedDict):
    """Common search result format"""
    success: bool
    results: List[Dict[str, Any]]
    total_found: int
    error: Optional[str]
    metadata: Optional[Dict[str, Any]]

class Tool(TypedDict):
    """Tool definition"""
    name: str
    type: str
    description: str
    parameters: Dict[str, Any]
    required_permissions: Optional[List[str]]

class AgentResponse(TypedDict):
    """Standard agent response format"""
    result: str
    metadata: Dict[str, Any]
    execution_time: float
    tools_used: List[Tool]
    status: str
    error: Optional[str]

# Constants
DEFAULT_RETRY_CONFIG = {
    "total": 5,
    "backoff_factor": 0.1,
    "status_forcelist": [500, 502, 503, 504]
}

VALID_LANGUAGES = {
    "ar", "de", "en", "es", "fr", "he", 
    "it", "nl", "no", "pt", "ru", "se", "zh"
}

VALID_SORT_OPTIONS = {
    "relevancy", "popularity", "publishedAt"
}

STOP_WORDS = {
    "what", "who", "where", "when", "how", "why",
    "are", "is", "the", "in", "and", "or", "their",
    "recent", "find", "search", "look", "please",
    "could", "would", "should", "can", "will"
} 