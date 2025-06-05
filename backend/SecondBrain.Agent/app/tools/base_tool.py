"""Base tool implementations for search and analysis tools."""

import time
import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import structlog

from app.core.interfaces import ITool
from app.core.models import ToolCategory, ToolRequest, ToolResponse

logger = structlog.get_logger(__name__)


class BaseTool(ITool, ABC):
    """Base implementation for all tools."""
    
    def __init__(self, name: str, category: ToolCategory, description: str):
        """Initialize the base tool."""
        self._name = name
        self._category = category
        self._description = description
        self._supported_agent_types: List[str] = []
        self._execution_timeout = 30  # seconds
    
    @property
    def name(self) -> str:
        """Get the tool name."""
        return self._name
    
    @property
    def category(self) -> ToolCategory:
        """Get the tool category."""
        return self._category
    
    @property
    def description(self) -> str:
        """Get the tool description."""
        return self._description
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get list of agent types that can use this tool."""
        return self._supported_agent_types
    
    async def execute(self, request: ToolRequest) -> ToolResponse:
        """Execute the tool with error handling and timing."""
        start_time = time.time()
        execution_id = f"tool_{uuid.uuid4().hex[:8]}"
        
        logger.info("Tool execution started",
            tool_name=self.name,
            execution_id=execution_id,
            query=request.query[:100] if request.query else "N/A",
            agent_type=request.agent_type
        )
        
        try:
            # Validate parameters
            if not self.validate_parameters(request.parameters):
                raise ValueError(f"Invalid parameters for tool {self.name}")
            
            # Execute tool-specific logic
            result = await self._execute_internal(request)
            
            execution_time = time.time() - start_time
            
            # Create successful response
            response = ToolResponse.success_response(
                data=result,
                execution_time=execution_time,
                metadata={
                    "tool_name": self.name,
                    "execution_id": execution_id,
                    "agent_type": request.agent_type,
                    "category": self.category.value
                }
            )
            
            logger.info("Tool execution completed",
                tool_name=self.name,
                execution_id=execution_id,
                execution_time=execution_time,
                success=True
            )
            
            return response
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            logger.error("Tool execution failed",
                tool_name=self.name,
                execution_id=execution_id,
                execution_time=execution_time,
                error=str(e),
                error_type=type(e).__name__
            )
            
            # Return error response
            return ToolResponse.error_response(
                error=str(e),
                execution_time=execution_time,
                metadata={
                    "tool_name": self.name,
                    "execution_id": execution_id,
                    "agent_type": request.agent_type,
                    "category": self.category.value
                }
            )
    
    @abstractmethod
    async def _execute_internal(self, request: ToolRequest) -> Dict[str, Any]:
        """Execute tool-specific logic. Must be implemented by subclasses."""
        pass
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate tool parameters. Can be overridden by subclasses."""
        return True
    
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for this tool."""
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query or input text"
                }
            },
            "required": ["query"]
        }


class SearchTool(BaseTool, ABC):
    """Base class for search tools with common search functionality."""
    
    def __init__(self, name: str, description: str, max_results_default: int = 5):
        """Initialize the search tool."""
        super().__init__(name, ToolCategory.SEARCH, description)
        self.max_results_default = max_results_default
        self._retry_count = 3
        self._retry_delay = 1.0
    
    async def _execute_internal(self, request: ToolRequest) -> Dict[str, Any]:
        """Execute search with standardized result format."""
        query = request.query
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        # Extract parameters
        max_results = request.parameters.get("max_results", self.max_results_default)
        max_results = min(max_results, 20)  # Cap at 20 results
        
        # Execute search with retry logic
        for attempt in range(self._retry_count):
            try:
                results = await self._search_internal(query, max_results, request.parameters)
                
                # Validate and format results
                formatted_results = self._format_search_results(results)
                
                return {
                    "success": True,
                    "query": query,
                    "results": formatted_results,
                    "total_found": len(formatted_results),
                    "max_results": max_results,
                    "search_metadata": {
                        "search_type": self.name,
                        "attempt": attempt + 1,
                        "timestamp": time.time()
                    }
                }
                
            except Exception as e:
                if attempt < self._retry_count - 1:
                    logger.warning("Search attempt failed, retrying", {
                        "tool_name": self.name,
                        "attempt": attempt + 1,
                        "error": str(e)
                    })
                    await self._sleep_between_retries(attempt)
                    continue
                else:
                    # Final attempt failed
                    raise
    
    @abstractmethod
    async def _search_internal(self, query: str, max_results: int, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute the actual search. Must be implemented by subclasses."""
        pass
    
    def _format_search_results(self, raw_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format search results to a standardized structure."""
        formatted_results = []
        
        for result in raw_results:
            try:
                formatted_result = self._format_single_result(result)
                if formatted_result and self._validate_result(formatted_result):
                    formatted_results.append(formatted_result)
            except Exception as e:
                logger.warning("Failed to format search result", {
                    "tool_name": self.name,
                    "error": str(e),
                    "result": str(result)[:200]
                })
                continue
        
        return formatted_results
    
    @abstractmethod
    def _format_single_result(self, raw_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format a single result to standardized structure."""
        pass
    
    def _validate_result(self, result: Dict[str, Any]) -> bool:
        """Validate that a result has required fields."""
        required_fields = ["title", "url", "snippet"]
        return all(field in result and result[field] for field in required_fields)
    
    async def _sleep_between_retries(self, attempt: int) -> None:
        """Sleep between retry attempts with exponential backoff."""
        import asyncio
        sleep_time = self._retry_delay * (2 ** attempt)
        await asyncio.sleep(sleep_time)
    
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for search tools."""
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "minimum": 1,
                    "maximum": 20,
                    "default": self.max_results_default
                },
                "language": {
                    "type": "string",
                    "description": "Language for search results",
                    "default": "en"
                },
                "region": {
                    "type": "string",
                    "description": "Region for search results",
                    "default": "us"
                }
            },
            "required": ["query"]
        }
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate search tool parameters."""
        if "max_results" in parameters:
            max_results = parameters["max_results"]
            if not isinstance(max_results, int) or max_results < 1 or max_results > 20:
                return False
        
        if "language" in parameters:
            language = parameters["language"]
            if not isinstance(language, str) or len(language) < 2:
                return False
        
        return True
    
    def _clean_query(self, query: str) -> str:
        """Clean and normalize the search query."""
        # Remove extra whitespace
        query = " ".join(query.split())
        
        # Remove special characters that might break searches
        import re
        query = re.sub(r'[^\w\s\-\+\"\']', ' ', query)
        
        # Limit query length
        if len(query) > 200:
            query = query[:200].rsplit(' ', 1)[0]
        
        return query.strip()
    
    def _extract_keywords(self, query: str, max_keywords: int = 5) -> List[str]:
        """Extract key terms from the query for fallback searches."""
        import re
        
        # Remove common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
            "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", 
            "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "what", "when", "where", "why", "how", "who", "which"
        }
        
        # Extract words
        words = re.findall(r'\b\w{3,}\b', query.lower())
        keywords = [word for word in words if word not in stop_words]
        
        # Return top keywords by length (longer words are often more specific)
        keywords.sort(key=len, reverse=True)
        return keywords[:max_keywords]