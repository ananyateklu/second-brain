from typing import Dict, Any, Set

# Retry configuration
DEFAULT_RETRY_CONFIG: Dict[str, Any] = {
    "total": 5,
    "backoff_factor": 0.1,
    "status_forcelist": [500, 502, 503, 504]
}

# Common stop words for text processing
STOP_WORDS: Set[str] = {
    "what", "who", "where", "when", "how", "why",
    "are", "is", "the", "in", "and", "or", "their",
    "recent", "find", "search", "look", "please",
    "could", "would", "should", "can", "will"
}

# Valid language configurations
VALID_LANGUAGES: Set[str] = {
    "ar", "de", "en", "es", "fr", "he", 
    "it", "nl", "no", "pt", "ru", "se", "zh"
}

# Valid sort options for NewsAPI
VALID_SORT_OPTIONS: Set[str] = {
    "relevancy", "popularity", "publishedAt"
}

# Patent search configurations
PATENT_SEARCH_CONFIG: Dict[str, Any] = {
    "max_results": 10,
    "sort_by": "relevance",
    "date_range": "5y"  # Default to last 5 years
}

# Response messages
NO_ABSTRACT_MSG: str = "No abstract available"
NO_RESULTS_FOUND: str = "No results found"
NO_DESCRIPTION: str = "No description available"

# Empty result constants
EMPTY_RESULTS: Set[str] = {"[]", NO_RESULTS_FOUND, "{}", "null", "None"}

# Regex patterns
BOLD_PATTERN: str = r'\*(.*?)\*+'
BOLD_REPLACEMENT: str = r'**\1**'

# Tool configurations
BASE_RESEARCH_TOOLS: list[Dict[str, Any]] = [
    {
        "name": "web_search",
        "type": "api_call",
        "description": "Search the web for recent information and developments using DuckDuckGo",
        "parameters": {
            "query": "string",
            "max_results": 5,
            "time_range": "string",  # e.g., "day", "week", "month", "year"
            "region": "string",      # e.g., "us", "uk", "global"
            "safe_search": "boolean" # Enable/disable safe search
        },
        "required_permissions": ["web_access"]
    },
    {
        "name": "academic_search",
        "type": "api_call",
        "description": "Search academic papers and research publications using Google Scholar and Semantic Scholar",
        "parameters": {
            "query": "string",
            "year_range": "string",
            "max_results": 3,
            "sort_by": "string",     # e.g., "relevance", "date", "citations"
            "publication_type": "string", # e.g., "journal", "conference", "thesis"
            "fields": "array"        # Specific fields to search in
        },
        "required_permissions": ["academic_access"]
    }
] 