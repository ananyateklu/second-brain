from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import time
from datetime import datetime
import aiohttp
import json
import logging

logger = logging.getLogger(__name__)

class ToolExecutionError(Exception):
    """Raised when a tool execution fails"""
    pass

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        self.model_id = model_id
        self.temperature = temperature
        self.execution_history = []
        
    @abstractmethod
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute the agent's task"""
        pass
    
    async def execute_with_tools(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute with optional tool support"""
        start_time = time.time()
        
        try:
            # Process tools if provided
            if tools:
                tool_results = []
                for tool in tools:
                    try:
                        logger.info(f"Executing tool: {tool['name']}")
                        result = await self._execute_tool(tool)
                        tool_results.append({
                            "tool": tool["name"],
                            "status": "success",
                            "result": result
                        })
                        logger.info(f"Tool {tool['name']} executed successfully")
                    except Exception as e:
                        logger.error(f"Tool {tool['name']} execution failed: {str(e)}")
                        tool_results.append({
                            "tool": tool["name"],
                            "status": "error",
                            "error": str(e)
                        })
                
                # Augment prompt with tool results
                tool_context = "\nTool Results:\n" + "\n".join(
                    f"- {r['tool']}: {r.get('result', f'Error: {r.get('error', 'Unknown error')}')})"
                    for r in tool_results
                )
                augmented_prompt = f"""
                Original Query: {prompt}
                
                Available Information from Tools:
                {tool_context}
                
                Please analyze the above information and provide a comprehensive response that:
                1. Synthesizes the gathered information
                2. Highlights key findings and developments
                3. Provides specific examples and data points
                4. Draws meaningful conclusions
                """
                prompt = augmented_prompt
            
            # Execute main task
            result = await self.execute(prompt, **kwargs)
            
            # Add execution metadata
            execution_time = time.time() - start_time
            execution_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "model_id": self.model_id,
                "execution_time": execution_time,
                "tools_used": [t["name"] for t in tools] if tools else [],
                "status": "success"
            }
            self.execution_history.append(execution_record)
            
            # Add metadata to result
            if isinstance(result, dict) and "metadata" in result:
                result["metadata"].update({
                    "execution_time": execution_time,
                    "tools_used": tools if tools else []
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error in execute_with_tools: {str(e)}", exc_info=True)
            execution_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "model_id": self.model_id,
                "execution_time": time.time() - start_time,
                "tools_used": [t["name"] for t in tools] if tools else [],
                "status": "error",
                "error": str(e)
            }
            self.execution_history.append(execution_record)
            raise
    
    async def _execute_tool(self, tool: Dict[str, Any]) -> Any:
        """Execute a single tool"""
        tool_type = tool.get("type")
        if not tool_type:
            raise ToolExecutionError("Tool type not specified")
            
        try:
            if tool_type == "api_call":
                return await self._execute_api_call(tool)
            elif tool_type == "database_query":
                return await self._execute_database_query(tool)
            else:
                raise ToolExecutionError(f"Unsupported tool type: {tool_type}")
        except Exception as e:
            logger.error(f"Tool execution failed: {str(e)}", exc_info=True)
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")
    
    async def _execute_api_call(self, tool: Dict[str, Any]) -> Any:
        """Execute an API call tool"""
        tool_name = tool.get("name", "unknown")
        parameters = tool.get("parameters", {})
        
        # Configure the API endpoint based on tool name
        if tool_name == "web_search":
            try:
                from duckduckgo_search import DDGS
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 5)
                
                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(query, max_results=max_results):
                        results.append({
                            "title": r.get("title"),
                            "link": r.get("link"),
                            "snippet": r.get("body")
                        })
                return json.dumps(results)
            except Exception as e:
                logger.error(f"DuckDuckGo search failed: {str(e)}")
                raise ToolExecutionError(f"Web search failed: {str(e)}")
                        
        elif tool_name == "academic_search":
            try:
                from scholarly import scholarly
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 3)
                
                search_query = scholarly.search_pubs(query)
                results = []
                for i in range(max_results):
                    try:
                        pub = next(search_query)
                        results.append({
                            "title": pub.get("bib", {}).get("title"),
                            "authors": pub.get("bib", {}).get("author", []),
                            "year": pub.get("bib", {}).get("pub_year"),
                            "abstract": pub.get("bib", {}).get("abstract"),
                            "url": pub.get("pub_url")
                        })
                    except StopIteration:
                        break
                return json.dumps(results)
            except Exception as e:
                logger.error(f"Academic search failed: {str(e)}")
                raise ToolExecutionError(f"Academic search failed: {str(e)}")
                        
        elif tool_name == "news_search":
            try:
                from newsapi import NewsApiClient
                from app.config.settings import settings
                
                if not settings.NEWS_API_KEY:
                    raise ToolExecutionError("NewsAPI key not configured")
                
                # Initialize NewsAPI client
                newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)
                
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 3)
                
                # Get everything
                all_articles = newsapi.get_everything(
                    q=query,
                    language='en',
                    sort_by='relevancy',
                    page_size=max_results
                )
                
                return json.dumps(all_articles.get("articles", []))
            except Exception as e:
                logger.error(f"News search failed: {str(e)}")
                raise ToolExecutionError(f"News search failed: {str(e)}")
        
        else:
            raise ToolExecutionError(f"Unsupported API call tool: {tool_name}")
    
    async def _execute_database_query(self, tool: Dict[str, Any]) -> Any:
        """Execute a database query tool"""
        # Implement database query logic here
        raise NotImplementedError("Database query not implemented yet")
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the agent's response"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        # Validate metadata structure
        metadata = response.get("metadata", {})
        if not isinstance(metadata, dict):
            return False
            
        # Validate result is a non-empty string
        result = response.get("result")
        if not isinstance(result, str) or not result.strip():
            return False
            
        return True
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get the agent's execution history"""
        return self.execution_history