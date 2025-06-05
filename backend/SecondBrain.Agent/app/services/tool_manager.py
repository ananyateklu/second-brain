"""Real tool manager implementation for executing search and analysis tools."""

import asyncio
from typing import Any, Dict, List, Optional

import structlog

from app.config.settings import get_settings
from app.core.interfaces import IToolManager
from app.core.models import ToolCategory, ToolRequest, ToolResponse
from app.tools import SearchOrchestrator
from app.tools.search_tools import AcademicSearchTool, NewsSearchTool, WebSearchTool

logger = structlog.get_logger(__name__)


class ToolManager(IToolManager):
    """Real tool manager for executing search and analysis tools."""
    
    def __init__(self):
        """Initialize the tool manager."""
        self.settings = get_settings()
        
        # Initialize search tools
        self.web_search = WebSearchTool()
        self.academic_search = AcademicSearchTool(api_key=self.settings.semantic_scholar_api_key)
        self.news_search = NewsSearchTool(news_api_key=self.settings.news_api_key)
        
        # Initialize search orchestrator
        self.search_orchestrator = SearchOrchestrator(
            news_api_key=self.settings.news_api_key,
            semantic_scholar_api_key=self.settings.semantic_scholar_api_key
        )
        
        # Tool registry
        self.tools = {
            "web_search": self.web_search,
            "academic_search": self.academic_search,
            "news_search": self.news_search
        }
        
        # Tool categories mapping
        self.tool_categories = {
            "web_search": ToolCategory.SEARCH,
            "academic_search": ToolCategory.SEARCH,
            "news_search": ToolCategory.SEARCH,
            "intelligent_search": ToolCategory.SEARCH,
            "analysis": ToolCategory.ANALYSIS,
            "synthesis": ToolCategory.SYNTHESIS
        }
        
        logger.info("Tool manager initialized",
                   tools_available=list(self.tools.keys()),
                   has_news_api=bool(self.settings.news_api_key),
                   has_semantic_scholar_api=bool(self.settings.semantic_scholar_api_key))
    
    async def execute_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        """Execute a specific tool."""
        
        logger.info("Tool execution requested",
                   tool_name=tool_name,
                   query=request.query[:100] if request.query else "N/A",
                   agent_type=request.agent_type)
        
        try:
            # Handle intelligent search orchestration
            if tool_name == "intelligent_search":
                return await self._execute_intelligent_search(request)
            
            # Handle individual tools
            if tool_name in self.tools:
                tool = self.tools[tool_name]
                return await tool.execute(request)
            
            # Handle analysis and synthesis tools (placeholder for now)
            elif tool_name in ["analysis", "synthesis"]:
                return await self._execute_analysis_tool(tool_name, request)
            
            else:
                return ToolResponse.error_response(
                    error=f"Tool '{tool_name}' not found",
                    execution_time=0,
                    metadata={"available_tools": list(self.tools.keys())}
                )
                
        except Exception as e:
            logger.error("Tool execution failed",
                        tool_name=tool_name,
                        error=str(e),
                        error_type=type(e).__name__)
            
            return ToolResponse.error_response(
                error=str(e),
                execution_time=0,
                metadata={"tool_name": tool_name}
            )
    
    async def execute_tools_parallel(
        self, 
        tool_names: List[str], 
        request: ToolRequest
    ) -> List[ToolResponse]:
        """Execute multiple tools in parallel."""
        
        if not self.settings.enable_parallel_search:
            # Execute sequentially if parallel is disabled
            results = []
            for tool_name in tool_names:
                result = await self.execute_tool(tool_name, request)
                results.append(result)
            return results
        
        logger.info("Parallel tool execution requested",
                   tools=tool_names,
                   query=request.query[:100] if request.query else "N/A")
        
        # Create tasks for parallel execution
        tasks = []
        for tool_name in tool_names:
            task = self.execute_tool(tool_name, request)
            tasks.append(task)
        
        # Execute all tasks in parallel with timeout
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=self.settings.search_timeout_seconds
            )
            
            # Convert exceptions to error responses
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    error_response = ToolResponse.error_response(
                        error=str(result),
                        execution_time=0,
                        metadata={"tool_name": tool_names[i]}
                    )
                    processed_results.append(error_response)
                else:
                    processed_results.append(result)
            
            return processed_results
            
        except asyncio.TimeoutError:
            logger.warning("Parallel tool execution timed out",
                          tools=tool_names,
                          timeout=self.settings.search_timeout_seconds)
            
            # Return timeout errors for all tools
            timeout_responses = []
            for tool_name in tool_names:
                timeout_response = ToolResponse.error_response(
                    error=f"Tool execution timed out after {self.settings.search_timeout_seconds} seconds",
                    execution_time=self.settings.search_timeout_seconds,
                    metadata={"tool_name": tool_name, "error_type": "timeout"}
                )
                timeout_responses.append(timeout_response)
            
            return timeout_responses
    
    async def _execute_intelligent_search(self, request: ToolRequest) -> ToolResponse:
        """Execute intelligent search orchestration."""
        
        try:
            # Get max results from parameters
            max_results = request.parameters.get("max_results", self.settings.default_max_search_results)
            
            # Extract user preferences if provided
            user_preferences = request.parameters.get("user_preferences")
            
            # Execute orchestrated search
            result = await self.search_orchestrator.orchestrate_search(
                query=request.query,
                max_results=max_results,
                agent_type=request.agent_type,
                user_preferences=user_preferences
            )
            
            return ToolResponse.success_response(
                data=result,
                execution_time=0,  # Will be calculated by orchestrator
                metadata={
                    "tool_name": "intelligent_search",
                    "search_strategy": "orchestrated",
                    "tools_used": result.get("metadata", {}).get("tools_used", [])
                }
            )
            
        except Exception as e:
            logger.error("Intelligent search execution failed",
                        error=str(e),
                        query=request.query)
            
            return ToolResponse.error_response(
                error=str(e),
                execution_time=0,
                metadata={"tool_name": "intelligent_search"}
            )
    
    async def _execute_analysis_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        """Execute analysis and synthesis tools (placeholder implementation)."""
        
        # This is a placeholder for future analysis tools
        # For now, return a mock response indicating the tool is planned
        
        mock_result = {
            "tool": tool_name,
            "message": f"The {tool_name} tool is planned for future implementation",
            "status": "planned",
            "suggestions": [
                "Use intelligent_search for comprehensive research",
                "Use specific search tools (web_search, academic_search, news_search) for targeted results"
            ]
        }
        
        return ToolResponse.success_response(
            data=mock_result,
            execution_time=0.1,
            metadata={
                "tool_name": tool_name,
                "implementation_status": "planned"
            }
        )
    
    def list_available_tools(self, agent_type: Optional[str] = None) -> List[str]:
        """Get list of available tool names."""
        available_tools = list(self.tools.keys())
        
        # Add special tools
        available_tools.extend([
            "intelligent_search",  # Orchestrated search
            "analysis",           # Future analysis tool
            "synthesis"           # Future synthesis tool
        ])
        
        # Filter by agent type if specified
        if agent_type:
            # All current tools support all agent types
            return available_tools
        
        return available_tools
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool."""
        
        # Handle real tools
        if tool_name in self.tools:
            tool = self.tools[tool_name]
            return {
                "name": tool.name,
                "category": tool.category.value,
                "description": tool.description,
                "parameters": tool.get_schema(),
                "supported_agent_types": tool.supported_agent_types,
                "implementation_status": "active"
            }
        
        # Handle special tools
        special_tools = {
            "intelligent_search": {
                "name": "intelligent_search",
                "category": ToolCategory.SEARCH.value,
                "description": "Intelligent search orchestration that analyzes queries and coordinates multiple search tools",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query"},
                        "max_results": {"type": "integer", "description": "Maximum number of results", "default": 10},
                        "user_preferences": {"type": "object", "description": "User search preferences"}
                    },
                    "required": ["query"]
                },
                "supported_agent_types": ["research", "analysis", "all"],
                "implementation_status": "active"
            },
            "analysis": {
                "name": "analysis",
                "category": ToolCategory.ANALYSIS.value,
                "description": "Analyze data and information (planned for future implementation)",
                "parameters": {"type": "object", "properties": {"data": {"type": "object"}}},
                "supported_agent_types": ["analysis", "research", "all"],
                "implementation_status": "planned"
            },
            "synthesis": {
                "name": "synthesis",
                "category": ToolCategory.SYNTHESIS.value,
                "description": "Synthesize information from multiple sources (planned for future implementation)",
                "parameters": {"type": "object", "properties": {"sources": {"type": "array"}}},
                "supported_agent_types": ["research", "all"],
                "implementation_status": "planned"
            }
        }
        
        return special_tools.get(tool_name)
    
    def register_tool(self, tool) -> None:
        """Register a new tool."""
        if hasattr(tool, 'name'):
            self.tools[tool.name] = tool
            logger.info("Tool registered", tool_name=tool.name)
        else:
            raise ValueError("Tool must have a 'name' attribute")
    
    def get_tools_by_category(self, category: ToolCategory, agent_type: Optional[str] = None) -> List[str]:
        """Get tools by category."""
        tools_in_category = []
        
        for tool_name, tool_category in self.tool_categories.items():
            if tool_category == category:
                tools_in_category.append(tool_name)
        
        # Filter by agent type if specified
        if agent_type:
            # For now, all tools support all agent types
            return tools_in_category
        
        return tools_in_category
    
    def validate_tool_for_agent(self, tool_name: str, agent_type: str) -> bool:
        """Check if a tool can be used by a specific agent type."""
        
        # Get tool info
        tool_info = self.get_tool_info(tool_name)
        if not tool_info:
            return False
        
        # Check supported agent types
        supported_types = tool_info.get("supported_agent_types", [])
        
        # If no specific types listed or "all" is supported, allow any agent type
        if not supported_types or "all" in supported_types:
            return True
        
        # Check if agent type is specifically supported
        return agent_type in supported_types
    
    async def get_tool_health(self) -> Dict[str, Any]:
        """Get health status of all tools and external dependencies."""
        
        health_status = {
            "status": "healthy",
            "tools": {},
            "external_apis": {},
            "timestamp": asyncio.get_event_loop().time()
        }
        
        # Check individual tools
        for tool_name in self.tools:
            health_status["tools"][tool_name] = {
                "status": "active",
                "available": True
            }
        
        # Check external API availability
        external_apis = {
            "news_api": bool(self.settings.news_api_key),
            "semantic_scholar": bool(self.settings.semantic_scholar_api_key)
        }
        
        for api_name, has_key in external_apis.items():
            health_status["external_apis"][api_name] = {
                "has_api_key": has_key,
                "status": "configured" if has_key else "not_configured"
            }
        
        # Test search orchestrator
        try:
            # Quick test of orchestrator functionality
            test_analysis = self.search_orchestrator.analyze_query("test query")
            health_status["search_orchestrator"] = {
                "status": "active",
                "analysis_working": bool(test_analysis)
            }
        except Exception as e:
            health_status["search_orchestrator"] = {
                "status": "error",
                "error": str(e)
            }
            health_status["status"] = "degraded"
        
        return health_status