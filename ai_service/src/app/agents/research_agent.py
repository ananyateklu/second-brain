from typing import Dict, Any, Optional, List
from .base_agent import BaseAgent
from .agent_factory import AgentFactory
from app.config.settings import settings
import time
import logging

logger = logging.getLogger(__name__)

class ResearchAgent(BaseAgent):
    """Agent for conducting research and analysis using various AI models"""
    
    # Base research tools (always available)
    BASE_RESEARCH_TOOLS = [
        {
            "name": "web_search",
            "type": "api_call",
            "description": "Search the web for recent information and developments",
            "parameters": {
                "query": "string",
                "max_results": 5
            }
        },
        {
            "name": "academic_search",
            "type": "api_call",
            "description": "Search academic papers and research publications",
            "parameters": {
                "query": "string",
                "year_range": "string",
                "max_results": 3
            }
        }
    ]
    
    # Optional news search tool (requires API key)
    NEWS_SEARCH_TOOL = {
        "name": "news_search",
        "type": "api_call",
        "description": "Search recent news articles and press releases",
        "parameters": {
            "query": "string",
            "date_range": "string",
            "max_results": 3
        }
    }
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.agent = AgentFactory.create_agent(model_id, temperature)
        logger.info(f"Initialized ResearchAgent with model {model_id} and temperature {temperature}")
        
        # Initialize available tools
        self.available_tools = list(self.BASE_RESEARCH_TOOLS)
        if settings.NEWS_API_KEY:
            self.available_tools.append(self.NEWS_SEARCH_TOOL)
            logger.info("News search tool is available")
        else:
            logger.info("News search tool is disabled - NewsAPI key not configured")
    
    def _get_base_agent_type(self) -> str:
        """Helper method to determine the base agent type"""
        agent_type = next(
            (provider for provider, agent_class in AgentFactory._agent_registry.items() 
             if isinstance(self.agent, agent_class)),
            "unknown"
        )
        logger.debug(f"Determined base agent type: {agent_type}")
        return agent_type
    
    def _should_use_research_tools(self, prompt: str) -> bool:
        """Determine if the prompt requires research tools"""
        research_keywords = [
            "research", "latest", "recent", "developments", "advances",
            "study", "investigate", "analyze", "explore", "discover",
            "findings", "publications", "papers", "news", "current"
        ]
        prompt_lower = prompt.lower()
        return any(keyword in prompt_lower for keyword in research_keywords)
        
    def _prepare_tools_with_query(self, tools: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Prepare tools by adding the query to their parameters"""
        prepared_tools = []
        for tool in tools:
            tool_copy = tool.copy()
            if "parameters" not in tool_copy:
                tool_copy["parameters"] = {}
            tool_copy["parameters"]["query"] = query
            prepared_tools.append(tool_copy)
        return prepared_tools

    async def execute(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute research task with optional tool support"""
        start_time = time.time()
        logger.info(f"Starting research execution with prompt: {prompt[:100]}...")
        
        # Determine if we should use research tools
        should_use_tools = self._should_use_research_tools(prompt)
        
        # Combine provided tools with available research tools if needed
        if should_use_tools:
            all_tools = list(self.available_tools)
            if tools:
                all_tools.extend(tools)
            # Prepare tools with the search query
            all_tools = self._prepare_tools_with_query(all_tools, prompt)
            tools = all_tools
            logger.info(f"Using {len(tools)} tools: {[t['name'] for t in tools]}")
        elif tools:
            logger.info(f"Using {len(tools)} provided tools: {[t['name'] for t in tools]}")
        
        # Create a research-focused prompt
        research_prompt = f"""You are a research assistant with access to various tools for gathering information. Your task is to:
        1. Analyze the given topic thoroughly using available tools
        2. Provide comprehensive key insights based on gathered information
        3. Support with relevant information and examples from recent sources
        4. Draw meaningful conclusions
        
        Topic: {prompt}
        
        Please provide a well-structured, detailed response that demonstrates deep analysis and understanding."""
        
        logger.debug(f"Generated research prompt: {research_prompt[:100]}...")
        
        # Use the underlying agent to generate the response with tool support
        try:
            if tools:
                logger.info("Executing with tools...")
                result = await self.agent.execute_with_tools(research_prompt, tools, **kwargs)
            else:
                logger.info("Executing without tools...")
                result = await self.agent.execute(research_prompt, **kwargs)
            
            logger.info("Successfully generated response")
        except Exception as e:
            logger.error(f"Error during execution: {str(e)}", exc_info=True)
            raise
        
        # Add research-specific metadata
        execution_time = time.time() - start_time
        if isinstance(result, dict):
            result["metadata"] = {
                "model": self.model_id,
                "prompt": prompt,
                "temperature": self.temperature,
                "provider": self._get_base_agent_type(),
                "execution_time": execution_time,
                "agent_type": "research",
                "base_agent": self._get_base_agent_type(),
                "research_parameters": {
                    "topic": prompt,
                    "tools_used": [t["name"] for t in (tools or [])]
                },
                "tools_used": tools,
                "token_usage": result.get("metadata", {}).get("token_usage")
            }
            
            logger.info(f"Execution completed in {execution_time:.2f}s")
            if "token_usage" in result.get("metadata", {}):
                logger.info(f"Token usage: {result['metadata']['token_usage']}")
        
        return result
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the research response"""
        logger.info("Validating research response...")
        
        # First use base validation
        if not await super().validate_response(response):
            logger.warning("Base validation failed")
            return False
            
        # Additional research-specific validation
        if isinstance(response, dict):
            result = response.get("result", "")
            
            # Check for minimum content length
            word_count = len(result.split())
            logger.debug(f"Response word count: {word_count}")
            if word_count < 50:  # Minimum 50 words
                logger.warning("Response too short (< 50 words)")
                return False
                
            # Check for structured content (contains numbered points)
            has_numbered_points = any(str(i) + "." in result for i in range(1, 10))
            logger.debug(f"Has numbered points: {has_numbered_points}")
            if not has_numbered_points:
                logger.warning("Response lacks structured numbered points")
                return False
                
            # Verify metadata contains research-specific fields
            metadata = response.get("metadata", {})
            if "research_parameters" not in metadata:
                logger.warning("Missing research parameters in metadata")
                return False
            
            logger.info("Response validation successful")
        
        return True