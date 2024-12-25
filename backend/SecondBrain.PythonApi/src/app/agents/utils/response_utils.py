import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..core.agent_types import SearchResult, AgentResponse, ExecutionMetadata, Tool

def create_search_response(
    success: bool,
    results: List[Dict[str, Any]],
    query: str,
    max_results: int,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> SearchResult:
    """Create a standardized search response"""
    return {
        "success": success,
        "results": results[:max_results] if success else [],
        "total_found": len(results) if success else 0,
        "error": error,
        "metadata": {
            "query": query,
            "timestamp": datetime.utcnow().isoformat(),
            **(metadata or {})
        }
    }

def create_error_response(error_message: str) -> SearchResult:
    """Create a standardized error response"""
    return {
        "success": False,
        "results": [],
        "total_found": 0,
        "error": error_message,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat()
        }
    }

def create_agent_response(
    result: str,
    execution_time: float,
    tools_used: List[Tool],
    status: str = "success",
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> AgentResponse:
    """Create a standardized agent response"""
    return {
        "result": result,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat(),
            "execution_time": execution_time,
            **(metadata or {})
        },
        "execution_time": execution_time,
        "tools_used": tools_used,
        "status": status,
        "error": error
    }

def create_execution_metadata(
    model_id: str,
    execution_time: float,
    tools_used: List[str],
    status: str,
    error: Optional[str] = None
) -> ExecutionMetadata:
    """Create execution metadata"""
    return ExecutionMetadata(
        timestamp=datetime.utcnow(),
        model_id=model_id,
        execution_time=execution_time,
        tools_used=tools_used,
        status=status,
        error=error
    )

def format_search_results(results: List[Dict[str, Any]], format_type: str = "default") -> str:
    """Format search results for display"""
    if not results:
        return "No results found."
        
    if format_type == "markdown":
        formatted = "\n\n".join(
            f"**{r.get('title', 'Untitled')}**\n"
            f"{r.get('snippet', 'No description available')}\n"
            f"[Source]({r.get('link', '#')})"
            for r in results
        )
    else:
        formatted = json.dumps(results, indent=2)
        
    return formatted

def validate_response(response: Any) -> bool:
    """Validate the agent's response"""
    if not response or not isinstance(response, dict):
        return False
        
    required_fields = ["result", "metadata"]
    if not all(field in response for field in required_fields):
        return False
        
    metadata = response.get("metadata", {})
    if not isinstance(metadata, dict):
        return False
        
    result = response.get("result")
    if not isinstance(result, str) or not result.strip():
        return False
        
    return True 